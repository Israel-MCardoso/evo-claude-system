import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRestaurantRole } from '@/server/auth/restaurantRole'
import { isMissingColumnError } from '@/server/admin/schemaFallback'
import type { RestaurantMemberRole } from '@/server/team/invitations'

export interface CurrentRestaurantAccess {
  user: User
  restauranteId: string
  role: RestaurantMemberRole
}

export async function getCurrentRestaurantAccess(): Promise<CurrentRestaurantAccess> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('restaurant_users')
    .select('restaurante_id, role')
    .eq('user_id', user.id)
    .single()

  if (isMissingColumnError(error, 'restaurant_users.role')) {
    const legacyResult = await admin
      .from('restaurant_users')
      .select('restaurante_id')
      .eq('user_id', user.id)
      .single()

    if (legacyResult.error || !legacyResult.data) {
      throw new Error('Restaurante não encontrado para este usuário')
    }

    return {
      user,
      restauranteId: legacyResult.data.restaurante_id,
      role: 'owner',
    }
  }

  if (error || !data) {
    throw new Error('Restaurante não encontrado para este usuário')
  }

  return {
    user,
    restauranteId: data.restaurante_id,
    role: normalizeRestaurantRole(data.role),
  }
}
