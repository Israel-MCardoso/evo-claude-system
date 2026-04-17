'use client'

// Sprint 03 — Painel de pedidos com polling 5s

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatarPreco } from '@/lib/utils/format'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type StatusAtivo = 'paid' | 'preparing' | 'ready'

interface ItemPedido {
  id: string
  nome_snapshot: string
  quantidade: number
  subtotal: number
}

interface Pedido {
  id: string
  order_number: number
  status: StatusAtivo
  modalidade: 'entrega' | 'retirada'
  cliente_nome: string
  subtotal: number
  taxa_entrega: number
  total: number
  criado_em: string
  itens_pedido: ItemPedido[]
}

// ---------------------------------------------------------------------------
// Configuração de UI por status
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<StatusAtivo, string> = {
  paid:      'Novo pedido',
  preparing: 'Em preparo',
  ready:     'Pronto',
}

const ACAO_LABEL: Record<StatusAtivo, string> = {
  paid:      'Iniciar preparo',
  preparing: 'Marcar como pronto',
  ready:     'Confirmar entrega',
}

const CARD_COR: Record<StatusAtivo, string> = {
  paid:      'border-amber-200 bg-amber-50',
  preparing: 'border-blue-200 bg-blue-50',
  ready:     'border-green-200 bg-green-50',
}

const BADGE_COR: Record<StatusAtivo, string> = {
  paid:      'bg-amber-100 text-amber-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready:     'bg-green-100 text-green-800',
}

const BOTAO_COR: Record<StatusAtivo, string> = {
  paid:      'bg-amber-500 hover:bg-amber-600 text-white',
  preparing: 'bg-blue-600 hover:bg-blue-700 text-white',
  ready:     'bg-green-600 hover:bg-green-700 text-white',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tempoRelativo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  return `${Math.floor(diff / 3600)}h atrás`
}

const POLLING_MS = 5_000

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function PainelPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  // Ref para evitar dependência circular no useCallback do polling
  const temDadosRef = useRef(false)

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pedidos')

      if (!res.ok) {
        if (!temDadosRef.current) setErro('Erro ao carregar pedidos.')
        return
      }

      const data = await res.json()
      const lista: Pedido[] = data.pedidos ?? []
      temDadosRef.current = lista.length > 0
      setPedidos(lista)
      setErro('')
    } catch {
      if (!temDadosRef.current) setErro('Erro de conexão.')
    } finally {
      setCarregando(false)
    }
  }, [])

  // Fetch inicial
  useEffect(() => {
    fetchPedidos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling a cada 5s
  useEffect(() => {
    const interval = setInterval(fetchPedidos, POLLING_MS)
    return () => clearInterval(interval)
  }, [fetchPedidos])

  async function avancarStatus(id: string) {
    setAtualizando(id)
    try {
      const res = await fetch(`/api/admin/pedidos/${id}/status`, { method: 'PATCH' })
      if (!res.ok) return
      // Atualiza imediatamente sem esperar o próximo ciclo de polling
      await fetchPedidos()
    } finally {
      setAtualizando(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Estados de tela
  // ---------------------------------------------------------------------------

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  if (erro && !pedidos.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erro}</p>
      </div>
    )
  }

  if (!pedidos.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700 mb-1">Nenhum pedido ativo agora</p>
          <p className="text-sm text-gray-400">Novos pedidos aparecem aqui automaticamente</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Lista de pedidos
  // ---------------------------------------------------------------------------

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-semibold text-gray-900">
          Pedidos ativos
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({pedidos.length})
          </span>
        </h1>
        <span className="text-xs text-gray-400">Atualiza a cada 5s</span>
      </div>

      {/* Erro transitório (não bloqueia a tela) */}
      {erro && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
          Falha ao atualizar — tentando novamente...
        </p>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className={`rounded-2xl border p-4 space-y-3 ${CARD_COR[pedido.status]}`}
          >
            {/* Linha 1: número + badge + total */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-base">
                  #{pedido.order_number}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_COR[pedido.status]}`}
                >
                  {STATUS_LABEL[pedido.status]}
                </span>
                <span className="text-xs text-gray-500">
                  {pedido.modalidade === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}
                </span>
              </div>
              <span className="font-bold text-gray-900 shrink-0 tabular-nums">
                {formatarPreco(pedido.total)}
              </span>
            </div>

            {/* Linha 2: cliente + tempo */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-800">{pedido.cliente_nome}</span>
              <span className="text-xs text-gray-400">{tempoRelativo(pedido.criado_em)}</span>
            </div>

            {/* Itens */}
            <ul className="space-y-0.5 border-t border-black/5 pt-2">
              {pedido.itens_pedido.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span>
                    <span className="font-medium text-gray-700">{item.quantidade}×</span>{' '}
                    {item.nome_snapshot}
                  </span>
                  <span className="text-gray-500 tabular-nums shrink-0 ml-2">
                    {formatarPreco(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Taxa de entrega (se aplicável) */}
            {pedido.modalidade === 'entrega' && pedido.taxa_entrega > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Taxa de entrega</span>
                <span className="tabular-nums">{formatarPreco(pedido.taxa_entrega)}</span>
              </div>
            )}

            {/* Botão de ação */}
            <button
              onClick={() => avancarStatus(pedido.id)}
              disabled={atualizando === pedido.id}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${BOTAO_COR[pedido.status]}`}
            >
              {atualizando === pedido.id ? 'Atualizando...' : ACAO_LABEL[pedido.status]}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
