'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type MemberRole = 'owner' | 'admin' | 'operator' | 'viewer'
type InviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired'

interface InvitationPayload {
  id: string
  email: string
  role: MemberRole
  status: InviteStatus
  expires_at: string
  restaurante: {
    id: string
    nome: string
    slug: string
  } | null
}

interface ViewerPayload {
  id: string
  email: string | null
}

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
}

export default function InviteAcceptancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [invitation, setInvitation] = useState<InvitationPayload | null>(null)
  const [viewer, setViewer] = useState<ViewerPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setError('Convite invalido')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/invitations?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Erro ao carregar convite')
          setLoading(false)
          return
        }

        setInvitation(data.invitation ?? null)
        setViewer(data.viewer ?? null)
      } catch {
        setError('Erro ao carregar convite')
      } finally {
        setLoading(false)
      }
    }

    void loadInvitation()
  }, [token])

  const nextPath = useMemo(() => `/auth/invite?token=${encodeURIComponent(token)}`, [token])

  async function acceptInvitation() {
    if (!token) return
    setAccepting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Erro ao aceitar convite')
        return
      }

      setSuccess('Convite aceito com sucesso. Redirecionando para o painel...')
      router.push('/painel')
      router.refresh()
    } catch {
      setError('Erro ao aceitar convite')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Evo</h1>
          <p className="text-sm text-gray-500 mt-1">Voce foi convidado para um restaurante</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {loading ? (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Validando convite...</p>
            </div>
          ) : invitation ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Restaurante</p>
                <p className="text-sm font-semibold text-gray-900">
                  {invitation.restaurante?.nome ?? 'Restaurante'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">E-mail convidado</p>
                <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Papel</p>
                <p className="text-sm font-medium text-gray-900">{ROLE_LABEL[invitation.role]}</p>
              </div>

              {viewer?.email && viewer.email.toLowerCase() !== invitation.email.toLowerCase() && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Voce esta logado com outro e-mail. Entre com {invitation.email} para aceitar.
                </p>
              )}

              {invitation.status !== 'pending' && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Este convite nao esta mais disponivel.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {success && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              {!viewer ? (
                <div className="space-y-3 pt-2">
                  <Link
                    href={`/login?next=${encodeURIComponent(nextPath)}`}
                    className="block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all"
                  >
                    Entrar para aceitar
                  </Link>

                  <Link
                    href={`/auth/register?next=${encodeURIComponent(nextPath)}`}
                    className="block w-full text-center border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
                  >
                    Criar conta e aceitar
                  </Link>
                </div>
              ) : (
                invitation.status === 'pending' &&
                viewer.email?.toLowerCase() === invitation.email.toLowerCase() && (
                  <button
                    type="button"
                    onClick={acceptInvitation}
                    disabled={accepting}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {accepting ? 'Aceitando convite...' : 'Aceitar convite'}
                  </button>
                )
              )}
            </>
          ) : (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error || 'Convite nao encontrado'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
