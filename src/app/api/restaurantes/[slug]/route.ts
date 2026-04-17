import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  try {
    const supabase = await createSupabaseServerClient()

    const { data: restaurante, error: errRestaurante } = await supabase
      .from('restaurantes')
      .select('id, slug, nome, logo_url, aceita_entrega, aceita_retirada')
      .eq('slug', slug)
      .eq('ativo', true)
      .single()

    if (errRestaurante || !restaurante) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
    }

    const { data: categorias, error: errCategorias } = await supabase
      .from('categorias')
      .select('id, nome, ordem')
      .eq('restaurante_id', restaurante.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (errCategorias) {
      console.error('[GET /api/restaurantes/[slug]] erro categorias:', errCategorias)
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    const { data: produtos, error: errProdutos } = await supabase
      .from('produtos')
      .select('id, categoria_id, nome, descricao, preco, foto_url, ordem')
      .eq('restaurante_id', restaurante.id)
      .eq('disponivel', true)
      .order('ordem', { ascending: true })

    if (errProdutos) {
      console.error('[GET /api/restaurantes/[slug]] erro produtos:', errProdutos)
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    const categoriasComProdutos = (categorias ?? []).map((cat) => ({
      id: cat.id,
      nome: cat.nome,
      ordem: cat.ordem,
      produtos: (produtos ?? [])
        .filter((p) => p.categoria_id === cat.id)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          preco: p.preco,
          foto_url: p.foto_url,
        })),
    }))

    return NextResponse.json({
      id: restaurante.id,
      slug: restaurante.slug,
      nome: restaurante.nome,
      logo_url: restaurante.logo_url,
      aceita_entrega: restaurante.aceita_entrega,
      aceita_retirada: restaurante.aceita_retirada,
      categorias: categoriasComProdutos,
    })
  } catch (err) {
    console.error('[GET /api/restaurantes/[slug]] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
