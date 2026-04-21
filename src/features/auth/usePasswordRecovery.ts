'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getRecoveryRedirectUrl() {
  if (typeof window === 'undefined') {
    return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/reset-password`
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin
  return `${baseUrl}/auth/reset-password`
}

export function usePasswordRecovery() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function sendRecoveryEmail(email: string) {
    setError(null)
    setSuccess(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um e-mail válido')
      return false
    }

    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: getRecoveryRedirectUrl(),
        }
      )

      if (recoveryError) {
        setError('Não foi possível enviar o link agora. Tente novamente.')
        return false
      }

      setSuccess(
        'Se o e-mail estiver cadastrado, enviaremos um link de recuperação em instantes.'
      )
      return true
    } catch {
      setError('Não foi possível enviar o link agora. Tente novamente.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    success,
    sendRecoveryEmail,
    resetMessages() {
      setError(null)
      setSuccess(null)
    },
  }
}
