'use client'

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import type { ItemCarrinho, Carrinho } from '@/lib/carrinho/types'

// ---------------------------------------------------------------------------
// Estado e ações
// ---------------------------------------------------------------------------

type State = Carrinho | null

type Action =
  | { type: 'RESTAURAR'; state: Carrinho }
  | { type: 'ADICIONAR'; restaurante_id: string; slug: string; item: ItemCarrinho }
  | { type: 'REMOVER'; produto_id: string }
  | { type: 'ALTERAR_QUANTIDADE'; produto_id: string; quantidade: number }
  | { type: 'LIMPAR' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'RESTAURAR':
      return action.state

    case 'ADICIONAR': {
      // Se o carrinho é de outro restaurante, descarta e começa do zero
      const base: Carrinho =
        state && state.restaurante_id === action.restaurante_id
          ? state
          : { restaurante_id: action.restaurante_id, slug: action.slug, itens: [] }

      const existe = base.itens.find((i) => i.produto_id === action.item.produto_id)

      const itens = existe
        ? base.itens.map((i) =>
            i.produto_id === action.item.produto_id
              ? { ...i, quantidade: i.quantidade + action.item.quantidade }
              : i
          )
        : [...base.itens, action.item]

      return { ...base, itens }
    }

    case 'REMOVER': {
      if (!state) return null
      const itens = state.itens.filter((i) => i.produto_id !== action.produto_id)
      return itens.length === 0 ? null : { ...state, itens }
    }

    case 'ALTERAR_QUANTIDADE': {
      if (!state) return null
      if (action.quantidade <= 0) {
        const itens = state.itens.filter((i) => i.produto_id !== action.produto_id)
        return itens.length === 0 ? null : { ...state, itens }
      }
      return {
        ...state,
        itens: state.itens.map((i) =>
          i.produto_id === action.produto_id ? { ...i, quantidade: action.quantidade } : i
        ),
      }
    }

    case 'LIMPAR':
      return null

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CarrinhoContextValue {
  carrinho: State
  totalItens: number
  totalPreco: number
  adicionar: (restaurante_id: string, slug: string, item: ItemCarrinho) => void
  remover: (produto_id: string) => void
  alterarQuantidade: (produto_id: string, quantidade: number) => void
  limpar: () => void
}

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null)

const STORAGE_KEY = 'evo:carrinho'

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  // Sempre inicia null no servidor — hydration via useEffect abaixo
  const [carrinho, dispatch] = useReducer(reducer, null)
  const [hasHydrated, setHasHydrated] = useState(false)

  // 1. Restaura do sessionStorage após montar no cliente
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Carrinho
        dispatch({ type: 'RESTAURAR', state: parsed })
      }
    } catch {
      // sessionStorage indisponível ou JSON inválido — ignora
    }
    setHasHydrated(true)
  }, [])

  // 2. Persiste no sessionStorage a cada mudança — só após hydration
  //    para não sobrescrever o storage com null antes de ler
  useEffect(() => {
    if (!hasHydrated) return
    try {
      if (carrinho) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // sessionStorage indisponível (ex: modo privado restritivo)
    }
  }, [carrinho, hasHydrated])

  const totalItens = carrinho?.itens.reduce((acc, i) => acc + i.quantidade, 0) ?? 0
  const totalPreco = carrinho?.itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0) ?? 0

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        totalItens,
        totalPreco,
        adicionar: (restaurante_id, slug, item) =>
          dispatch({ type: 'ADICIONAR', restaurante_id, slug, item }),
        remover: (produto_id) => dispatch({ type: 'REMOVER', produto_id }),
        alterarQuantidade: (produto_id, quantidade) =>
          dispatch({ type: 'ALTERAR_QUANTIDADE', produto_id, quantidade }),
        limpar: () => dispatch({ type: 'LIMPAR' }),
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  )
}

export function useCarrinho(): CarrinhoContextValue {
  const ctx = useContext(CarrinhoContext)
  if (!ctx) throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider')
  return ctx
}
