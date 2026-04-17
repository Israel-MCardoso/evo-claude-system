'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatarPreco } from '@/lib/utils/format'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type StatusPedido =
  | 'pending'
  | 'waiting_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'expired'

interface ItemTracking {
  nome: string
  quantidade: number
  subtotal: number
}

interface PedidoTracking {
  id: string
  order_number: number
  status: StatusPedido
  modalidade: 'entrega' | 'retirada'
  cliente_nome: string
  total: number
  taxa_entrega: number
  pricing_mode?: 'zone' | 'distance' | null
  zone_name?: string | null
  distance_km?: number | null
  estimated_delivery_minutes?: number | null
  restaurante_nome: string
  itens: ItemTracking[]
}

// ---------------------------------------------------------------------------
// Mapeamento de status → linguagem amigável
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<StatusPedido, string> = {
  pending: 'Aguardando',
  waiting_payment: 'Aguardando pagamento',
  paid: 'Pagamento confirmado ✓',
  preparing: 'Em preparo 🍳',
  ready: 'Pronto para retirada 🛍️',
  delivered: 'Entregue 🎉',
  cancelled: 'Cancelado',
  expired: 'PIX expirado',
}

// Passos exibidos na barra de progresso (status finais excluídos)
const STEPS: StatusPedido[] = ['paid', 'preparing', 'ready', 'delivered']

const STATUS_STEP_INDEX: Partial<Record<StatusPedido, number>> = {
  paid: 0,
  preparing: 1,
  ready: 2,
  delivered: 3,
}

const STEP_LABEL: Record<string, string> = {
  paid: 'Pago',
  preparing: 'Preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
}

const STATUS_FINAL: StatusPedido[] = ['delivered', 'cancelled', 'expired']
const POLLING_INTERVAL_MS = 10_000

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface Props {
  pedidoId: string
}

export function TrackingView({ pedidoId }: Props) {
  const [pedido, setPedido] = useState<PedidoTracking | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const telefone = sessionStorage.getItem(`evo:pedido-tel:${pedidoId}`) ?? ''
      if (!telefone) {
        setErro('Não foi possível identificar o pedido. Verifique o link.')
        setCarregando(false)
        return
      }

      const res = await fetch(
        `/api/pedidos/${pedidoId}/status?telefone=${encodeURIComponent(telefone)}`
      )

      if (res.status === 404) {
        setErro('Pedido não encontrado. Verifique o link.')
        setCarregando(false)
        return
      }

      if (!res.ok) {
        // Não sobrescreve pedido existente em falha transitória
        if (!pedido) setErro('Erro ao carregar pedido. Tentando novamente...')
        return
      }

      const data: PedidoTracking = await res.json()
      setPedido(data)
      setErro('')
      setUltimaAtualizacao(new Date())
    } catch {
      if (!pedido) setErro('Erro de conexão. Tentando novamente...')
    } finally {
      setCarregando(false)
    }
  }, [pedidoId, pedido])

  // Busca inicial
  useEffect(() => {
    fetchStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling a cada 10s — para em status final
  useEffect(() => {
    if (!pedido || STATUS_FINAL.includes(pedido.status)) return
    const interval = setInterval(fetchStatus, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pedido, fetchStatus])

  // ---------------------------------------------------------------------------
  // Estados de loading / erro / não encontrado
  // ---------------------------------------------------------------------------

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (erro && !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-sm text-gray-600">{erro}</p>
        </div>
      </div>
    )
  }

  if (!pedido) return null

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------

  const stepAtual = STATUS_STEP_INDEX[pedido.status] ?? -1
  const isFinal = STATUS_FINAL.includes(pedido.status)
  const isCancelado = pedido.status === 'cancelled' || pedido.status === 'expired'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-semibold text-gray-900">{pedido.restaurante_nome}</h1>
          <span className="text-sm text-gray-400">Pedido #{pedido.order_number}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status atual */}
        <div
          className={`rounded-2xl p-5 text-center ${
            isCancelado
              ? 'bg-red-50 border border-red-100'
              : pedido.status === 'delivered'
              ? 'bg-green-50 border border-green-100'
              : 'bg-white shadow-sm'
          }`}
        >
          <p
            className={`text-lg font-semibold ${
              isCancelado
                ? 'text-red-700'
                : pedido.status === 'delivered'
                ? 'text-green-700'
                : 'text-gray-900'
            }`}
          >
            {STATUS_LABEL[pedido.status]}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {pedido.modalidade === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'} · {pedido.cliente_nome}
          </p>
        </div>

        {/* Barra de progresso (só para pedidos em andamento) */}
        {!isCancelado && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between relative">
              {/* Linha de fundo */}
              <div className="absolute left-0 right-0 top-[14px] h-0.5 bg-gray-100 mx-5" />
              {/* Linha de progresso */}
              {stepAtual >= 0 && (
                <div
                  className="absolute left-5 top-[14px] h-0.5 bg-gray-900 transition-all duration-500"
                  style={{ width: `${(stepAtual / (STEPS.length - 1)) * (100 - 10)}%` }}
                />
              )}

              {STEPS.map((step, i) => {
                const done = i <= stepAtual
                return (
                  <div key={step} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        done ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {STEP_LABEL[step]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Itens do pedido */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Itens</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {pedido.itens.map((item, i) => (
              <li key={i} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-700">
                  {item.quantidade}× {item.nome}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatarPreco(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatarPreco(pedido.total)}</span>
          </div>
        </div>

        {/* Indicador de polling */}
        {!isFinal && (
          <p className="text-center text-xs text-gray-400">
            {ultimaAtualizacao
              ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })} · atualiza a cada 10s`
              : 'Verificando status...'}
          </p>
        )}

        {/* Erro transitório (não bloqueia tela) */}
        {erro && pedido && (
          <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-2 px-3">
            ⚠ {erro}
          </p>
        )}
      </main>
    </div>
  )
}
