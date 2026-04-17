// T06 — GET /api/admin/cardapio
// Retorna categorias + produtos do restaurante autenticado (visão admin — inclui inativos e indisponíveis)
// Categorias: ordem ASC, nome ASC
// Produtos dentro de cada categoria: ordem ASC, nome ASC
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'

export async function GET() {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const [{ data: categorias, error: errCat }, { data: produtos, error: errProd }] =
    await Promise.all([
      supabase
        .from('categorias')
        .select('id, nome, ordem, ativo')
        .eq('restaurante_id', restauranteId)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true }),

      supabase
        .from('produtos')
        .select('id, categoria_id, nome, descricao, preco, foto_url, disponivel, ordem')
        .eq('restaurante_id', restauranteId)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true }),
    ])

  if (errCat || errProd) {
    console.error('[GET /api/admin/cardapio] erro:', errCat ?? errProd)
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })
  }

  const categoriasComProdutos = (categorias ?? []).map((cat) => ({
    ...cat,
    produtos: (produtos ?? []).filter((p) => p.categoria_id === cat.id),
  }))

  return NextResponse.json({ categorias: categoriasComProdutos })
}
