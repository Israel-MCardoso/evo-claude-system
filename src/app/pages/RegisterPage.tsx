'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRegister } from '@/features/auth/useRegister'
import type { TipoRestaurante } from '@/types/database'

const TIPO_OPTIONS: Array<{ value: TipoRestaurante; label: string }> = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'dark_kitchen', label: 'Dark Kitchen' },
  { value: 'lanchonete', label: 'Lanchonete' },
]

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const { register, loading, error, success, resetMessages } = useRegister()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [restauranteNome, setRestauranteNome] = useState('')
  const [tipo, setTipo] = useState<TipoRestaurante>('delivery')
  const [aceitaEntrega, setAceitaEntrega] = useState(true)
  const [aceitaRetirada, setAceitaRetirada] = useState(true)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextPath = searchParams.get('next') ?? '/painel'

    await register({
      nome,
      email,
      senha,
      restaurante_nome: restauranteNome,
      tipo,
      aceita_entrega: aceitaEntrega,
      aceita_retirada: aceitaRetirada,
    }, { nextPath })
  }

  function handleChange(callback: (value: string) => void) {
    return (value: string) => {
      resetMessages()
      callback(value)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Evo</h1>
          <p className="text-sm text-gray-500 mt-1">Crie sua conta e comece seu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(event) => handleChange(setNome)(event.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => handleChange(setEmail)(event.target.value)}
                  placeholder="voce@restaurante.com"
                  autoComplete="email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(event) => handleChange(setSenha)(event.target.value)}
                  placeholder="Minimo de 6 caracteres"
                  autoComplete="new-password"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do restaurante
                </label>
                <input
                  type="text"
                  value={restauranteNome}
                  onChange={(event) => handleChange(setRestauranteNome)(event.target.value)}
                  placeholder="Ex.: Sabor da Casa"
                  autoComplete="organization"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={tipo ?? 'delivery'}
                  onChange={(event) => {
                    resetMessages()
                    setTipo(event.target.value as TipoRestaurante)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {TIPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-gray-700">Modalidades</span>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={aceitaEntrega}
                    onChange={(event) => {
                      resetMessages()
                      setAceitaEntrega(event.target.checked)
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Aceita entrega
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={aceitaRetirada}
                    onChange={(event) => {
                      resetMessages()
                      setAceitaRetirada(event.target.checked)
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Aceita retirada
                </label>
              </div>
            </div>

            {(error || success) && (
              <p
                className={`text-sm rounded-lg px-3 py-2 ${
                  error ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'
                }`}
              >
                {error ?? success}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando sua conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
