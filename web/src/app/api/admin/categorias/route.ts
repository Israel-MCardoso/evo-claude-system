// T06 — POST /api/admin/categorias
// Cria categoria para o restaurante autenticado
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { revalidatePath } from 'next/cache'

const CategoriaSchema = z.object({
  nome:  z.string().trim().min(1, 'Nome obrigatório'),
  ordem: z.number().int().min(0).optional().default(0),
  ativo: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = CategoriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { nome, ordem, ativo } = parsed.data

  const { data: categoria, error } = await supabase
    .from('categorias')
    .insert({ restaurante_id: restauranteId, nome, ordem, ativo })
    .select('id, nome, ordem, ativo')
    .single()

  if (error) {
    console.error('[POST /api/admin/categorias] erro:', error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }

  // Revalida o cardápio público
  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()

  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return NextResponse.json(categoria, { status: 201 })
}
