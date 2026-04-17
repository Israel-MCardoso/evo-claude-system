// T06 — PATCH /api/admin/produtos/[id] | DELETE /api/admin/produtos/[id]
// Atualiza ou remove produto do restaurante autenticado
// Chama revalidatePath('/${slug}') após toda mutação
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { revalidatePath } from 'next/cache'

const ProdutoPatchSchema = z.object({
  nome:         z.string().trim().min(1, 'Nome obrigatório').optional(),
  descricao:    z.string().trim().optional().nullable(),
  preco:        z.number().positive('Preço deve ser maior que zero').optional(),
  categoria_id: z.string().uuid('categoria_id inválido').optional(),
  foto_url:     z.string().url('URL da foto inválida').optional().nullable(),
  disponivel:   z.boolean().optional(),
  ordem:        z.number().int().min(0).optional(),
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
  const parsed = ProdutoPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  // Se categoria_id foi enviado, valida que pertence ao restaurante autenticado
  if (parsed.data.categoria_id) {
    const { data: categoria } = await supabase
      .from('categorias')
      .select('id')
      .eq('id', parsed.data.categoria_id)
      .eq('restaurante_id', restauranteId)
      .maybeSingle()

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const { data: produto, error } = await supabase
    .from('produtos')
    .update(parsed.data)
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .select('id, nome, descricao, preco, foto_url, disponivel, ordem, categoria_id')
    .single()

  if (error) {
    console.error('[PATCH /api/admin/produtos] erro:', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }

  if (!produto) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }

  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()

  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return NextResponse.json(produto)
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

  // Verifica existência e pertencimento antes de deletar
  const { data: produto } = await supabase
    .from('produtos')
    .select('id')
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle()

  if (!produto) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)
    .eq('restaurante_id', restauranteId)

  if (error) {
    console.error('[DELETE /api/admin/produtos] erro:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }

  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()

  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return new Response(null, { status: 204 })
}
