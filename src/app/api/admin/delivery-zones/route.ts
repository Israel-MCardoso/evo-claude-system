import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { isMissingTableError } from '@/server/admin/schemaFallback'

const DeliveryZoneSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  type: z.enum(['bairro', 'cep_prefixo', 'faixa_manual']),
  match_value: z.string().trim().min(1, 'Valor de correspondência obrigatório'),
  fee: z.number().min(0, 'Taxa inválida'),
  estimated_delivery_minutes: z.number().int().positive('Tempo estimado inválido'),
  active: z.boolean(),
  priority: z.number().int().min(0, 'Prioridade inválida'),
})

const SELECT_FIELDS =
  'id, restaurant_id, name, type, match_value, fee, estimated_delivery_minutes, active, priority, created_at, updated_at'

export async function GET() {
  const supabase = await createSupabaseServerClient()

  try {
    const restauranteId = await getRestauranteId(supabase)
    const { data, error } = await supabase
      .from('delivery_zones')
      .select(SELECT_FIELDS)
      .eq('restaurant_id', restauranteId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      if (isMissingTableError(error, 'delivery_zones')) {
        return NextResponse.json({ zones: [] })
      }
      console.error('[GET /api/admin/delivery-zones] erro:', error)
      return NextResponse.json({ error: 'Erro ao buscar zonas de entrega' }, { status: 500 })
    }

    return NextResponse.json({ zones: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  try {
    const restauranteId = await getRestauranteId(supabase)
    const body = await request.json().catch(() => null)
    const parsed = DeliveryZoneSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert({
        restaurant_id: restauranteId,
        ...payload,
      })
      .select(SELECT_FIELDS)
      .single()

    if (error) {
      console.error('[POST /api/admin/delivery-zones] erro:', error)
      return NextResponse.json({ error: 'Erro ao criar zona de entrega' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
}
