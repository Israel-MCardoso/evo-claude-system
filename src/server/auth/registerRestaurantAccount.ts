import { createClient, type Session } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/server/audit/auditLog'
import { isMissingColumnError } from '@/server/admin/schemaFallback'
import { logError, logInfo } from '@/server/observability/logger'
import type { TipoRestaurante } from '@/types/database'

interface RegisterRestaurantAccountInput {
  nome: string
  email: string
  senha: string
  restaurante_nome: string
  tipo: TipoRestaurante
  aceita_entrega: boolean
  aceita_retirada: boolean
}

interface RegisterRestaurantAccountSuccess {
  success: true
  session: Session
  user: {
    id: string
    email: string | null
    nome: string
  }
  restaurante: {
    id: string
    slug: string
    nome: string
    tipo: TipoRestaurante | null
    aceita_entrega: boolean
    aceita_retirada: boolean
  }
}

interface RegisterRestaurantAccountFailure {
  success: false
  status: number
  error: string
  code: 'EMAIL_IN_USE' | 'INVALID_SIGNUP' | 'REGISTER_FAILED'
}

export type RegisterRestaurantAccountResult =
  | RegisterRestaurantAccountSuccess
  | RegisterRestaurantAccountFailure

const RESTAURANTE_INSERT_FALLBACK_COLUMNS = [
  'restaurantes.taxa_base_entrega',
  'restaurantes.taxa_por_km',
  'restaurantes.max_distance_km',
  'restaurantes.minimum_fee',
  'restaurantes.free_delivery_threshold',
  'restaurantes.delivery_mode',
  'restaurantes.fallback_distance_enabled',
  'restaurantes.fallback_max_distance_km',
  'restaurantes.onboarding_completed',
] as const

const RESTAURANTE_SELECT_MODERN =
  'id, slug, nome, tipo, aceita_entrega, aceita_retirada, onboarding_completed'
const RESTAURANTE_SELECT_LEGACY = 'id, slug, nome, tipo, aceita_entrega, aceita_retirada'

function slugifyRestaurantName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50)
}

function isEmailAlreadyInUse(error: { message?: string } | null | undefined) {
  const text = error?.message?.toLowerCase() ?? ''
  return text.includes('already been registered') || text.includes('already registered')
}

function shouldUseLegacyRestaurantInsert(error: { message?: string; details?: string } | null) {
  return RESTAURANTE_INSERT_FALLBACK_COLUMNS.some((column) => isMissingColumnError(error, column))
}

async function generateUniqueRestaurantSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  restaurantName: string
) {
  const base = slugifyRestaurantName(restaurantName) || 'restaurante'

  const { data, error } = await supabase
    .from('restaurantes')
    .select('slug')
    .like('slug', `${base}%`)

  if (error) {
    throw new Error('Nao foi possivel validar o slug do restaurante')
  }

  const existing = new Set((data ?? []).map((item) => item.slug))
  if (!existing.has(base)) return base

  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

async function cleanupRestaurant(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  restauranteId: string | null
) {
  if (!restauranteId) return

  const { error } = await supabase.from('restaurantes').delete().eq('id', restauranteId)
  if (error) {
    logError('auth.register.rollback_restaurant_failed', {
      restaurant_id: restauranteId,
      error,
    })
  }
}

async function cleanupUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string | null
) {
  if (!userId) return

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    logError('auth.register.rollback_user_failed', {
      actor_user_id: userId,
      error,
    })
  }
}

async function createAuthenticatedSession(email: string, senha: string) {
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error || !data.session) {
    throw new Error('Nao foi possivel autenticar a conta recem-criada')
  }

  return data.session
}

