const EARTH_RADIUS_KM = 6371
const ROAD_DISTANCE_ADJUSTMENT = 1.3

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

export function calculateHaversineDistanceKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): number {
  const deltaLat = toRadians(destinationLat - originLat)
  const deltaLng = toRadians(destinationLng - originLng)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(destinationLat)) *
      Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine))
}

export function calculateAdjustedDistanceKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): number {
  const straightLineDistance = calculateHaversineDistanceKm(
    originLat,
    originLng,
    destinationLat,
    destinationLng
  )

  return Number((straightLineDistance * ROAD_DISTANCE_ADJUSTMENT).toFixed(2))
}
