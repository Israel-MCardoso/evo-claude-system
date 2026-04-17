"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEstimatedDeliveryMinutes = calculateEstimatedDeliveryMinutes;
exports.calculateDeliveryFee = calculateDeliveryFee;
exports.calculateDeliveryQuote = calculateDeliveryQuote;
const calculateDistance_1 = require("../geolocation/calculateDistance");
const geocodeAddress_1 = require("../geolocation/geocodeAddress");
function roundMoneyUp(value) {
    if (value <= 0) {
        return 0;
    }
    return Math.ceil(value);
}
function calculateEstimatedDeliveryMinutes(distanceKm) {
    return Math.ceil(20 + distanceKm * 5);
}
function calculateDeliveryFee(distanceKm, config, orderTotal = 0) {
    if (distanceKm > config.max_distance_km) {
        return {
            delivery_fee: null,
            status: 'out_of_range',
            message: 'Endereço fora da área de entrega',
        };
    }
    let fee = config.base_fee + distanceKm * config.fee_per_km;
    fee = Math.max(fee, config.minimum_fee);
    if (config.free_delivery_threshold !== null &&
        orderTotal >= config.free_delivery_threshold) {
        fee = 0;
    }
    return {
        delivery_fee: roundMoneyUp(fee),
        status: 'ok',
    };
}
async function calculateDeliveryQuote(input) {
    const { restaurant, address, orderTotal = 0, geocodeFn = geocodeAddress_1.geocodeAddress } = input;
    if (restaurant.latitude === null ||
        restaurant.longitude === null ||
        !Number.isFinite(restaurant.latitude) ||
        !Number.isFinite(restaurant.longitude)) {
        return {
            success: false,
            distance_km: null,
            delivery_fee: null,
            estimated_delivery_minutes: null,
            status: 'error',
            message: 'Não foi possível calcular a entrega',
        };
    }
    try {
        const destinationCoordinates = await geocodeFn(address);
        if (!destinationCoordinates) {
            return {
                success: false,
                distance_km: null,
                delivery_fee: null,
                estimated_delivery_minutes: null,
                status: 'error',
                message: 'Não foi possível calcular a entrega',
            };
        }
        const distanceKm = (0, calculateDistance_1.calculateAdjustedDistanceKm)(restaurant.latitude, restaurant.longitude, destinationCoordinates.lat, destinationCoordinates.lng);
        const estimatedDeliveryMinutes = calculateEstimatedDeliveryMinutes(distanceKm);
        const feeResult = calculateDeliveryFee(distanceKm, restaurant, orderTotal);
        return {
            success: feeResult.status === 'ok',
            distance_km: feeResult.status === 'ok' ? distanceKm : null,
            delivery_fee: feeResult.delivery_fee,
            estimated_delivery_minutes: feeResult.status === 'ok' ? estimatedDeliveryMinutes : null,
            status: feeResult.status,
            message: feeResult.message,
        };
    }
    catch (error) {
        console.error('[delivery][distance] unexpected_error', {
            error: error instanceof Error ? error.message : 'unknown_error',
        });
        return {
            success: false,
            distance_km: null,
            delivery_fee: null,
            estimated_delivery_minutes: null,
            status: 'error',
            message: 'Não foi possível calcular a entrega',
        };
    }
}
