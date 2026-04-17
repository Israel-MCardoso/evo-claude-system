const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const REQUEST_TIMEOUT_MS = 5000
const MAX_ATTEMPTS = 2
const CACHE_TTL_MS = 1000 * 60 * 60 * 6

export interface GeocodeAddressInput {
  rua: string
  numero: string
  bairro: string
  cidade?: string | null
  cep?: string | null
}

export interface Coordinates {
  lat: number
  lng: number
}

interface CacheEntry {
  expiresAt: number
  value: Coordinates | null
}

type GeocodeCacheStore = Map<string, CacheEntry>

declare global {
  var __deliveryGeocodeCache: GeocodeCacheStore | undefined
}

function getCache(): GeocodeCacheStore {
  if (!globalThis.__deliveryGeocodeCache) {
    globalThis.__deliveryGeocodeCache = new Map<string, CacheEntry>()
  }

  return globalThis.__deliveryGeocodeCache
}

function normalizeAddressPart(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function buildGeocodeQuery(input: GeocodeAddressInput): string {
  const parts = [
    normalizeAddressPart(input.rua),
    normalizeAddressPart(input.numero),
    normalizeAddressPart(input.bairro),
    normalizeAddressPart(input.cidade),
    normalizeAddressPart(input.cep),
    'Brasil',
  ].filter(Boolean)

  return parts.join(', ')
}

function getUserAgent(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return appUrl
    ? `evo-delivery/1.0 (${appUrl})`
    : 'evo-delivery/1.0 (contact: suporte@evo.local)'
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
}

async function requestCoordinates(query: string): Promise<Coordinates | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
  })

  const response = await fetchWithTimeout(`${NOMINATIM_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Nominatim respondeu com status ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  const firstResult = data[0] as { lat?: string; lon?: string }
  const lat = Number(firstResult.lat)
  const lng = Number(firstResult.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Nominatim retornou coordenadas inválidas')
  }

  return { lat, lng }
}

export async function geocodeAddress(input: GeocodeAddressInput): Promise<Coordinates | null> {
  const query = buildGeocodeQuery(input)
  const cache = getCache()
  const now = Date.now()
  const cached = cache.get(query)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now()

    try {
      const coordinates = await requestCoordinates(query)
      cache.set(query, {
        value: coordinates,
        expiresAt: now + CACHE_TTL_MS,
      })

      return coordinates
    } catch (error) {
      lastError = error
      console.error('[delivery][geocode] attempt_failed', {
        query,
        attempt,
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }

  console.error('[delivery][geocode] failed', {
    query,
    attempts: MAX_ATTEMPTS,
    error: lastError instanceof Error ? lastError.message : 'unknown_error',
  })

  cache.set(query, {
    value: null,
    expiresAt: now + CACHE_TTL_MS,
  })

  return null
}
