import { getCurrentRestaurantAccess, type CurrentRestaurantAccess } from '@/server/auth/getCurrentRestaurantAccess'
import {
  canAccessPermissionByBillingStatus,
  getBillingAccessDeniedMessage,
  getRestaurantBillingAccessSummary,
} from '@/server/billing/access'
import { logWarn } from '@/server/observability/logger'
import type { RestaurantMemberRole } from '@/types/database'

export type RestaurantPermission =
  | 'orders.read'
  | 'orders.manage'
  | 'catalog.read'
  | 'catalog.manage'
  | 'settings.read'
  | 'settings.manage'
  | 'team.read'
  | 'team.manage'
  | 'billing.read'
  | 'billing.manage'

const ROLE_PERMISSIONS: Record<RestaurantMemberRole, RestaurantPermission[]> = {
  owner: [
    'orders.read',
    'orders.manage',
    'catalog.read',
    'catalog.manage',
    'settings.read',
    'settings.manage',
    'team.read',
    'team.manage',
    'billing.read',
    'billing.manage',
  ],
  admin: [
    'orders.read',
    'orders.manage',
    'catalog.read',
    'catalog.manage',
    'settings.read',
    'settings.manage',
    'team.read',
    'billing.read',
  ],
  operator: ['orders.read', 'orders.manage'],
  viewer: ['orders.read'],
}

export class RestaurantPermissionError extends Error {
  constructor(public status: 401 | 402 | 403, message: string) {
    super(message)
    this.name = 'RestaurantPermissionError'
  }
}

export function hasRestaurantPermission(
  role: RestaurantMemberRole,
  permission: RestaurantPermission
) {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function listRestaurantPermissions(role: RestaurantMemberRole) {
  return ROLE_PERMISSIONS[role]
}

export async function requireRestaurantPermission(
  permission: RestaurantPermission
): Promise<CurrentRestaurantAccess> {
  let access: CurrentRestaurantAccess

  try {
    access = await getCurrentRestaurantAccess()
  } catch {
    logWarn('auth.permission.denied', {
      reason: 'unauthenticated',
      permission,
    })
    throw new RestaurantPermissionError(401, 'Nao autenticado')
  }

  if (!hasRestaurantPermission(access.role, permission)) {
    logWarn('auth.permission.denied', {
      reason: 'role',
      permission,
      restaurant_id: access.restauranteId,
      actor_user_id: access.user.id,
      actor_role: access.role,
    })
    throw new RestaurantPermissionError(403, 'Acesso negado')
  }

  const billingAccess = await getRestaurantBillingAccessSummary(access.restauranteId)
  if (!canAccessPermissionByBillingStatus(permission, billingAccess)) {
    logWarn('auth.permission.denied', {
      reason: 'billing_status',
      permission,
      restaurant_id: access.restauranteId,
      actor_user_id: access.user.id,
      actor_role: access.role,
      billing_status: billingAccess.status,
    })
    throw new RestaurantPermissionError(
      402,
      getBillingAccessDeniedMessage(permission, billingAccess) ??
        'Assinatura sem permissao para executar esta acao'
    )
  }

  return access
}
