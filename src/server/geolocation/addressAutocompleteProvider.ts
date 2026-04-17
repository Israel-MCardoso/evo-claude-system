const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const REQUEST_TIMEOUT_MS = 5000
const MAX_ATTEMPTS = 2
const CACHE_TTL_MS = 1000 * 60 * 30
const MAX_RESULTS = 5

export interface AddressSuggestion {
  id: string
  label: string
  rua: string
  bairro: string
  cidade: string
  cep: string | null
}

interface CacheEntry {
  expiresAt: number
  value: AddressSuggestion[]
}

type AutocompleteCacheStore = Map<string, CacheEntry>

declare global {
  var __deliveryAutocompleteCache: AutocompleteCacheStore | undefined
}

function getCache(): AutocompleteCacheStore {
  if (!globalThis.__deliveryAutocompleteCache) {
    globalThis.__deliveryAutocompleteCache = new Map<string, CacheEntry>()
  }

  return globalThis.__deliveryAutocompleteCache
}

function getUserAgent(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return appUrl
    ? `evo-delivery-autocomplete/1.0 (${appUrl})`
    : 'evo-delivery-autocomplete/1.0 (contact: suporte@evo.local)'
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ')
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

function pickStreet(address: Record<string, string | undefined>): string {
  return (
    address.road ??
    address.pedestrian ??
    address.footway ??
    address.residential ??
    address.path ??
    ''
  )
}

function pickDistrict(address: Record<string, string | undefined>): string {
  return (
    address.suburb ??
    address.neighbourhood ??
    address.city_district ??
    address.quarter ??
    address.hamlet ??
    ''
  )
}

function pickCity(address: Record<string, string | undefined>): string {
  return address.city ?? address.town ?? address.village ?? address.municipality ?? ''
}

function toSuggestion(item: {
  place_id?: number
  display_name?: string
  address?: Record<string, string | undefined>
}): AddressSuggestion | null {
  const address = item.address ?? {}
  const rua = pickStreet(address).trim()
  const bairro = pickDistrict(address).trim()
  const cidade = pickCity(address).trim()
  const cep = address.postcode?.trim() || null

  if (!rua || !bairro) {
    return null
  }

  return {
    id: String(item.place_id ?? item.display_name ?? `${rua}-${bairro}-${cidade}`),
    label: item.display_name?.trim() ?? [rua, bairro, cidade, cep].filter(Boolean).join(', '),
    rua,
    bairro,
    cidade,
    cep,
  }
}

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) {
    return []
  }

  const cache = getCache()
  const now = Date.now()
  const cached = cache.get(normalizedQuery)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const params = new URLSearchParams({
    q: `${normalizedQuery}, Brasil`,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'br',
    limit: String(MAX_RESULTS),
  })

  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now()

    try {
      const response = await fetchWithTimeout(`${NOMINATIM_URL}?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Autocomplete respondeu com status ${response.status}`)
      }

      const data = (await response.json()) as Array<{
        place_id?: number
        display_name?: string
        address?: Record<string, string | undefined>
      }>

      const suggestions = data.map(toSuggestion).filter(Boolean) as AddressSuggestion[]
      cache.set(normalizedQuery, {
        value: suggestions,
        expiresAt: now + CACHE_TTL_MS,
      })

      console.info('[delivery][autocomplete] success', {
        query: normalizedQuery,
        count: suggestions.length,
        duration_ms: Date.now() - startedAt,
      })

      return suggestions
    } catch (error) {
      lastError = error
      console.error('[delivery][autocomplete] attempt_failed', {
        query: normalizedQuery,
        attempt,
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }

  console.error('[delivery][autocomplete] failed', {
    query: normalizedQuery,
    error: lastError instanceof Error ? lastError.message : 'unknown_error',
  })

  return []
}
