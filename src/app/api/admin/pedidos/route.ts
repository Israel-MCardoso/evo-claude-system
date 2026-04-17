// Sprint 03 — GET /api/admin/pedidos
// Lista pedidos ativos (paid, preparing, ready) do restaurante autenticado
// Usado pelo polling do painel (a cada 5s)
// Isolamento multi-tenant via RLS + getRestauranteId()

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { isMissingColumnError } from '@/server/admin/schemaFallback'

const STATUS_ATIVOS = ['paid', 'preparing', 'ready'] as const

const SELECT_PEDIDOS_COMPLETO = `
      id,
      order_number,
      status,
      modalidade,
      cliente_nome,
      cliente_telefone,
      endereco_rua,
      endereco_numero,
      endereco_bairro,
      endereco_cidade,
      endereco_cep,
      endereco_complemento,
      subtotal,
      taxa_entrega,
      pricing_mode,
      zone_name,
      distance_km,
      estimated_delivery_minutes,
      total,
      criado_em,
      atualizado_em,
      itens_pedido (
        id,
        nome_snapshot,
        quantidade,
        subtotal
      )
    `

const SELECT_PEDIDOS_LEGACY = `
      id,
      order_number,
      status,
      modalidade,
      cliente_nome,
      cliente_telefone,
      endereco_rua,
      endereco_numero,
      endereco_bairro,
      endereco_complemento,
      subtotal,
      taxa_entrega,
      total,
      criado_em,
      atualizado_em,
      itens_pedido (
        id,
        nome_snapshot,
        quantidade,
        subtotal
      )
    `

export async function GET() {
  const supabase = await createSupabaseServerClient()

  // Valida autenticação e obtém restaurante_id
  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDOS_COMPLETO)
    .eq('restaurante_id', restauranteId)
    .in('status', STATUS_ATIVOS)
    .order('criado_em', { ascending: false })

  if (
    isMissingColumnError(error, 'pedidos.pricing_mode') ||
    isMissingColumnError(error, 'pedidos.endereco_cidade')
  ) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('pedidos')
      .select(SELECT_PEDIDOS_LEGACY)
      .eq('restaurante_id', restauranteId)
      .in('status', STATUS_ATIVOS)
      .order('criado_em', { ascending: false })

    if (legacyError) {
      console.error('[GET /api/admin/pedidos] erro legacy:', legacyError)
      return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
    }

    return NextResponse.json({
      pedidos: (legacyData ?? []).map((pedido) => ({
        ...pedido,
        endereco_cidade: null,
        endereco_cep: null,
        pricing_mode: null,
        zone_name: null,
        distance_km: null,
        estimated_delivery_minutes: null,
      })),
    })
  }

  if (error) {
    console.error('[GET /api/admin/pedidos] erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
  }

  return NextResponse.json({ pedidos: data ?? [] })
}
