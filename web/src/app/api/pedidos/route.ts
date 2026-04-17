import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  getDeliveryQuote,
  toOrderDeliveryPersistence,
} from '@/server/delivery/getDeliveryQuote'

const ItemSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().positive(),
})

const PedidoSchema = z.object({
  restaurante_id: z.string().uuid(),
  modalidade: z.enum(['entrega', 'retirada']),
  cliente_nome: z.string().min(1),
  cliente_telefone: z.string().min(1),
  endereco_rua: z.string().optional(),
  endereco_numero: z.string().optional(),
  endereco_bairro: z.string().optional(),
  endereco_cidade: z.string().optional(),
  endereco_cep: z.string().optional(),
  endereco_complemento: z.string().nullable().optional(),
  itens: z.array(ItemSchema).min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parse = PedidoSchema.safeParse(body)

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parse.error.flatten() },
        { status: 400 }
      )
    }

    const dados = parse.data

    if (dados.modalidade === 'entrega') {
      if (!dados.endereco_rua || !dados.endereco_numero || !dados.endereco_bairro) {
        return NextResponse.json(
          { error: 'Endereco completo obrigatorio para modalidade entrega' },
          { status: 400 }
        )
      }
    }

    const supabase = createSupabaseAdminClient()

    const [
      { data: restaurante, error: restauranteError },
      { data: zones, error: zonesError },
    ] = await Promise.all([
      supabase
        .from('restaurantes')
        .select(
          'id, latitude, longitude, taxa_base_entrega, taxa_por_km, max_distance_km, minimum_fee, free_delivery_threshold, delivery_mode, fallback_distance_enabled, fallback_max_distance_km, ativo'
        )
        .eq('id', dados.restaurante_id)
        .eq('ativo', true)
        .single(),
      supabase
        .from('delivery_zones')
        .select(
          'id, restaurant_id, name, type, match_value, fee, estimated_delivery_minutes, active, priority'
        )
        .eq('restaurant_id', dados.restaurante_id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (restauranteError || !restaurante) {
      return NextResponse.json({ error: 'Restaurante nao encontrado' }, { status: 404 })
    }

    if (zonesError) {
      console.error('[POST /api/pedidos] erro ao buscar zonas:', zonesError)

      if (restaurante.delivery_mode !== 'distance_only') {
        return NextResponse.json(
          { error: 'Nao foi possivel validar a area de entrega no momento' },
          { status: 503 }
        )
      }
    }

    const produtoIds = dados.itens.map((item) => item.produto_id)
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome, preco, disponivel')
      .in('id', produtoIds)
      .eq('restaurante_id', dados.restaurante_id)

    if (!produtos || produtos.length !== produtoIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais produtos nao encontrados' },
        { status: 404 }
      )
    }

    const indisponivel = produtos.find((produto) => !produto.disponivel)
    if (indisponivel) {
      return NextResponse.json(
        { error: `Produto indisponivel: ${indisponivel.nome}` },
        { status: 409 }
      )
    }

    const itensCalculados = dados.itens.map((item) => {
      const produto = produtos.find((current) => current.id === item.produto_id)!
      return {
        produto_id: item.produto_id,
        nome_snapshot: produto.nome,
        preco_snapshot: Number(produto.preco),
        quantidade: item.quantidade,
        subtotal: Number(produto.preco) * item.quantidade,
      }
    })

    const subtotal = itensCalculados.reduce((acc, item) => acc + item.subtotal, 0)

    let deliveryPersistence = {
      pricing_mode: null as 'zone' | 'distance' | null,
      zone_name: null as string | null,
      distance_km: null as number | null,
      delivery_fee: 0 as number | null,
      estimated_delivery_minutes: null as number | null,
    }

    if (dados.modalidade === 'entrega') {
      const deliveryQuote = await getDeliveryQuote({
        restaurant: {
          restaurant_id: restaurante.id,
          latitude: restaurante.latitude !== null ? Number(restaurante.latitude) : null,
          longitude: restaurante.longitude !== null ? Number(restaurante.longitude) : null,
          base_fee: Number(restaurante.taxa_base_entrega),
          fee_per_km: Number(restaurante.taxa_por_km),
          max_distance_km: Number(restaurante.max_distance_km),
          minimum_fee: Number(restaurante.minimum_fee),
          free_delivery_threshold:
            restaurante.free_delivery_threshold !== null
              ? Number(restaurante.free_delivery_threshold)
              : null,
          delivery_mode: restaurante.delivery_mode,
          fallback_distance_enabled: Boolean(restaurante.fallback_distance_enabled),
          fallback_max_distance_km:
            restaurante.fallback_max_distance_km !== null
              ? Number(restaurante.fallback_max_distance_km)
              : null,
        },
        zones: (zones ?? []).map((zone) => ({
          ...zone,
          fee: Number(zone.fee),
          estimated_delivery_minutes: Number(zone.estimated_delivery_minutes),
        })),
        address: {
          rua: dados.endereco_rua!,
          numero: dados.endereco_numero!,
          bairro: dados.endereco_bairro!,
          cidade: dados.endereco_cidade,
          cep: dados.endereco_cep,
        },
        orderTotal: subtotal,
      })

      if (deliveryQuote.status !== 'ok') {
        return NextResponse.json(
          { error: deliveryQuote.message ?? 'Nao foi possivel calcular a entrega' },
          { status: 422 }
        )
      }

      deliveryPersistence = toOrderDeliveryPersistence(deliveryQuote)
    }

    const total = subtotal + (deliveryPersistence.delivery_fee ?? 0)
    const telefoneLimpo = dados.cliente_telefone.replace(/\D/g, '')

    const { data: pedido, error: errPedido } = await supabase
      .from('pedidos')
      .insert({
        restaurante_id: dados.restaurante_id,
        modalidade: dados.modalidade,
        cliente_nome: dados.cliente_nome.trim(),
        cliente_telefone: telefoneLimpo,
        endereco_rua: dados.endereco_rua?.trim() ?? null,
        endereco_numero: dados.endereco_numero?.trim() ?? null,
        endereco_bairro: dados.endereco_bairro?.trim() ?? null,
        endereco_cidade: dados.endereco_cidade?.trim() ?? null,
        endereco_cep: dados.endereco_cep?.trim() ?? null,
        endereco_complemento: dados.endereco_complemento?.trim() ?? null,
        subtotal,
        taxa_entrega: deliveryPersistence.delivery_fee ?? 0,
        pricing_mode: deliveryPersistence.pricing_mode,
        zone_name: deliveryPersistence.zone_name,
        distance_km: deliveryPersistence.distance_km,
        estimated_delivery_minutes: deliveryPersistence.estimated_delivery_minutes,
        total,
        status: 'pending',
      })
      .select('id, order_number')
      .single()

    if (errPedido || !pedido) {
      console.error('[POST /api/pedidos] erro ao criar pedido:', errPedido)
      return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
    }

    const { error: errItens } = await supabase.from('itens_pedido').insert(
      itensCalculados.map((item) => ({ ...item, pedido_id: pedido.id }))
    )

    if (errItens) {
      console.error('[POST /api/pedidos] erro ao inserir itens:', errItens)
      const { error: rollbackError } = await supabase.from('pedidos').delete().eq('id', pedido.id)
      if (rollbackError) {
        console.error('[POST /api/pedidos] erro ao desfazer pedido sem itens:', rollbackError)
      }
      return NextResponse.json({ error: 'Erro ao salvar itens do pedido' }, { status: 500 })
    }

    const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: errPag } = await supabase.from('pagamentos').insert({
      pedido_id: pedido.id,
      provider: 'mock',
      status: 'pending',
      external_id: `mock_${pedido.id}`,
      qr_code: 'MOCK_PIX_COPIA_COLA_00020126',
      qr_code_base64: '',
      expira_em: expiraEm,
    })

    if (errPag) {
      console.error('[POST /api/pedidos] erro ao criar pagamento mock:', errPag)
      const { error: rollbackError } = await supabase.from('pedidos').delete().eq('id', pedido.id)
      if (rollbackError) {
        console.error('[POST /api/pedidos] erro ao desfazer pedido sem pagamento:', rollbackError)
      }
      return NextResponse.json(
        { error: 'Pedido criado, mas falha ao gerar pagamento. Tente novamente.' },
        { status: 500 }
      )
    }

    const { error: statusError } = await supabase
      .from('pedidos')
      .update({ status: 'waiting_payment' })
      .eq('id', pedido.id)

    if (statusError) {
      console.error('[POST /api/pedidos] erro ao atualizar status do pedido:', statusError)
      return NextResponse.json(
        { error: 'Pagamento gerado, mas houve uma inconsistencia ao finalizar o pedido' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        id: pedido.id,
        order_number: pedido.order_number,
        status: 'waiting_payment',
        total,
        taxa_entrega: deliveryPersistence.delivery_fee ?? 0,
        pricing_mode: deliveryPersistence.pricing_mode,
        zone_name: deliveryPersistence.zone_name,
        distancia_km: deliveryPersistence.distance_km,
        estimated_delivery_minutes: deliveryPersistence.estimated_delivery_minutes,
        pagamento: {
          qr_code: 'MOCK_PIX_COPIA_COLA_00020126',
          qr_code_base64: '',
          expira_em: expiraEm,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/pedidos] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
