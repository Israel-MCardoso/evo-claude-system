// GET /api/pedidos/[id]/status?telefone=xxx
// Polling de status para o cliente (a cada 10s)
// Validação por par id + telefone normalizado — sem login
// Mesma resposta 404 para "não existe" e "telefone errado" (evita info leakage)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const telefone = searchParams.get('telefone')

  if (!telefone) {
    return NextResponse.json({ error: 'Parâmetro telefone obrigatório' }, { status: 400 })
  }

  const telefoneLimpo = telefone.replace(/\D/g, '')
  const supabase = getAdminClient()

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      order_number,
      status,
      modalidade,
      cliente_nome,
      total,
      taxa_entrega,
      pricing_mode,
      zone_name,
      distance_km,
      estimated_delivery_minutes,
      restaurantes ( nome ),
      itens_pedido ( nome_snapshot, quantidade, subtotal )
    `)
    .eq('id', params.id)
    .eq('cliente_telefone', telefoneLimpo)
    .maybeSingle()

  if (error) {
    console.error('[GET status] erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 })
  }

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  const restaurante = pedido.restaurantes as unknown as { nome: string } | null
  const itens = Array.isArray(pedido.itens_pedido)
    ? (pedido.itens_pedido as { nome_snapshot: string; quantidade: number; subtotal: number }[]).map((i) => ({
        nome: i.nome_snapshot,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
      }))
    : []

  return NextResponse.json({
    id: pedido.id,
    order_number: pedido.order_number,
    status: pedido.status,
    modalidade: pedido.modalidade,
    cliente_nome: pedido.cliente_nome,
    total: pedido.total,
    taxa_entrega: pedido.taxa_entrega,
    pricing_mode: pedido.pricing_mode,
    zone_name: pedido.zone_name,
    distance_km: pedido.distance_km,
    estimated_delivery_minutes: pedido.estimated_delivery_minutes,
    restaurante_nome: restaurante?.nome ?? '',
    itens,
  })
}
