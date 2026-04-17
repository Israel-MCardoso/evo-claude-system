import type { GeocodeAddressInput } from '@/server/geolocation/geocodeAddress'
import { calculateDeliveryQuote, type RestaurantDeliveryContext } from './calculateDeliveryFee'
import {
  resolveDeliveryZone,
  type DeliveryZoneRecord,
  type ResolvedDeliveryZone,
} from './resolveDeliveryZone'

export type RestaurantDeliveryMode = 'distance_only' | 'zone_only' | 'hybrid'
export type DeliveryPricingMode = 'zone' | 'distance'
export type DeliveryQuoteStatus = 'ok' | 'out_of_range' | 'error'

export interface RestaurantDeliverySettings extends RestaurantDeliveryContext {
  restaurant_id: string
  delivery_mode: RestaurantDeliveryMode
  fallback_distance_enabled: boolean
  fallback_max_distance_km: number | null
}

export interface DeliveryQuote {
  success: boolean
  status: DeliveryQuoteStatus
  pricing_mode: DeliveryPricingMode | null
  zone_name?: string
  distance_km: number | null
  delivery_fee: number | null
  estimated_delivery_minutes: number | null
  message?: string
  reason:
    | 'zone_matched'
    | 'zone_not_found'
    | 'distance_calculated'
    | 'distance_out_of_range'
    | 'distance_error'
    | 'zone_only_without_match'
}

function buildZoneQuote(zone: ResolvedDeliveryZone): DeliveryQuote {
  return {
    success: true,
    status: 'ok',
    pricing_mode: 'zone',
    zone_name: zone.zone_name,
    distance_km: null,
    delivery_fee: zone.delivery_fee,
    estimated_delivery_minutes: zone.estimated_delivery_minutes,
    message: `Entrega: R$ ${zone.delivery_fee.toFixed(2).replace('.', ',')} (Zona ${zone.zone_name})`,
    reason: 'zone_matched',
  }
}

function buildOutOfRangeQuote(message = 'Endereço fora da área de entrega'): DeliveryQuote {
  return {
    success: true,
    status: 'out_of_range',
    pricing_mode: null,
    distance_km: null,
    delivery_fee: null,
    estimated_delivery_minutes: null,
    message,
    reason: 'distance_out_of_range',
  }
}

export function toOrderDeliveryPersistence(quote: DeliveryQuote) {
  return {
    pricing_mode: quote.pricing_mode,
    zone_name: quote.zone_name ?? null,
    distance_km: quote.distance_km,
    delivery_fee: quote.delivery_fee,
    estimated_delivery_minutes: quote.estimated_delivery_minutes,
  }
}

export async function getDeliveryQuote(input: {
  restaurant: RestaurantDeliverySettings
  zones: DeliveryZoneRecord[]
  address: GeocodeAddressInput
  orderTotal?: number
  geocodeFn?: Parameters<typeof calculateDeliveryQuote>[0]['geocodeFn']
}): Promise<DeliveryQuote> {
  const startedAt = Date.now()
  const { restaurant, zones, address, orderTotal = 0, geocodeFn } = input

  const zoneResult = resolveDeliveryZone({ zones, address })

  if (zoneResult) {
    console.info('[delivery][quote] zone_matched', {
      restaurant_id: input.restaurant.restaurant_id,
      zone_name: zoneResult.zone_name,
      matched_by: zoneResult.matched_by,
      duration_ms: Date.now() - startedAt,
    })
    return buildZoneQuote(zoneResult)
  }

  if (restaurant.delivery_mode === 'zone_only') {
    console.info('[delivery][quote] zone_only_without_match', {
      restaurant_id: input.restaurant.restaurant_id,
      duration_ms: Date.now() - startedAt,
    })
    return {
      ...buildOutOfRangeQuote(),
      reason: 'zone_only_without_match',
    }
  }

  const distanceAllowed =
    restaurant.delivery_mode === 'distance_only' || restaurant.fallback_distance_enabled

  if (!distanceAllowed) {
    console.info('[delivery][quote] fallback_disabled', {
      restaurant_id: input.restaurant.restaurant_id,
      duration_ms: Date.now() - startedAt,
    })
    return {
      ...buildOutOfRangeQuote(),
      reason: 'zone_not_found',
    }
  }

  const distanceConfig: RestaurantDeliveryContext = {
    ...restaurant,
    max_distance_km:
      restaurant.delivery_mode === 'hybrid' && restaurant.fallback_max_distance_km !== null
        ? restaurant.fallback_max_distance_km
        : restaurant.max_distance_km,
  }

  const distanceQuote = await calculateDeliveryQuote({
    restaurant: distanceConfig,
    address,
    orderTotal,
    geocodeFn,
  })

  if (distanceQuote.status === 'ok') {
    console.info('[delivery][quote] distance_calculated', {
      restaurant_id: input.restaurant.restaurant_id,
      fallback_used: restaurant.delivery_mode === 'hybrid',
      distance_km: distanceQuote.distance_km,
      duration_ms: Date.now() - startedAt,
    })

    return {
      success: true,
      status: 'ok',
      pricing_mode: 'distance',
      distance_km: distanceQuote.distance_km,
      delivery_fee: distanceQuote.delivery_fee,
      estimated_delivery_minutes: distanceQuote.estimated_delivery_minutes,
      message: `Entrega: R$ ${distanceQuote.delivery_fee!.toFixed(2).replace('.', ',')} (${distanceQuote.distance_km!.toFixed(1).replace('.', ',')} km)`,
      reason: 'distance_calculated',
    }
  }

  if (distanceQuote.status === 'out_of_range') {
    console.info('[delivery][quote] out_of_range', {
      restaurant_id: input.restaurant.restaurant_id,
      fallback_used: restaurant.delivery_mode === 'hybrid',
      duration_ms: Date.now() - startedAt,
    })
    return {
      ...buildOutOfRangeQuote(distanceQuote.message),
      reason: 'distance_out_of_range',
    }
  }

  console.error('[delivery][quote] distance_error', {
    restaurant_id: input.restaurant.restaurant_id,
    fallback_used: restaurant.delivery_mode === 'hybrid',
    duration_ms: Date.now() - startedAt,
  })

  return {
    success: false,
    status: 'error',
    pricing_mode: null,
    distance_km: null,
    delivery_fee: null,
    estimated_delivery_minutes: null,
    message: 'Não foi possível calcular a entrega',
    reason: 'distance_error',
  }
}
