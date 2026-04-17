"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHaversineDistanceKm = calculateHaversineDistanceKm;
exports.calculateAdjustedDistanceKm = calculateAdjustedDistanceKm;
const EARTH_RADIUS_KM = 6371;
const ROAD_DISTANCE_ADJUSTMENT = 1.3;
function toRadians(value) {
    return (value * Math.PI) / 180;
}
function calculateHaversineDistanceKm(originLat, originLng, destinationLat, destinationLng) {
    const deltaLat = toRadians(destinationLat - originLat);
    const deltaLng = toRadians(destinationLng - originLng);
    const haversine = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(originLat)) *
            Math.cos(toRadians(destinationLat)) *
            Math.sin(deltaLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}
function calculateAdjustedDistanceKm(originLat, originLng, destinationLat, destinationLng) {
    const straightLineDistance = calculateHaversineDistanceKm(originLat, originLng, destinationLat, destinationLng);
    return Number((straightLineDistance * ROAD_DISTANCE_ADJUSTMENT).toFixed(2));
}
