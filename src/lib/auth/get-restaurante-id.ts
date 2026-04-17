// T08 — Helper: extrai restaurante_id do usuário autenticado
// Consultando a tabela restaurant_users (sem app_metadata)
// Lança erro se não autenticado ou sem restaurante vinculado

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getRestauranteId(supabase: SupabaseClient<any, any, any>): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { data, error } = await supabase
    .from('restaurant_users')
    .select('restaurante_id')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    throw new Error('Restaurante não encontrado para este usuário')
  }

  return data.restaurante_id
}
