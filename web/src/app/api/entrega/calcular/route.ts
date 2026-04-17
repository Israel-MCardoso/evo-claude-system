import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getDeliveryQuote } from '@/server/delivery/getDeliveryQuote'

export async function GET(request: Request) {
  const startedAt = Date.now()
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const rua = searchParams.get('rua')
  const numero = searchParams.get('numero')
  const bairro = searchParams.get('bairro')
  const cidade = searchParams.get('cidade')
  const cep = searchParams.get('cep')
  const orderTotal = Number(searchParams.get('order_total') ?? '0')

  if (!restaurantId || !rua || !numero || !bairro) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: restaurant_id, rua, numero, bairro' },
      { status: 400 }
    )
  }

  try {
    const supabase = createSupabaseAdminClient()
    const [{ data: restaurante, error }, { data: zones, error: zonesError }] = await Promise.all([
      supabase
        .from('restaurantes')
        .select(
          'id, latitude, longitude, taxa_base_entrega, taxa_por_km, max_distance_km, minimum_fee, free_delivery_threshold, delivery_mode, fallback_distance_enabled, fallback_max_distance_km'
        )
        .eq('id', restaurantId)
        .eq('ativo', true)
        .single(),
      supabase
        .from('delivery_zones')
        .select(
          'id, restaurant_id, name, type, match_value, fee, estimated_delivery_minutes, active, priority'
        )
        .eq('restaurant_id', restaurantId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (error || !restaurante) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    if (zonesError) {
      console.error('[delivery][api] zones_fetch_failed', {
        restaurant_id: restaurantId,
        delivery_mode: restaurante.delivery_mode,
        error: zonesError,
      })

      if (restaurante.delivery_mode !== 'distance_only') {
        return NextResponse.json(
          {
            success: false,
            status: 'error',
            pricing_mode: null,
            distance_km: null,
            delivery_fee: null,
            estimated_delivery_minutes: null,
            message: 'Não foi possível calcular a entrega',
          },
          { status: 503 }
        )
      }
    }

    const result = await getDeliveryQuote({
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
        rua,
        numero,
        bairro,
        cidade,
        cep,
      },
      orderTotal: Number.isFinite(orderTotal) ? orderTotal : 0,
    })

    console.info('[delivery][api] quote_completed', {
      restaurant_id: restaurantId,
      status: result.status,
      pricing_mode: result.pricing_mode,
      reason: result.reason,
      duration_ms: Date.now() - startedAt,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[delivery][api] calculate_failed', {
      restaurant_id: restaurantId,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        pricing_mode: null,
        distance_km: null,
        delivery_fee: null,
        estimated_delivery_minutes: null,
        message: 'Não foi possível calcular a entrega',
      },
      { status: 500 }
    )
  }
}
