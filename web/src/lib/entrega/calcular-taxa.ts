import { calculateAdjustedDistanceKm } from '@/server/geolocation/calculateDistance'

export interface InputCalculoTaxa {
  latRestaurante: number
  lngRestaurante: number
  latCliente: number
  lngCliente: number
  taxaBase: number
  taxaPorKm: number
}

export interface ResultadoCalculoTaxa {
  distanciaKm: number
  taxaCalculada: number
}

export function calcularTaxaEntrega(input: InputCalculoTaxa): ResultadoCalculoTaxa {
  const distanciaKm = calculateAdjustedDistanceKm(
    input.latRestaurante,
    input.lngRestaurante,
    input.latCliente,
    input.lngCliente
  )

  return {
    distanciaKm,
    taxaCalculada: Math.ceil(input.taxaBase + distanciaKm * input.taxaPorKm),
  }
}
