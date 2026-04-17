// T03 — Cliente Supabase com service role (bypassa RLS)
// USO RESTRITO: apenas webhook do Mercado Pago e operações de seed
// NUNCA importar em componentes React ou rotas com usuário autenticado
// NUNCA usar NEXT_PUBLIC_ — chave nunca exposta ao cliente

import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
