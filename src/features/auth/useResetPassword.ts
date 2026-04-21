'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type RecoveryState = 'checking' | 'ready' | 'invalid'

function readHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  return new URLSearchParams(hash)
}

export function useResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<RecoveryState>('checking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function initializeRecoverySession() {
      const supabase = createSupabaseBrowserClient()

      try {
        const hashParams = readHashParams()
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const hashType = hashParams.get('type')

        if (accessToken && refreshToken && hashType === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            setError('Este link de recuperação é inválido ou expirou.')
            setState('invalid')
            return
          }

          window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`)
          setState('ready')
          return
        }

        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setError('Este link de recuperação é inválido ou expirou.')
            setState('invalid')
            return
          }

          setState('ready')
          return
        }

        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })

          if (verifyError) {
            setError('Este link de recuperação é inválido ou expirou.')
            setState('invalid')
            return
          }

          setState('ready')
          return
        }

        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setState('ready')
          return
        }

        setError('Este link de recuperação é inválido ou expirou.')
        setState('invalid')
      } catch {
        setError('Não foi possível validar o link de recuperação.')
        setState('invalid')
      }
    }

    void initializeRecoverySession()
  }, [searchParams])

  async function updatePassword(password: string, confirmPassword: string) {
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return false
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return false
    }

    setLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError('Não foi possível redefinir sua senha. Solicite um novo link.')
        return false
      }

      await supabase.auth.signOut()
      router.push('/login?reset=success')
      router.refresh()
      return true
    } catch {
      setError('Não foi possível redefinir sua senha. Solicite um novo link.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    state,
    loading,
    error,
    updatePassword,
  }
}