export async function registerRestaurantAccount(
  input: RegisterRestaurantAccountInput
): Promise<RegisterRestaurantAccountResult> {
  const supabase = createSupabaseAdminClient()

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
    user_metadata: {
      nome: input.nome,
    },
  })

  if (userError) {
    if (isEmailAlreadyInUse(userError)) {
      return {
        success: false,
        status: 409,
        error: 'Email ja esta em uso',
        code: 'EMAIL_IN_USE',
      }
    }

    logError('auth.register.user_create_failed', {
      email: input.email,
      error: userError,
    })
    return {
      success: false,
      status: 400,
      error: 'Erro ao criar conta',
      code: 'INVALID_SIGNUP',
    }
  }

  const user = userData.user
  if (!user) {
    return {
      success: false,
      status: 500,
      error: 'Erro ao criar conta',
      code: 'REGISTER_FAILED',
    }
  }

  let restauranteId: string | null = null

  try {
    const slug = await generateUniqueRestaurantSlug(supabase, input.restaurante_nome)
    const restaurantInsertModern = {
      slug,
      nome: input.restaurante_nome,
      tipo: input.tipo,
      aceita_entrega: input.aceita_entrega,
      aceita_retirada: input.aceita_retirada,
      taxa_entrega: 0,
      taxa_base_entrega: 0,
      taxa_por_km: 0,
      max_distance_km: 8,
      minimum_fee: 0,
      free_delivery_threshold: null,
      delivery_mode: 'distance_only' as const,
      fallback_distance_enabled: true,
      fallback_max_distance_km: null,
      onboarding_completed: false,
      ativo: true,
    }

    let { data: restaurante, error: restauranteError } = await supabase
      .from('restaurantes')
      .insert(restaurantInsertModern)
      .select(RESTAURANTE_SELECT_MODERN)
      .single()

    if (shouldUseLegacyRestaurantInsert(restauranteError)) {
      const restaurantInsertLegacy = {
        slug,
        nome: input.restaurante_nome,
        tipo: input.tipo,
        aceita_entrega: input.aceita_entrega,
        aceita_retirada: input.aceita_retirada,
        taxa_entrega: 0,
        ativo: true,
      }

      const legacyResult = await supabase
        .from('restaurantes')
        .insert(restaurantInsertLegacy)
        .select(RESTAURANTE_SELECT_LEGACY)
        .single()

      restaurante = legacyResult.data
        ? {
            ...legacyResult.data,
            onboarding_completed: false,
          }
        : null
      restauranteError = legacyResult.error
    }

    if (restauranteError || !restaurante) {
      logError('auth.register.restaurant_create_failed', {
        actor_user_id: user.id,
        email: input.email,
        error: restauranteError,
      })
      await cleanupUser(supabase, user.id)

      return {
        success: false,
        status: 500,
        error: 'Erro ao criar conta',
        code: 'REGISTER_FAILED',
      }
    }

    restauranteId = restaurante.id

    const { error: restaurantUserError } = await supabase.from('restaurant_users').insert({
      user_id: user.id,
      restaurante_id: restaurante.id,
    })

    if (restaurantUserError) {
      logError('auth.register.membership_create_failed', {
        actor_user_id: user.id,
        restaurant_id: restaurante.id,
        error: restaurantUserError,
      })

      await cleanupRestaurant(supabase, restaurante.id)
      await cleanupUser(supabase, user.id)

      return {
        success: false,
        status: 500,
        error: 'Erro ao criar conta',
        code: 'REGISTER_FAILED',
      }
    }

    const session = await createAuthenticatedSession(input.email, input.senha)

    await Promise.all([
      writeAuditLog({
        action: 'auth.account_created',
        actor: {
          userId: user.id,
          email: user.email ?? input.email,
          role: 'owner',
        },
        restaurantId: restaurante.id,
        target: {
          type: 'user',
          id: user.id,
        },
        metadata: {
          signup_email: input.email,
        },
      }),
      writeAuditLog({
        action: 'restaurant.created',
        actor: {
          userId: user.id,
          email: user.email ?? input.email,
          role: 'owner',
        },
        restaurantId: restaurante.id,
        target: {
          type: 'restaurant',
          id: restaurante.id,
        },
        metadata: {
          slug: restaurante.slug,
          tipo: restaurante.tipo,
          aceita_entrega: restaurante.aceita_entrega,
          aceita_retirada: restaurante.aceita_retirada,
        },
      }),
    ])

    logInfo('auth.register.succeeded', {
      actor_user_id: user.id,
      restaurant_id: restaurante.id,
    })

    return {
      success: true,
      session,
      user: {
        id: user.id,
        email: user.email ?? input.email,
        nome: input.nome,
      },
      restaurante: {
        id: restaurante.id,
        slug: restaurante.slug,
        nome: restaurante.nome,
        tipo: restaurante.tipo,
        aceita_entrega: restaurante.aceita_entrega,
        aceita_retirada: restaurante.aceita_retirada,
      },
    }
  } catch (error) {
    logError('auth.register.unexpected_error', {
      actor_user_id: user.id,
      restaurant_id: restauranteId,
      error,
    })
    await cleanupRestaurant(supabase, restauranteId)
    await cleanupUser(supabase, user.id)

    return {
      success: false,
      status: 500,
      error: 'Erro ao criar conta',
      code: 'REGISTER_FAILED',
    }
  }
}
