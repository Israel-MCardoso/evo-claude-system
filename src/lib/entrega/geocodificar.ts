import { geocodeAddress } from '@/server/geolocation/geocodeAddress'

export async function geocodificar(endereco: string): Promise<{ lat: number; lng: number } | null> {
  const [rua = '', numero = '', bairro = '', cidade = '', cep = ''] = endereco
    .split(',')
    .map((part) => part.trim())

  return geocodeAddress({
    rua,
    numero,
    bairro,
    cidade,
    cep,
  })
}
