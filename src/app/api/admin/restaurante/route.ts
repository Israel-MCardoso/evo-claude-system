import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { revalidatePath } from 'next/cache'
import { geocodeAddress } from '@/server/geolocation/geocodeAddress'
import { isMissingColumnError } from '@/server/admin/schemaFallback'

const CAMPOS_RETORNO =
  'id, slug, nome, logo_url, tipo, aceita_entrega, aceita_retirada, taxa_entrega, latitude, longitude, taxa_base_entrega, taxa_por_km, max_distance_km, minimum_fee, free_delivery_threshold, delivery_mode, fallback_distance_enabled, fallback_max_distance_km'

const CAMPOS_RETORNO_LEGACY =
  'id, slug, nome, logo_url, tipo, aceita_entrega, aceita_retirada, taxa_entrega, latitude, longitude'

const PatchSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').optional(),
  logo_url: z.string().url('URL inválida').optional().nullable(),
  taxa_entrega: z.number().min(0, 'Taxa não pode ser negativa').optional(),
  aceita_entrega: z.boolean().optional(),
  aceita_retirada: z.boolean().optional(),
  tipo: z.enum(['delivery', 'dark_kitchen', 'lanchonete']).optional().nullable(),
  taxa_base_entrega: z.number().min(0, 'Taxa base não pode ser negativa').optional(),
  taxa_por_km: z.number().min(0, 'Taxa por km não pode ser negativa').optional(),
  max_distance_km: z.number().positive('Distância máxima deve ser maior que zero').optional(),
  minimum_fee: z.number().min(0, 'Taxa mínima não pode ser negativa').optional(),
  free_delivery_threshold: z.number().min(0, 'Frete grátis não pode ser negativo').nullable().optional(),
  delivery_mode: z.enum(['distance_only', 'zone_only', 'hybrid']).optional(),
  fallback_distance_enabled: z.boolean().optional(),
  fallback_max_distance_km: z.number().positive('Raio de fallback inválido').nullable().optional(),
  endereco_restaurante: z.string().trim().optional(),
  numero_restaurante: z.string().trim().optional(),
  bairro_restaurante: z.string().trim().optional(),
  cidade_restaurante: z.string().trim().optional(),
  estado_restaurante: z.string().trim().optional(),
})

export async function GET() {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('restaurantes')
    .select(CAMPOS_RETORNO)
    .eq('id', restauranteId)
    .single()

  if (isMissingColumnError(error, 'restaurantes.max_distance_km')) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('restaurantes')
      .select(CAMPOS_RETORNO_LEGACY)
      .eq('id', restauranteId)
      .single()

    if (legacyError || !legacyData) {
      console.error('[GET /api/admin/restaurante] erro legacy:', legacyError)
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
    }

    return NextResponse.json({
      ...legacyData,
      taxa_base_entrega: Number(legacyData.taxa_entrega ?? 0),
      taxa_por_km: 0,
      max_distance_km: 8,
      minimum_fee: Number(legacyData.taxa_entrega ?? 0),
      free_delivery_threshold: null,
      delivery_mode: 'distance_only',
      fallback_distance_enabled: true,
      fallback_max_distance_km: null,
    })
  }

  if (error) {
    console.error('[GET /api/admin/restaurante] erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const {
    endereco_restaurante,
    numero_restaurante,
    bairro_restaurante,
    cidade_restaurante,
    estado_restaurante,
    ...dadosBasicos
  } = parsed.data
  const dadosUpdate: Record<string, unknown> = { ...dadosBasicos }

  const temEndereco = endereco_restaurante && numero_restaurante && bairro_restaurante
  if (temEndereco) {
    const cidade = cidade_restaurante ?? 'São Paulo'
    const estado = estado_restaurante ?? 'SP'
    const coords = await geocodeAddress({
      rua: endereco_restaurante,
      numero: numero_restaurante,
      bairro: bairro_restaurante,
      cidade: `${cidade} ${estado}`.trim(),
    })

    if (!coords) {
      return NextResponse.json(
        { error: 'Não foi possível localizar o endereço informado. Verifique rua, número e bairro.' },
        { status: 422 }
      )
    }

    dadosUpdate.latitude = coords.lat
    dadosUpdate.longitude = coords.lng
  }

  if (Object.keys(dadosUpdate).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('restaurantes')
    .update(dadosUpdate)
    .eq('id', restauranteId)
    .select(CAMPOS_RETORNO)
    .single()

  if (error) {
    console.error('[PATCH /api/admin/restaurante] erro:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }

  revalidatePath(`/${data.slug}`)

  return NextResponse.json(data)
}
