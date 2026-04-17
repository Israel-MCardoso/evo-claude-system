'use client'

import { useState, useEffect } from 'react'
import { formatarPreco } from '@/lib/utils/format'
import { useCarrinho } from '@/contexts/CarrinhoContext'
import type { ProdutoPublico } from '@/lib/cardapio/get-cardapio'

interface Props {
  produto: ProdutoPublico | null
  restaurante_id: string
  slug: string
  onFechar: () => void
}

export function ProdutoModal({ produto, restaurante_id, slug, onFechar }: Props) {
  const [quantidade, setQuantidade] = useState(1)
  const { adicionar } = useCarrinho()

  // Resetar quantidade ao abrir produto diferente
  useEffect(() => {
    if (produto) setQuantidade(1)
  }, [produto])

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onFechar])

  if (!produto) return null

  function handleAdicionar() {
    if (!produto) return
    adicionar(restaurante_id, slug, {
      produto_id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade,
      foto_url: produto.foto_url,
    })
    onFechar()
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onFechar}
    >
      {/* Card */}
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foto */}
        {produto.foto_url ? (
          <img
            src={produto.foto_url}
            alt={produto.nome}
            className="w-full h-52 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100" />
        )}

        <div className="p-5">
          {/* Nome + preço */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-gray-900">{produto.nome}</h2>
            <span className="text-lg font-bold text-gray-900 shrink-0">
              {formatarPreco(produto.preco)}
            </span>
          </div>

          {produto.descricao && (
            <p className="text-sm text-gray-500 mb-5">{produto.descricao}</p>
          )}

          {/* Controle de quantidade */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-gray-700">Quantidade</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-xl font-light text-gray-600 hover:bg-gray-50"
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-gray-900">{quantidade}</span>
              <button
                onClick={() => setQuantidade((q) => q + 1)}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-xl font-light text-gray-600 hover:bg-gray-50"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          </div>

          {/* Botão adicionar */}
          <button
            onClick={handleAdicionar}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-between px-5 hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            <span>Adicionar ao carrinho</span>
            <span>{formatarPreco(produto.preco * quantidade)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
