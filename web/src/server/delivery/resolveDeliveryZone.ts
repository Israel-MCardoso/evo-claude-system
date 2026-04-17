import type { GeocodeAddressInput } from '@/server/geolocation/geocodeAddress'

export type DeliveryZoneType = 'bairro' | 'cep_prefixo' | 'faixa_manual'

export interface DeliveryZoneRecord {
  id: string
  restaurant_id: string
  name: string
  type: DeliveryZoneType
  match_value: string
  fee: number
  estimated_delivery_minutes: number
  active: boolean
  priority: number
}

export interface ResolvedDeliveryZone {
  id: string
  zone_name: string
  pricing_mode: 'zone'
  delivery_fee: number
  estimated_delivery_minutes: number
  matched_by: DeliveryZoneType
  match_value: string
}

export interface NormalizedDeliveryAddress {
  bairro: string
  cep: string
  searchableText: string
}

export function normalizeDeliveryText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeCep(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '')
}

export function normalizeAddressForDeliveryMatching(
  address: Pick<GeocodeAddressInput, 'rua' | 'numero' | 'bairro' | 'cidade' | 'cep'>
): NormalizedDeliveryAddress {
  const searchableText = normalizeDeliveryText(
    [address.rua, address.numero, address.bairro, address.cidade, address.cep]
      .filter(Boolean)
      .join(' ')
  )

  return {
    bairro: normalizeDeliveryText(address.bairro),
    cep: normalizeCep(address.cep),
    searchableText,
  }
}

function matchesZone(
  zone: Pick<DeliveryZoneRecord, 'type' | 'match_value'>,
  address: NormalizedDeliveryAddress
): boolean {
  const normalizedMatchValue =
    zone.type === 'cep_prefixo'
      ? normalizeCep(zone.match_value)
      : normalizeDeliveryText(zone.match_value)

  if (!normalizedMatchValue) {
    return false
  }

  if (zone.type === 'bairro') {
    return address.bairro === normalizedMatchValue
  }

  if (zone.type === 'cep_prefixo') {
    return Boolean(address.cep) && address.cep.startsWith(normalizedMatchValue)
  }

  return address.searchableText.includes(normalizedMatchValue)
}

export function resolveDeliveryZone(input: {
  zones: DeliveryZoneRecord[]
  address: Pick<GeocodeAddressInput, 'rua' | 'numero' | 'bairro' | 'cidade' | 'cep'>
}): ResolvedDeliveryZone | null {
  const normalizedAddress = normalizeAddressForDeliveryMatching(input.address)
  const activeZones = input.zones
    .filter((zone) => zone.active)
    .sort((left, right) => left.priority - right.priority)

  const matchedZone = activeZones.find((zone) => matchesZone(zone, normalizedAddress))

  if (!matchedZone) {
    return null
  }

  return {
    id: matchedZone.id,
    zone_name: matchedZone.name,
    pricing_mode: 'zone',
    delivery_fee: Number(matchedZone.fee),
    estimated_delivery_minutes: Number(matchedZone.estimated_delivery_minutes),
    matched_by: matchedZone.type,
    match_value: matchedZone.match_value,
  }
}
