import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/server/audit/auditLog'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hashInvitationToken } from '@/server/team/invitations'
import { isMissingColumnError, isMissingTableError } from '@/server/admin/schemaFallback'
import { getRequestContext } from '@/server/observability/http'
import { logInfo } from '@/server/observability/logger'

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Convite inválido' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const hashedToken = hashInvitationToken(token)
  const inviteResult = await admin
    .from('team_invitations')
    .select(
      'id, restaurante_id, email, role, status, invited_by_user_id, expires_at, accepted_at, created_at, updated_at'
    )
    .eq('token_hash', hashedToken)
    .maybeSingle()

  if (inviteResult.error) {
    if (isMissingTableError(inviteResult.error, 'team_invitations')) {
      return NextResponse.json({ error: 'Convites ainda não estão disponíveis' }, { status: 409 })
    }
    console.error('[GET /api/auth/invitations] erro:', inviteResult.error)
    return NextResponse.json({ error: 'Erro ao validar convite' }, { status: 500 })
  }

  if (!inviteResult.data) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  }

  const restaurantResult = await admin
    .from('restaurantes')
    .select('id, nome, slug')
    .eq('id', inviteResult.data.restaurante_id)
    .maybeSingle()

  const user = await getCurrentUser()
  const isExpired = new Date(inviteResult.data.expires_at) < new Date()

  return NextResponse.json({
    invitation: {
      id: inviteResult.data.id,
      email: inviteResult.data.email,
      role: inviteResult.data.role,
      status: isExpired && inviteResult.data.status === 'pending' ? 'expired' : inviteResult.data.status,
      expires_at: inviteResult.data.expires_at,
      restaurante: restaurantResult.data,
    },
    viewer: user
      ? {
          id: user.id,
          email: user.email ?? null,
        }
      : null,
  })
}

export async function POST(request: Request) {
  const requestContext = getRequestContext(request)
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!token) {
    return NextResponse.json({ error: 'Convite inválido' }, { status: 400 })
  }

  const user = await getCurrentUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Faça login para aceitar o convite' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const hashedToken = hashInvitationToken(token)
  const inviteResult = await admin
    .from('team_invitations')
    .select(
      'id, restaurante_id, email, role, status, invited_by_user_id, expires_at, accepted_at, created_at, updated_at'
    )
    .eq('token_hash', hashedToken)
    .maybeSingle()

  if (inviteResult.error) {
    if (isMissingTableError(inviteResult.error, 'team_invitations')) {
      return NextResponse.json({ error: 'Convites ainda não estão disponíveis' }, { status: 409 })
    }
    console.error('[POST /api/auth/invitations] erro convite:', inviteResult.error)
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
  }

  const invitation = inviteResult.data
  if (!invitation) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Este convite não está mais disponível' }, { status: 409 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await admin
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
    return NextResponse.json({ error: 'Este convite expirou' }, { status: 410 })
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Este convite foi enviado para outro e-mail' },
      { status: 403 }
    )
  }

  const membershipCheck = await admin
    .from('restaurant_users')
    .select('user_id')
    .eq('restaurante_id', invitation.restaurante_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipCheck.error && !isMissingColumnError(membershipCheck.error, 'restaurant_users.role')) {
    console.error('[POST /api/auth/invitations] erro membership:', membershipCheck.error)
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
  }

  if (!membershipCheck.data) {
    const insertResult = await admin.from('restaurant_users').insert({
      user_id: user.id,
      restaurante_id: invitation.restaurante_id,
      role: invitation.role,
    })

    if (insertResult.error && !isMissingColumnError(insertResult.error, 'restaurant_users.role')) {
      console.error('[POST /api/auth/invitations] erro insert membership:', insertResult.error)
      return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
    }

    if (insertResult.error && isMissingColumnError(insertResult.error, 'restaurant_users.role')) {
      const legacyInsert = await admin.from('restaurant_users').insert({
        user_id: user.id,
        restaurante_id: invitation.restaurante_id,
      })

      if (legacyInsert.error) {
        console.error('[POST /api/auth/invitations] erro legacy insert membership:', legacyInsert.error)
        return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
      }
    }
  }

  const updateResult = await admin
    .from('team_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  if (updateResult.error) {
    console.error('[POST /api/auth/invitations] erro update invitation:', updateResult.error)
    return NextResponse.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
  }

  await writeAuditLog({
    action: 'team.invitation_accepted',
    restaurantId: invitation.restaurante_id,
    actor: {
      userId: user.id,
      email: user.email,
      role: invitation.role,
    },
    request: requestContext,
    target: {
      type: 'team_invitation',
      id: invitation.id,
    },
    metadata: {
      invited_role: invitation.role,
      invited_by_user_id: invitation.invited_by_user_id,
    },
  })

  logInfo('api.auth.invitations.accepted', {
    request_id: requestContext.requestId,
    restaurant_id: invitation.restaurante_id,
    actor_user_id: user.id,
    invitation_id: invitation.id,
  })

  return NextResponse.json({
    success: true,
    restaurante_id: invitation.restaurante_id,
  })
}
