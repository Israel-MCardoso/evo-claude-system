import { calculateAdjustedDistanceKm } from '../geolocation/calculateDistance'
import { type GeocodeAddressInput, geocodeAddress } from '../geolocation/geocodeAddress'

export type DeliveryCalculationStatus = 'ok' | 'out_of_range' | 'error'

export interface RestaurantDeliveryConfig {
  base_fee: number
  fee_per_km: number
  max_distance_km: number
  minimum_fee: number
  free_delivery_threshold: number | null
}

export interface RestaurantDeliveryContext extends RestaurantDeliveryConfig {
  latitude: number | null
  longitude: number | null
}

export interface DistanceDeliveryQuote {
  success: boolean
  distance_km: number | null
  delivery_fee: number | null
  estimated_delivery_minutes: number | null
  status: DeliveryCalculationStatus
  message?: string
}

export interface DeliveryQuoteInput {
  restaurant: RestaurantDeliveryContext
  address: GeocodeAddressInput
  orderTotal?: number
  geocodeFn?: typeof geocodeAddress
}

function roundMoneyUp(value: number): number {
  if (value <= 0) {
    return 0
  }

  return Math.ceil(value)
}

export function calculateEstimatedDeliveryMinutes(distanceKm: number): number {
  return Math.ceil(20 + distanceKm * 5)
}

export function calculateDeliveryFee(
  distanceKm: number,
  config: RestaurantDeliveryConfig,
  orderTotal = 0
): Pick<DistanceDeliveryQuote, 'delivery_fee' | 'status' | 'message'> {
  if (distanceKm > config.max_distance_km) {
    return {
      delivery_fee: null,
      status: 'out_of_range',
      message: 'Endereço fora da área de entrega',
    }
  }

  let fee = config.base_fee + distanceKm * config.fee_per_km
  fee = Math.max(fee, config.minimum_fee)

  if (
    config.free_delivery_threshold !== null &&
    orderTotal >= config.free_delivery_threshold
  ) {
    fee = 0
  }

  return {
    delivery_fee: roundMoneyUp(fee),
    status: 'ok',
  }
}

export async function calculateDeliveryQuote(
  input: DeliveryQuoteInput
): Promise<DistanceDeliveryQuote> {
  const { restaurant, address, orderTotal = 0, geocodeFn = geocodeAddress } = input

  if (
    restaurant.latitude === null ||
    restaurant.longitude === null ||
    !Number.isFinite(restaurant.latitude) ||
    !Number.isFinite(restaurant.longitude)
  ) {
    return {
      success: false,
      distance_km: null,
      delivery_fee: null,
      estimated_delivery_minutes: null,
      status: 'error',
      message: 'Não foi possível calcular a entrega',
    }
  }

  try {
    const destinationCoordinates = await geocodeFn(address)

    if (!destinationCoordinates) {
      return {
        success: false,
        distance_km: null,
        delivery_fee: null,
        estimated_delivery_minutes: null,
        status: 'error',
        message: 'Não foi possível calcular a entrega',
      }
    }

    const distanceKm = calculateAdjustedDistanceKm(
      restaurant.latitude,
      restaurant.longitude,
      destinationCoordinates.lat,
      destinationCoordinates.lng
    )
    const estimatedDeliveryMinutes = calculateEstimatedDeliveryMinutes(distanceKm)
    const feeResult = calculateDeliveryFee(distanceKm, restaurant, orderTotal)

    return {
      success: feeResult.status === 'ok',
      distance_km: feeResult.status === 'ok' ? distanceKm : null,
      delivery_fee: feeResult.delivery_fee,
      estimated_delivery_minutes:
        feeResult.status === 'ok' ? estimatedDeliveryMinutes : null,
      status: feeResult.status,
      message: feeResult.message,
    }
  } catch (error) {
    console.error('[delivery][distance] unexpected_error', {
      error: error instanceof Error ? error.message : 'unknown_error',
    })

    return {
      success: false,
      distance_km: null,
      delivery_fee: null,
      estimated_delivery_minutes: null,
      status: 'error',
      message: 'Não foi possível calcular a entrega',
    }
  }
}
