'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatarPreco } from '@/lib/utils/format'
import { useCarrinho } from '@/contexts/CarrinhoContext'

interface Props {
  slug: string
  onFechar: () => void
}

export function CarrinhoDrawer({ slug, onFechar }: Props) {
  const { carrinho, totalPreco, alterarQuantidade } = useCarrinho()
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onFechar])

  const itens = carrinho?.itens ?? []

  function handleFazerPedido() {
    onFechar()
    router.push(`/${slug}/checkout`)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Seu carrinho</h2>
          <button
            onClick={onFechar}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Fechar carrinho"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {itens.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Seu carrinho está vazio</p>
          ) : (
            <ul className="space-y-4">
              {itens.map((item) => (
                <li key={item.produto_id} className="flex items-center gap-3">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt={item.nome}
                      className="w-[52px] h-[52px] rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-lg bg-gray-100 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                    <p className="text-sm text-gray-500">{formatarPreco(item.preco)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg leading-none"
                      aria-label="Diminuir"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg leading-none"
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {itens.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatarPreco(totalPreco)}</span>
            </div>
            <p className="text-xs text-gray-500">Taxa calculada automaticamente no checkout.</p>
            <button
              onClick={handleFazerPedido}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-between px-5 hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              <span>Fazer pedido</span>
              <span>{formatarPreco(totalPreco)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
