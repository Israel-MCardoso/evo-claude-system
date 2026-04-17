export interface CheckoutDeliveryState {
  loading: boolean
  deliveryFee: number | null
  distance: number | null
  estimatedDeliveryMinutes: number | null
  pricingMode: 'zone' | 'distance' | null
  zoneName: string | null
  error: string | null
  outOfRange: boolean
}

export interface DeliveryAddressFormValues {
  rua: string
  numero: string
  bairro: string
  cidade?: string
  cep?: string
}

export interface DeliveryCalculationResponse {
  success: boolean
  status: 'ok' | 'out_of_range' | 'error'
  pricing_mode: 'zone' | 'distance' | null
  zone_name?: string
  distance_km: number | null
  delivery_fee: number | null
  estimated_delivery_minutes: number | null
  message?: string
}

export const initialCheckoutDeliveryState: CheckoutDeliveryState = {
  loading: false,
  deliveryFee: null,
  distance: null,
  estimatedDeliveryMinutes: null,
  pricingMode: null,
  zoneName: null,
  error: null,
  outOfRange: false,
}

export function hasEnoughAddressData(address: DeliveryAddressFormValues): boolean {
  return Boolean(address.rua.trim() && address.numero.trim() && address.bairro.trim())
}

export async function fetchDeliveryCalculation(input: {
  restaurantId: string
  address: DeliveryAddressFormValues
  orderTotal: number
  signal?: AbortSignal
}): Promise<DeliveryCalculationResponse> {
  const params = new URLSearchParams({
    restaurant_id: input.restaurantId,
    rua: input.address.rua.trim(),
    numero: input.address.numero.trim(),
    bairro: input.address.bairro.trim(),
    cidade: input.address.cidade?.trim() ?? '',
    cep: input.address.cep?.trim() ?? '',
    order_total: String(input.orderTotal),
  })

  const response = await fetch(`/api/entrega/calcular?${params.toString()}`, {
    method: 'GET',
    signal: input.signal,
    cache: 'no-store',
  })

  const data = (await response.json()) as DeliveryCalculationResponse & {
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? 'Não foi possível calcular a entrega')
  }

  return data
}
