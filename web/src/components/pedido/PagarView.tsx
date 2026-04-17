'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatarPreco } from '@/lib/utils/format'

interface Props {
  pedidoId: string
}

const EXPIRACAO_MS = 15 * 60 * 1000 // 15 minutos

export function PagarView({ pedidoId }: Props) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)
  const [simulando, setSimulando] = useState(false)
  const [erro, setErro] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(EXPIRACAO_MS / 1000)

  // Countdown 15 min
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutos = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const segundos = String(secondsLeft % 60).padStart(2, '0')
  const expirado = secondsLeft === 0

  function handleCopiar() {
    navigator.clipboard.writeText('MOCK_PIX_COPIA_COLA_00020126').then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const handleSimularPagamento = useCallback(async () => {
    setSimulando(true)
    setErro('')
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/pagar-mock`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.detalhe ? `${data.error}: ${data.detalhe}` : (data.error ?? 'Erro ao simular pagamento')
        setErro(msg)
        return
      }
      router.push(`/pedido/${pedidoId}`)
    } catch {
      setErro('Não foi possível simular o pagamento. Tente novamente.')
    } finally {
      setSimulando(false)
    }
  }, [pedidoId, router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-semibold text-gray-900 text-center">Pagamento PIX</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {expirado ? (
          /* Estado expirado */
          <div className="text-center py-12">
            <p className="text-4xl mb-4">⏰</p>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">PIX expirado</h2>
            <p className="text-sm text-gray-500 mb-6">
              O tempo para pagamento esgotou. Faça um novo pedido.
            </p>
            <button
              onClick={() => router.back()}
              className="text-sm font-medium text-gray-700 underline"
            >
              Voltar ao cardápio
            </button>
          </div>
        ) : (
          <>
            {/* Countdown */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Expira em</p>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  secondsLeft < 60 ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {minutos}:{segundos}
              </p>
            </div>

            {/* QR Code placeholder (mock) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
              <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-5xl">📱</span>
              </div>
              <p className="text-xs text-gray-400 italic">QR Code mock — integração MP em breve</p>
            </div>

            {/* Copia e cola */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Pix Copia e Cola
              </p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-gray-700 font-mono break-all bg-gray-50 rounded-lg px-3 py-2 select-all">
                  MOCK_PIX_COPIA_COLA_00020126
                </p>
                <button
                  onClick={handleCopiar}
                  className="shrink-0 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Como pagar:</p>
              {[
                'Abra o app do seu banco',
                'Escolha pagar com PIX',
                'Escaneie o QR Code ou cole a chave',
                'Confirme o pagamento',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600">{step}</p>
                </div>
              ))}
            </div>

            {/* Erro */}
            {erro && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
                {erro}
              </p>
            )}

            {/* Botão de simulação (mock only) */}
            <div className="border-2 border-dashed border-amber-300 rounded-2xl p-4 bg-amber-50">
              <p className="text-xs font-semibold text-amber-700 mb-3 text-center">
                ⚡ Ambiente de desenvolvimento
              </p>
              <button
                onClick={handleSimularPagamento}
                disabled={simulando}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {simulando ? 'Simulando...' : 'Simular pagamento aprovado'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
