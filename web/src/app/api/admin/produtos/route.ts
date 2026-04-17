// T06 — POST /api/admin/produtos
// Cria produto para o restaurante autenticado
// Valida que categoria_id pertence ao restaurante antes de inserir
// Chama revalidatePath('/${slug}') após mutação
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'
import { revalidatePath } from 'next/cache'

const ProdutoCreateSchema = z.object({
  nome:         z.string().trim().min(1, 'Nome obrigatório'),
  descricao:    z.string().trim().optional().nullable(),
  preco:        z.number().positive('Preço deve ser maior que zero'),
  categoria_id: z.string().uuid('categoria_id inválido'),
  foto_url:     z.string().url('URL da foto inválida').optional().nullable(),
  disponivel:   z.boolean().optional().default(true),
  ordem:        z.number().int().min(0).optional().default(0),
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
  const parsed = ProdutoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { nome, descricao, preco, categoria_id, foto_url, disponivel, ordem } = parsed.data

  // Valida que a categoria pertence ao restaurante autenticado
  const { data: categoria } = await supabase
    .from('categorias')
    .select('id')
    .eq('id', categoria_id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle()

  if (!categoria) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  const { data: produto, error } = await supabase
    .from('produtos')
    .insert({
      restaurante_id: restauranteId,
      categoria_id,
      nome,
      descricao:  descricao  ?? null,
      preco,
      foto_url:   foto_url   ?? null,
      disponivel,
      ordem,
    })
    .select('id, nome, descricao, preco, foto_url, disponivel, ordem, categoria_id')
    .single()

  if (error) {
    console.error('[POST /api/admin/produtos] erro:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }

  const { data: rest } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()

  if (rest?.slug) revalidatePath(`/${rest.slug}`)

  return NextResponse.json(produto, { status: 201 })
}
