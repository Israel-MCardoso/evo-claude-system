import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'

const PatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(['bairro', 'cep_prefixo', 'faixa_manual']).optional(),
  match_value: z.string().trim().min(1).optional(),
  fee: z.number().min(0).optional(),
  estimated_delivery_minutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
})

const SELECT_FIELDS =
  'id, restaurant_id, name, type, match_value, fee, estimated_delivery_minutes, active, priority, created_at, updated_at'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()

  try {
    const restauranteId = await getRestauranteId(supabase)
    const body = await request.json().catch(() => null)
    const parsed = PatchSchema.safeParse(body)

    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('delivery_zones')
      .update(parsed.data)
      .eq('id', params.id)
      .eq('restaurant_id', restauranteId)
      .select(SELECT_FIELDS)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Zona de entrega nao encontrada' }, { status: 404 })
      }
      console.error('[PATCH /api/admin/delivery-zones/[id]] erro:', error)
      return NextResponse.json({ error: 'Erro ao atualizar zona de entrega' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
}
