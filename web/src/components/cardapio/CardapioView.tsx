'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatarPreco } from '@/lib/utils/format'
import { useCarrinho } from '@/contexts/CarrinhoContext'
import { ProdutoModal } from './ProdutoModal'
import { CarrinhoDrawer } from './CarrinhoDrawer'
import type { CardapioPublico, ProdutoPublico } from '@/lib/cardapio/get-cardapio'

interface Props {
  cardapio: CardapioPublico
}

export function CardapioView({ cardapio }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoPublico | null>(null)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const { totalItens, totalPreco } = useCarrinho()

  const temProdutos = cardapio.categorias.some((c) => c.produtos.length > 0)
  const categoriasComProdutos = cardapio.categorias.filter((c) => c.produtos.length > 0)

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {cardapio.logo_url ? (
            <Image
              src={cardapio.logo_url}
              alt={`Logo ${cardapio.nome}`}
              width={40}
              height={40}
              className="rounded-full object-cover w-10 h-10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold shrink-0">
              {cardapio.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">{cardapio.nome}</h1>
            <p className="text-xs text-gray-500">
              {[
                cardapio.aceita_entrega && 'Entrega',
                cardapio.aceita_retirada && 'Retirada',
                cardapio.aceita_entrega && 'Taxa calculada no checkout',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      </header>

      {!temProdutos ? (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-4xl mb-4">😕</p>
          <h2 className="text-lg font-medium text-gray-700">Cardápio em atualização</h2>
          <p className="text-sm text-gray-500 mt-1">Em breve nossos produtos estarão disponíveis.</p>
        </div>
      ) : (
        <>
          <nav className="bg-white border-b border-gray-100 overflow-x-auto sticky top-[61px] z-10">
            <div className="flex gap-1 max-w-2xl mx-auto px-4 py-2 whitespace-nowrap">
              {categoriasComProdutos.map((cat) => (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {cat.nome}
                </a>
              ))}
            </div>
          </nav>

          <main className="max-w-2xl mx-auto px-4 pb-28">
            {categoriasComProdutos.map((categoria) => (
              <section key={categoria.id} id={`cat-${categoria.id}`} className="pt-6">
                <h2 className="text-base font-semibold text-gray-800 mb-3">{categoria.nome}</h2>
                <ul className="divide-y divide-gray-100 bg-white rounded-xl overflow-hidden shadow-sm">
                  {categoria.produtos.map((produto) => (
                    <li key={produto.id}>
                      <button
                        onClick={() => setProdutoAtivo(produto)}
                        className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{produto.nome}</p>
                          {produto.descricao && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {produto.descricao}
                            </p>
                          )}
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {formatarPreco(produto.preco)}
                          </p>
                        </div>
                        {produto.foto_url ? (
                          <img
                            src={produto.foto_url}
                            alt={produto.nome}
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </main>

          {totalItens > 0 && (
            <div className="fixed bottom-5 left-0 right-0 z-20 px-4">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={() => setDrawerAberto(true)}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-between px-5 shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                  <span className="bg-white/20 rounded-lg px-2 py-0.5 text-xs font-bold">
                    {totalItens}
                  </span>
                  <span>Ver carrinho</span>
                  <span>{formatarPreco(totalPreco)}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {produtoAtivo && (
        <ProdutoModal
          produto={produtoAtivo}
          restaurante_id={cardapio.id}
          slug={cardapio.slug}
          onFechar={() => setProdutoAtivo(null)}
        />
      )}

      {drawerAberto && (
        <CarrinhoDrawer slug={cardapio.slug} onFechar={() => setDrawerAberto(false)} />
      )}
    </>
  )
}
