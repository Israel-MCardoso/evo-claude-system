// Sprint 03 — PATCH /api/admin/pedidos/[id]/status
// Avança o status do pedido seguindo a sequência definida
// Valida transição, pertencimento ao restaurante e autenticação
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'

// Transições válidas — cada status mapeia para o próximo permitido
const PROXIMA_TRANSICAO: Record<string, string> = {
  paid:      'preparing',
  preparing: 'ready',
  ready:     'delivered',
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const supabase = await createSupabaseServerClient()

  // Valida autenticação e obtém restaurante_id
  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Busca o pedido garantindo pertencimento ao restaurante autenticado
  const { data: pedido, error: errBusca } = await supabase
    .from('pedidos')
    .select('id, status, restaurante_id')
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle()

  if (errBusca) {
    console.error('[PATCH status] erro ao buscar pedido:', errBusca)
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 })
  }

  // Mesma resposta para "não existe" e "não pertence" — evita info leakage
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  const statusAtual = pedido.status as string
  const proximoStatus = PROXIMA_TRANSICAO[statusAtual]

  if (!proximoStatus) {
    return NextResponse.json(
      { error: `Status '${statusAtual}' não permite avanço` },
      { status: 409 }
    )
  }

  const { error: errUpdate } = await supabase
    .from('pedidos')
    .update({ status: proximoStatus })
    .eq('id', id)

  if (errUpdate) {
    console.error('[PATCH status] erro ao atualizar:', errUpdate)
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
  }

  return NextResponse.json({ id, status: proximoStatus })
}
