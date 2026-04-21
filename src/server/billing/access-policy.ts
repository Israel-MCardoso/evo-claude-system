import type { RestaurantPermission } from '../auth/permissions'
import type { RestaurantSubscriptionStatus } from './subscriptions'

export type BillingAccessStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled'

export type BillingAccessTone = 'info' | 'warning' | 'danger'

export interface BillingAccessBanner {
  tone: BillingAccessTone
  title: string
  description: string
}

export function mapToBillingAccessStatus(
  sourceStatus: RestaurantSubscriptionStatus | 'missing'
): BillingAccessStatus {
  if (sourceStatus === 'trialing' || sourceStatus === 'inactive' || sourceStatus === 'missing') {
    return 'trial'
  }

  if (sourceStatus === 'active') {
    return 'active'
  }

  if (sourceStatus === 'past_due') {
    return 'past_due'
  }

  if (sourceStatus === 'canceled') {
    return 'canceled'
  }

  return 'suspended'
}

export function buildAccessBanner(status: BillingAccessStatus): BillingAccessBanner | null {
  if (status === 'past_due') {
    return {
      tone: 'warning',
      title: 'Pagamento pendente',
      description:
        'Pedidos continuam operando, mas alteracoes em cardapio, configuracoes e equipe ficam bloqueadas ate a regularizacao da assinatura.',
    }
  }

  if (status === 'suspended') {
    return {
      tone: 'danger',
      title: 'Assinatura suspensa',
      description:
        'O painel permanece em modo leitura e o billing segue disponivel para reativacao, mas acoes operacionais e administrativas estao bloqueadas.',
    }
  }

  if (status === 'canceled') {
    return {
      tone: 'danger',
      title: 'Assinatura cancelada',
      description:
        'O painel permanece em modo leitura. Reative um plano no billing para voltar a editar configuracoes e executar operacoes bloqueadas.',
    }
  }

  return null
}

export function canAccessPermissionByBillingStatus(
  permission: RestaurantPermission,
  summary: { status: BillingAccessStatus }
) {
  if (summary.status === 'trial' || summary.status === 'active') {
    return true
  }

  if (permission.endsWith('.read')) {
    return true
  }

  if (permission === 'billing.manage') {
    return true
  }

  if (summary.status === 'past_due' && permission === 'orders.manage') {
    return true
  }

  return false
}

export function getBillingAccessDeniedMessage(
  permission: RestaurantPermission,
  summary: { status: BillingAccessStatus }
) {
  if (summary.status === 'past_due') {
    if (permission === 'orders.manage') {
      return null
    }

    return 'Assinatura com pagamento pendente. Regularize o billing para voltar a editar cardapio, configuracoes e equipe.'
  }

  if (summary.status === 'suspended') {
    return 'Assinatura suspensa. O painel esta em modo leitura ate a reativacao do plano.'
  }

  if (summary.status === 'canceled') {
    return 'Assinatura cancelada. Reative um plano para desbloquear edicoes e operacoes administrativas.'
  }

  return null
}
