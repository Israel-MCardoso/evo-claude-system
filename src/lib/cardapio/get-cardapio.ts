import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Restaurante, Categoria, Produto } from '@/types/database'

export interface ProdutoPublico
  extends Pick<Produto, 'id' | 'nome' | 'descricao' | 'preco' | 'foto_url'> {}

export interface CategoriaPublica extends Pick<Categoria, 'id' | 'nome' | 'ordem'> {
  produtos: ProdutoPublico[]
}

export interface CardapioPublico
  extends Pick<
    Restaurante,
    'id' | 'slug' | 'nome' | 'logo_url' | 'aceita_entrega' | 'aceita_retirada'
  > {
  categorias: CategoriaPublica[]
}

export async function getCardapio(slug: string): Promise<CardapioPublico | null> {
  const supabase = await createSupabaseServerClient()

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, slug, nome, logo_url, aceita_entrega, aceita_retirada')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()

  if (!restaurante) return null

  const [{ data: categorias }, { data: produtos }] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nome, ordem')
      .eq('restaurante_id', restaurante.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true }),

    supabase
      .from('produtos')
      .select('id, categoria_id, nome, descricao, preco, foto_url, ordem')
      .eq('restaurante_id', restaurante.id)
      .eq('disponivel', true)
      .order('ordem', { ascending: true }),
  ])

  const categoriasComProdutos: CategoriaPublica[] = (categorias ?? []).map((cat) => ({
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

  return {
    id: restaurante.id,
    slug: restaurante.slug,
    nome: restaurante.nome,
    logo_url: restaurante.logo_url,
    aceita_entrega: restaurante.aceita_entrega,
    aceita_retirada: restaurante.aceita_retirada,
    categorias: categoriasComProdutos,
  }
}
