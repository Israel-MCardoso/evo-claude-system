'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePasswordRecovery } from '@/features/auth/usePasswordRecovery'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const { loading, error, success, sendRecoveryEmail, resetMessages } = usePasswordRecovery()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await sendRecoveryEmail(email)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Evo</h1>
          <p className="text-sm text-gray-500 mt-1">Recupere o acesso à sua conta</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Informe seu e-mail para receber um link seguro de redefinição.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  resetMessages()
                  setEmail(event.target.value)
                }}
                placeholder="voce@restaurante.com"
                autoComplete="email"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
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
            disabled={loading || !email.trim()}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando link...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Lembrou sua senha?{' '}
          <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
