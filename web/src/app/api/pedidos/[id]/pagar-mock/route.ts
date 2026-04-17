// POST /api/pedidos/[id]/pagar-mock
// Simula pagamento aprovado — SOMENTE para desenvolvimento/testes

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas')
  }

  return createClient(url, key)
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  let supabase
  try {
    supabase = getAdminClient()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro de configuração'
    console.error('[pagar-mock] admin client error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 1. Busca o pedido
  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (errPedido) {
    console.error('[pagar-mock] erro ao buscar pedido:', errPedido)
    return NextResponse.json({ error: 'Erro ao buscar pedido', detalhe: errPedido.message }, { status: 500 })
  }

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  const statusAtual = pedido.status as string
  if (statusAtual !== 'waiting_payment') {
    return NextResponse.json(
      { error: `Status '${statusAtual}' não permite simular pagamento` },
      { status: 409 }
    )
  }

  // 2. Atualiza pagamento → approved
  const { error: errPag } = await supabase
    .from('pagamentos')
    .update({ status: 'approved' })
    .eq('pedido_id', id)

  if (errPag) {
    console.error('[pagar-mock] erro ao atualizar pagamento:', errPag)
    return NextResponse.json({ error: 'Erro ao atualizar pagamento', detalhe: errPag.message }, { status: 500 })
  }

  // 3. Atualiza pedido → paid
  const { error: errStatus } = await supabase
    .from('pedidos')
    .update({ status: 'paid' })
    .eq('id', id)

  if (errStatus) {
    console.error('[pagar-mock] erro ao atualizar pedido:', errStatus)
    return NextResponse.json({ error: 'Erro ao atualizar status do pedido', detalhe: errStatus.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'paid' })
}
