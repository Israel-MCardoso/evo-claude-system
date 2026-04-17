"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGeocodeQuery = buildGeocodeQuery;
exports.geocodeAddress = geocodeAddress;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
function getCache() {
    if (!globalThis.__deliveryGeocodeCache) {
        globalThis.__deliveryGeocodeCache = new Map();
    }
    return globalThis.__deliveryGeocodeCache;
}
function normalizeAddressPart(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}
function buildGeocodeQuery(input) {
    const parts = [
        normalizeAddressPart(input.rua),
        normalizeAddressPart(input.numero),
        normalizeAddressPart(input.bairro),
        normalizeAddressPart(input.cidade),
        normalizeAddressPart(input.cep),
        'Brasil',
    ].filter(Boolean);
    return parts.join(', ');
}
function getUserAgent() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    return appUrl
        ? `evo-delivery/1.0 (${appUrl})`
        : 'evo-delivery/1.0 (contact: suporte@evo.local)';
}
async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, {
            headers: {
                'User-Agent': getUserAgent(),
                Accept: 'application/json',
            },
            signal: controller.signal,
            cache: 'no-store',
        });
    }
    finally {
        clearTimeout(timer);
    }
}
async function requestCoordinates(query) {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0',
    });
    const response = await fetchWithTimeout(`${NOMINATIM_URL}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Nominatim respondeu com status ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
        return null;
    }
    const firstResult = data[0];
    const lat = Number(firstResult.lat);
    const lng = Number(firstResult.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Nominatim retornou coordenadas inválidas');
    }
    return { lat, lng };
}
async function geocodeAddress(input) {
    const query = buildGeocodeQuery(input);
    const cache = getCache();
    const now = Date.now();
    const cached = cache.get(query);
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const startedAt = Date.now();
        try {
            const coordinates = await requestCoordinates(query);
            cache.set(query, {
                value: coordinates,
                expiresAt: now + CACHE_TTL_MS,
            });
            return coordinates;
        }
        catch (error) {
            lastError = error;
            console.error('[delivery][geocode] attempt_failed', {
                query,
                attempt,
                duration_ms: Date.now() - startedAt,
                error: error instanceof Error ? error.message : 'unknown_error',
            });
        }
    }
    console.error('[delivery][geocode] failed', {
        query,
        attempts: MAX_ATTEMPTS,
        error: lastError instanceof Error ? lastError.message : 'unknown_error',
    });
    cache.set(query, {
        value: null,
        expiresAt: now + CACHE_TTL_MS,
    });
    return null;
}
