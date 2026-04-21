'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { TipoRestaurante } from '@/types/database'

export interface RegisterFormValues {
  nome: string
  email: string
  senha: string
  restaurante_nome: string
  tipo: TipoRestaurante
  aceita_entrega: boolean
  aceita_retirada: boolean
}

interface RegisterResponse {
  error?: string
  session?: {
    access_token: string
    refresh_token: string
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function useRegister() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function register(values: RegisterFormValues, options?: { nextPath?: string }) {
    setError(null)
    setSuccess(null)

    if (!values.nome.trim()) {
      setError('Informe seu nome')
      return false
    }

    if (!isValidEmail(values.email.trim())) {
      setError('Informe um email válido')
      return false
    }

    if (values.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return false
    }

    if (!values.restaurante_nome.trim()) {
      setError('Informe o nome do restaurante')
      return false
    }

    if (!values.aceita_entrega && !values.aceita_retirada) {
      setError('Selecione ao menos uma modalidade de atendimento')
      return false
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          nome: values.nome.trim(),
          email: values.email.trim().toLowerCase(),
          restaurante_nome: values.restaurante_nome.trim(),
        }),
      })

      const data = (await response.json().catch(() => null)) as RegisterResponse | null

      if (!response.ok) {
        setError(data?.error ?? 'Erro ao criar conta')
        return false
      }

      if (!data?.session?.access_token || !data.session.refresh_token) {
        setError('Erro ao criar conta')
        return false
      }

      const supabase = createSupabaseBrowserClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao iniciar sua sessão')
        return false
      }

      setSuccess('Conta criada com sucesso')
      router.push(options?.nextPath ?? '/painel')
      router.refresh()
      return true
    } catch {
      setError('Erro ao criar conta')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    register,
    loading,
    error,
    success,
    resetMessages() {
      setError(null)
      setSuccess(null)
    },
  }
}
