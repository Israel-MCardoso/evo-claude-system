"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDeliveryText = normalizeDeliveryText;
exports.normalizeCep = normalizeCep;
exports.normalizeAddressForDeliveryMatching = normalizeAddressForDeliveryMatching;
exports.resolveDeliveryZone = resolveDeliveryZone;
function normalizeDeliveryText(value) {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}
function normalizeCep(value) {
    return (value ?? '').replace(/\D/g, '');
}
function normalizeAddressForDeliveryMatching(address) {
    const searchableText = normalizeDeliveryText([address.rua, address.numero, address.bairro, address.cidade, address.cep]
        .filter(Boolean)
        .join(' '));
    return {
        bairro: normalizeDeliveryText(address.bairro),
        cep: normalizeCep(address.cep),
        searchableText,
    };
}
function matchesZone(zone, address) {
    const normalizedMatchValue = zone.type === 'cep_prefixo'
        ? normalizeCep(zone.match_value)
        : normalizeDeliveryText(zone.match_value);
    if (!normalizedMatchValue) {
        return false;
    }
    if (zone.type === 'bairro') {
        return address.bairro === normalizedMatchValue;
    }
    if (zone.type === 'cep_prefixo') {
        return Boolean(address.cep) && address.cep.startsWith(normalizedMatchValue);
    }
    return address.searchableText.includes(normalizedMatchValue);
}
function resolveDeliveryZone(input) {
    const normalizedAddress = normalizeAddressForDeliveryMatching(input.address);
    const activeZones = input.zones
        .filter((zone) => zone.active)
        .sort((left, right) => left.priority - right.priority);
    const matchedZone = activeZones.find((zone) => matchesZone(zone, normalizedAddress));
    if (!matchedZone) {
        return null;
    }
    return {
        id: matchedZone.id,
        zone_name: matchedZone.name,
        pricing_mode: 'zone',
        delivery_fee: Number(matchedZone.fee),
        estimated_delivery_minutes: Number(matchedZone.estimated_delivery_minutes),
        matched_by: matchedZone.type,
        match_value: matchedZone.match_value,
    };
}
