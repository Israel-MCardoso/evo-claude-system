// T11 — Layout do painel com sidebar (desktop) e bottom nav (mobile)
// Server Component: busca nome do restaurante autenticado
// Auth guard aplicado via middleware.ts

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { PainelNav } from '@/components/admin/PainelNav'

async function getNomeRestaurante(): Promise<string> {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    redirect('/login')
  }

  const { data } = await supabase
    .from('restaurantes')
    .select('nome')
    .eq('id', restauranteId)
    .single()

  return data?.nome ?? 'Meu restaurante'
}

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nomeRestaurante = await getNomeRestaurante()

  return (
    <div className="min-h-screen bg-gray-50">
      <PainelNav nomeRestaurante={nomeRestaurante} />

      {/* Conteúdo principal */}
      {/* md: margem esquerda para a sidebar fixa (w-56 = 224px) */}
      {/* mobile: padding inferior para a bottom nav */}
      <main className="md:ml-56 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
