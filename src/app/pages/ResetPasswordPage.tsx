'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useResetPassword } from '@/features/auth/useResetPassword'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { state, loading, error, updatePassword } = useResetPassword()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await updatePassword(password, confirmPassword)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Evo</h1>
          <p className="text-sm text-gray-500 mt-1">Defina uma nova senha para sua conta</p>
        </div>

        {state === 'checking' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Validando link de recuperação...</p>
          </div>
        ) : state === 'invalid' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error ?? 'Este link não é mais válido.'}
              </p>
              <p className="text-sm text-gray-500">
                Solicite um novo e-mail de recuperação para continuar.
              </p>
            </div>

            <Link
              href="/auth/forgot-password"
              className="block w-full text-center bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete="new-password"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita sua nova senha"
                    autoComplete="new-password"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Atualizando senha...' : 'Salvar nova senha'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Não era isso?{' '}
              <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700">
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
