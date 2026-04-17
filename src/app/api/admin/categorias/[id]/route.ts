// T06 — PATCH /api/admin/categorias/[id] | DELETE /api/admin/categorias/[id]
// Atualiza ou remove categoria do restaurante autenticado
// DELETE retorna 409 se houver produtos vinculados
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { revalidatePath } from 'next/cache'

const PatchSchema = z.object({
  nome:  z.string().trim().min(1, 'Nome obrigatório').optional(),
  ordem: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
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

  const { data: categoria, error } = await supabase
    .from('categorias')
    .update(parsed.data)
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .select('id, nome, ordem, ativo')
    .single()

  if (error) {
    console.error('[PATCH /api/admin/categorias] erro:', error)
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }

  if (!categoria) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()
  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return NextResponse.json(categoria)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verifica se a categoria pertence ao restaurante
  const { data: categoria } = await supabase
    .from('categorias')
    .select('id')
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle()

  if (!categoria) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  // Bloqueia exclusão se houver produtos vinculados
  const { count } = await supabase
    .from('produtos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', id)
    .eq('restaurante_id', restauranteId)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Categoria possui produtos vinculados' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)
    .eq('restaurante_id', restauranteId)

  if (error) {
    console.error('[DELETE /api/admin/categorias] erro:', error)
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 })
  }

  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()
  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return new Response(null, { status: 204 })
}
