"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const calculateDeliveryFee_1 = require("./calculateDeliveryFee");
const resolveDeliveryZone_1 = require("./resolveDeliveryZone");
const getDeliveryQuote_1 = require("./getDeliveryQuote");
const baseRestaurant = {
    restaurant_id: 'rest_1',
    latitude: -23.55052,
    longitude: -46.633308,
    base_fee: 4,
    fee_per_km: 2,
    max_distance_km: 8,
    minimum_fee: 5,
    free_delivery_threshold: 60,
    delivery_mode: 'distance_only',
    fallback_distance_enabled: true,
    fallback_max_distance_km: null,
};
const activeZones = [
    {
        id: 'zone_1',
        restaurant_id: 'rest_1',
        name: 'Centro',
        type: 'bairro',
        match_value: 'Centro',
        fee: 8,
        estimated_delivery_minutes: 28,
        active: true,
        priority: 10,
    },
    {
        id: 'zone_2',
        restaurant_id: 'rest_1',
        name: 'Paulista CEP',
        type: 'cep_prefixo',
        match_value: '01310',
        fee: 9,
        estimated_delivery_minutes: 32,
        active: true,
        priority: 5,
    },
];
const geocodeMap = new Map([
    ['Rua Vergueiro|100|Liberdade', { lat: -23.57248, lng: -46.63959 }],
    ['Rua distante|999|Sem Match', { lat: -23.62052, lng: -46.703308 }],
]);
async function geocodeStub(address) {
    return geocodeMap.get(`${address.rua}|${address.numero}|${address.bairro}`) ?? null;
}
async function run() {
    const price = (0, calculateDeliveryFee_1.calculateDeliveryFee)(2.1, baseRestaurant, 30);
    strict_1.default.equal(price.status, 'ok');
    strict_1.default.equal(price.delivery_fee, 9);
    strict_1.default.equal((0, calculateDeliveryFee_1.calculateEstimatedDeliveryMinutes)(3.2), 36);
    const normalized = (0, resolveDeliveryZone_1.normalizeAddressForDeliveryMatching)({
        rua: 'Rua A',
        numero: '10',
        bairro: '  Céntro   Histórico ',
        cidade: 'São Paulo',
        cep: '01310-100',
    });
    strict_1.default.equal(normalized.bairro, 'centro historico');
    strict_1.default.equal(normalized.cep, '01310100');
    const bairroZone = (0, resolveDeliveryZone_1.resolveDeliveryZone)({
        zones: activeZones,
        address: {
            rua: 'Rua A',
            numero: '10',
            bairro: 'centro',
            cidade: 'São Paulo',
            cep: '',
        },
    });
    strict_1.default.equal(bairroZone?.zone_name, 'Centro');
    const cepZone = (0, resolveDeliveryZone_1.resolveDeliveryZone)({
        zones: activeZones,
        address: {
            rua: 'Av Paulista',
            numero: '1500',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            cep: '01310-200',
        },
    });
    strict_1.default.equal(cepZone?.zone_name, 'Paulista CEP');
    const priorityZone = (0, resolveDeliveryZone_1.resolveDeliveryZone)({
        zones: [
            ...activeZones,
            {
                id: 'zone_3',
                restaurant_id: 'rest_1',
                name: 'Paulista VIP',
                type: 'cep_prefixo',
                match_value: '01310',
                fee: 7,
                estimated_delivery_minutes: 25,
                active: true,
                priority: 1,
            },
        ],
        address: {
            rua: 'Av Paulista',
            numero: '1500',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            cep: '01310-200',
        },
    });
    strict_1.default.equal(priorityZone?.zone_name, 'Paulista VIP');
    const inactiveIgnored = (0, resolveDeliveryZone_1.resolveDeliveryZone)({
        zones: [
            {
                id: 'zone_4',
                restaurant_id: 'rest_1',
                name: 'Moema',
                type: 'bairro',
                match_value: 'Moema',
                fee: 10,
                estimated_delivery_minutes: 35,
                active: false,
                priority: 0,
            },
        ],
        address: {
            rua: 'Rua X',
            numero: '1',
            bairro: 'Moema',
            cidade: 'São Paulo',
            cep: '',
        },
    });
    strict_1.default.equal(inactiveIgnored, null);
    const zoneOnlyWithoutMatch = await (0, getDeliveryQuote_1.getDeliveryQuote)({
        restaurant: { ...baseRestaurant, delivery_mode: 'zone_only' },
        zones: activeZones,
        address: {
            rua: 'Rua distante',
            numero: '999',
            bairro: 'Sem Match',
            cidade: 'São Paulo',
            cep: '99999-999',
        },
        orderTotal: 20,
        geocodeFn: geocodeStub,
    });
    strict_1.default.equal(zoneOnlyWithoutMatch.status, 'out_of_range');
    const hybridZone = await (0, getDeliveryQuote_1.getDeliveryQuote)({
        restaurant: { ...baseRestaurant, delivery_mode: 'hybrid' },
        zones: activeZones,
        address: {
            rua: 'Rua A',
            numero: '10',
            bairro: 'Centro',
            cidade: 'São Paulo',
            cep: '01000-000',
        },
        orderTotal: 20,
        geocodeFn: geocodeStub,
    });
    strict_1.default.equal(hybridZone.pricing_mode, 'zone');
    strict_1.default.equal(hybridZone.zone_name, 'Centro');
    const hybridFallback = await (0, getDeliveryQuote_1.getDeliveryQuote)({
        restaurant: { ...baseRestaurant, delivery_mode: 'hybrid', fallback_max_distance_km: 6 },
        zones: activeZones,
        address: {
            rua: 'Rua Vergueiro',
            numero: '100',
            bairro: 'Liberdade',
            cidade: 'São Paulo',
            cep: '01504-000',
        },
        orderTotal: 30,
        geocodeFn: geocodeStub,
    });
    strict_1.default.equal(hybridFallback.pricing_mode, 'distance');
    strict_1.default.equal(hybridFallback.status, 'ok');
    const distanceOnlyQuote = await (0, getDeliveryQuote_1.getDeliveryQuote)({
        restaurant: { ...baseRestaurant, delivery_mode: 'distance_only' },
        zones: [],
        address: {
            rua: 'Rua Vergueiro',
            numero: '100',
            bairro: 'Liberdade',
            cidade: 'São Paulo',
            cep: '01504-000',
        },
        orderTotal: 30,
        geocodeFn: geocodeStub,
    });
    strict_1.default.equal(distanceOnlyQuote.pricing_mode, 'distance');
    strict_1.default.equal(distanceOnlyQuote.status, 'ok');
    strict_1.default.ok((distanceOnlyQuote.distance_km ?? 0) > 0);
    const persistence = (0, getDeliveryQuote_1.toOrderDeliveryPersistence)(hybridZone);
    strict_1.default.deepEqual(persistence, {
        pricing_mode: 'zone',
        zone_name: 'Centro',
        distance_km: null,
        delivery_fee: 8,
        estimated_delivery_minutes: 28,
    });
}
run()
    .then(() => {
    console.log('delivery hybrid tests passed');
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
