import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerRestaurantAccount } from '@/server/auth/registerRestaurantAccount'
import { errorResponse, getRequestContext } from '@/server/observability/http'
import { logInfo, logWarn } from '@/server/observability/logger'

const RegisterSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().email('Informe um email valido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  restaurante_nome: z.string().trim().min(2, 'Informe o nome do restaurante'),
  tipo: z.enum(['delivery', 'dark_kitchen', 'lanchonete']),
  aceita_entrega: z.boolean(),
  aceita_retirada: z.boolean(),
})

export async function POST(request: Request) {
  const requestContext = getRequestContext(request)
  const body = await request.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(request, {
      status: 400,
      message: parsed.error.errors[0]?.message ?? 'Dados invalidos',
      code: 'INVALID_PAYLOAD',
      event: 'api.auth.register.invalid_payload',
    })
  }

  if (!parsed.data.aceita_entrega && !parsed.data.aceita_retirada) {
    return errorResponse(request, {
      status: 400,
      message: 'Selecione ao menos uma modalidade de atendimento',
      code: 'INVALID_OPERATION_MODE',
      event: 'api.auth.register.invalid_operation_mode',
    })
  }

  const result = await registerRestaurantAccount(parsed.data)

  if (!result.success) {
    logWarn('api.auth.register.failed', {
      request_id: requestContext.requestId,
      code: result.code,
      status: result.status,
      email: parsed.data.email,
    })

    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        request_id: requestContext.requestId,
      },
      { status: result.status }
    )
  }

  logInfo('api.auth.register.succeeded', {
    request_id: requestContext.requestId,
    actor_user_id: result.user.id,
    restaurant_id: result.restaurante.id,
  })

  return NextResponse.json({
    success: true,
    session: {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      expires_at: result.session.expires_at,
      expires_in: result.session.expires_in,
      token_type: result.session.token_type,
      user: result.session.user,
    },
    user: result.user,
    restaurante: result.restaurante,
  })
}
