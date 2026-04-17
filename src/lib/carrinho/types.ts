export interface ItemCarrinho {
  produto_id: string
  nome: string
  preco: number
  quantidade: number
  foto_url: string | null
}

export interface Carrinho {
  restaurante_id: string
  slug: string
  itens: ItemCarrinho[]
}
