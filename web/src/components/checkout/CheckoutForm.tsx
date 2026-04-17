'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatarPreco } from '@/lib/utils/format'
import { useCarrinho } from '@/contexts/CarrinhoContext'
import { hasEnoughAddressData } from '@/features/checkout/delivery'
import { useCheckout } from '@/features/checkout/useCheckout'
import {
  isValidBrazilianCep,
  type AddressSuggestion,
} from '@/features/checkout/address-autocomplete'
import { useAddressAutocomplete } from '@/features/checkout/useAddressAutocomplete'

interface Props {
  restaurante_id: string
  slug: string
  nome_restaurante: string
  aceita_entrega: boolean
  aceita_retirada: boolean
}

type Modalidade = 'entrega' | 'retirada'

interface Erros {
  nome?: string
  telefone?: string
  rua?: string
  numero?: string
  bairro?: string
  geral?: string
}

export function CheckoutForm({
  restaurante_id,
  slug,
  nome_restaurante,
  aceita_entrega,
  aceita_retirada,
}: Props) {
  const router = useRouter()
  const { carrinho, totalPreco, limpar } = useCarrinho()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [modalidade, setModalidade] = useState<Modalidade>(
    aceita_entrega ? 'entrega' : 'retirada'
  )
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [cep, setCep] = useState('')
  const [complemento, setComplemento] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const pedidoConfirmadoRef = useRef(false)
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null)

  const { delivery, canSubmit, requiresCalculatedDeliveryFee, retryDeliveryCalculation } =
    useCheckout({
      modalidade,
      restauranteId: restaurante_id,
      address: {
        rua,
        numero,
        bairro,
        cidade,
        cep,
      },
      subtotal: totalPreco,
    })
  const {
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    selectedSuggestion,
    canShowSuggestions,
    highlightedIndex,
    selectSuggestion,
    closeSuggestions,
    moveHighlight,
    selectHighlightedSuggestion,
  } = useAddressAutocomplete({
    addressQuery: `${rua} ${bairro} ${cidade}`.trim(),
    currentAddress: {
      rua,
      bairro,
      cidade,
      cep,
    },
    onApplySuggestion: (values) => {
      setRua(values.rua)
      setBairro(values.bairro)
      setCidade(values.cidade)
      setCep(values.cep)
      setErros((current) => ({
        ...current,
        rua: undefined,
        bairro: undefined,
        geral: undefined,
      }))
    },
  })

  useEffect(() => {
    if (pedidoConfirmadoRef.current) return
    if (!carrinho || carrinho.itens.length === 0) {
      router.replace(`/${slug}`)
    }
  }, [carrinho, slug, router])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!autocompleteContainerRef.current?.contains(event.target as Node)) {
        closeSuggestions()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeSuggestions])

  const taxaEntregaCalculada = modalidade === 'entrega' ? delivery.deliveryFee ?? 0 : 0
  const total = totalPreco + taxaEntregaCalculada
  const itens = carrinho?.itens ?? []

  function validar(): boolean {
    const novosErros: Erros = {}
    if (!nome.trim()) novosErros.nome = 'Informe seu nome'
    if (!telefone.replace(/\D/g, '').match(/^\d{10,11}$/)) {
      novosErros.telefone = 'Telefone inválido'
    }

    if (modalidade === 'entrega') {
      if (!rua.trim()) novosErros.rua = 'Informe a rua'
      if (!numero.trim()) novosErros.numero = 'Informe o número'
      if (!bairro.trim()) novosErros.bairro = 'Informe o bairro'
      if (!cidade.trim()) novosErros.geral = 'Informe a cidade'
      if (cep.trim() && !isValidBrazilianCep(cep)) novosErros.geral = 'CEP inválido'

      if (delivery.outOfRange) {
        novosErros.geral = 'Endereço fora da área de entrega'
      } else if (delivery.error) {
        novosErros.geral = 'Não foi possível calcular a entrega'
      } else if (!hasEnoughAddressData({ rua, numero, bairro, cidade, cep })) {
        novosErros.geral = 'Preencha o endereço para calcular a entrega'
      } else if (!canSubmit) {
        novosErros.geral = delivery.loading
          ? 'Aguarde o cálculo da taxa de entrega'
          : 'Não foi possível calcular a taxa de entrega'
      }
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar() || !carrinho) return

    setEnviando(true)
    setErros({})

    try {
      const body = {
        restaurante_id,
        modalidade,
        cliente_nome: nome.trim(),
        cliente_telefone: telefone.replace(/\D/g, ''),
        ...(modalidade === 'entrega' && {
          endereco_rua: rua.trim(),
          endereco_numero: numero.trim(),
          endereco_bairro: bairro.trim(),
          endereco_cidade: cidade.trim() || undefined,
          endereco_cep: cep.trim() || undefined,
          endereco_complemento: complemento.trim() || null,
        }),
        itens: carrinho.itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
        })),
      }

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setErros({ geral: data.error ?? 'Erro ao criar pedido. Tente novamente.' })
        return
      }

      try {
        sessionStorage.setItem(`evo:pedido-tel:${data.id}`, telefone.replace(/\D/g, ''))
      } catch {}

      pedidoConfirmadoRef.current = true
      router.push(`/pedido/${data.id}/pagar`)
      limpar()
    } catch {
      setErros({ geral: 'Não foi possível fazer seu pedido. Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  if (!carrinho || itens.length === 0) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          aria-label="Voltar"
        >
          ←
        </button>
        <h1 className="font-semibold text-gray-900">{nome_restaurante}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Resumo
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {itens.map((item) => (
              <div key={item.produto_id} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-700">
                  {item.quantidade}× {item.nome}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatarPreco(item.preco * item.quantidade)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Seus dados
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 ${
                  erros.nome ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {erros.nome && <p className="text-xs text-red-500 mt-1">{erros.nome}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 ${
                  erros.telefone ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {erros.telefone && <p className="text-xs text-red-500 mt-1">{erros.telefone}</p>}
            </div>
          </div>
        </section>

        {aceita_entrega && aceita_retirada && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Como receber
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(['entrega', 'retirada'] as Modalidade[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setModalidade(opcao)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    modalidade === opcao
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opcao === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}
                </button>
              ))}
            </div>
          </section>
        )}

        {modalidade === 'entrega' && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Endereço de entrega
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <div ref={autocompleteContainerRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                <input
                  type="text"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      return
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!canShowSuggestions) {
                      return
                    }

                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      moveHighlight('next')
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      moveHighlight('prev')
                    } else if (e.key === 'Enter' && suggestions.length > 0) {
                      e.preventDefault()
                      selectHighlightedSuggestion()
                    } else if (e.key === 'Escape') {
                      closeSuggestions()
                    }
                  }}
                  placeholder="Rua das Flores"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 ${
                    erros.rua ? 'border-red-400' : 'border-gray-300'
                  }`}
                  aria-autocomplete="list"
                  aria-expanded={canShowSuggestions}
                  aria-controls="checkout-address-suggestions"
                />
                {erros.rua && <p className="text-xs text-red-500 mt-1">{erros.rua}</p>}

                {canShowSuggestions && (
                  <div
                    id="checkout-address-suggestions"
                    className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                    role="listbox"
                  >
                    {isLoadingSuggestions && (
                      <p className="px-3 py-2.5 text-sm text-gray-500">
                        Buscando endereços...
                      </p>
                    )}

                    {!isLoadingSuggestions && suggestionsError && (
                      <p className="px-3 py-2.5 text-sm text-red-600">
                        Não foi possível buscar sugestões agora
                      </p>
                    )}

                    {!isLoadingSuggestions &&
                      !suggestionsError &&
                      suggestions.length === 0 && (
                        <p className="px-3 py-2.5 text-sm text-gray-500">
                          Nenhum endereço encontrado
                        </p>
                      )}

                    {!isLoadingSuggestions &&
                      !suggestionsError &&
                      suggestions.length > 0 && (
                        <>
                          <p className="border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-400">
                            Selecione um endereço da lista
                          </p>
                          <ul className="max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                              <li key={suggestion.id}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => selectSuggestion(suggestion)}
                                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                                    highlightedIndex === index
                                      ? 'bg-gray-900 text-white'
                                      : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                  role="option"
                                  aria-selected={highlightedIndex === index}
                                >
                                  {suggestion.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 ${
                      erros.numero ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {erros.numero && <p className="text-xs text-red-500 mt-1">{erros.numero}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                  <input
                    type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Centro"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 ${
                      erros.bairro ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {erros.bairro && <p className="text-xs text-red-500 mt-1">{erros.bairro}</p>}
                </div>
              </div>
              {selectedSuggestion && (
                <p className="text-xs text-gray-500">
                  Endereço sugerido selecionado. Se precisar, você pode ajustar os campos manualmente.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto 4, bloco B..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="text-sm min-h-[20px]">
                {delivery.loading && (
                  <p className="text-gray-500">Calculando taxa de entrega...</p>
                )}

                {!delivery.loading && delivery.outOfRange && (
                  <p className="text-red-600">Endereço fora da área de entrega</p>
                )}

                {!delivery.loading && delivery.error && (
                  <div className="flex items-center justify-between gap-3 text-red-600">
                    <p>Não foi possível calcular a entrega</p>
                    <button
                      type="button"
                      onClick={retryDeliveryCalculation}
                      className="text-xs font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!delivery.loading &&
                  !delivery.outOfRange &&
                  !delivery.error &&
                  delivery.deliveryFee !== null &&
                  ((delivery.pricingMode === 'zone' && delivery.zoneName) ||
                    (delivery.pricingMode === 'distance' && delivery.distance !== null)) && (
                    <p className="text-gray-600">
                      {delivery.pricingMode === 'zone' && delivery.zoneName
                        ? `Entrega: ${formatarPreco(delivery.deliveryFee)} (Zona ${delivery.zoneName})`
                        : `Entrega: ${formatarPreco(delivery.deliveryFee)} (${delivery.distance?.toFixed(2)} km)`}
                    </p>
                  )}

                {!delivery.loading &&
                  !delivery.error &&
                  !delivery.outOfRange &&
                  selectedSuggestion &&
                  delivery.deliveryFee === null && (
                    <p className="text-gray-500">Selecione um número para recalcular a entrega.</p>
                  )}
              </div>
            </div>
          </section>
        )}

        {erros.geral && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erros.geral}</p>
        )}

        <div className="sticky bottom-4">
          <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-3 flex justify-between text-sm">
            <span className="text-gray-600">
              {modalidade === 'entrega' && taxaEntregaCalculada > 0
                ? `Subtotal + Taxa (${formatarPreco(taxaEntregaCalculada)})`
                : 'Total'}
            </span>
            <span className="font-bold text-gray-900">{formatarPreco(total)}</span>
          </div>
          <button
            type="submit"
            disabled={
              enviando ||
              (modalidade === 'entrega' && requiresCalculatedDeliveryFee && !canSubmit)
            }
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-between px-5 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{enviando ? 'Criando pedido...' : 'Confirmar pedido'}</span>
            <span>{formatarPreco(total)}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
