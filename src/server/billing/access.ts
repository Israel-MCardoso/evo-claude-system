import {
  getRestaurantSubscription,
  type RestaurantSubscriptionRecord,
  type RestaurantSubscriptionStatus,
} from './subscriptions'
import {
  buildAccessBanner,
  canAccessPermissionByBillingStatus,
  getBillingAccessDeniedMessage,
  mapToBillingAccessStatus,
  type BillingAccessBanner,
  type BillingAccessStatus,
} from './access-policy'

export interface RestaurantBillingAccessSummary {
  status: BillingAccessStatus
  sourceStatus: RestaurantSubscriptionStatus | 'missing'
  migrationRequired: boolean
  subscription: RestaurantSubscriptionRecord | null
  banner: BillingAccessBanner | null
}

export async function getRestaurantBillingAccessSummary(restaurantId: string) {
  const subscriptionResult = await getRestaurantSubscription(restaurantId)

  if (subscriptionResult.migrationRequired) {
    return {
      status: 'active' as const,
      sourceStatus: 'missing' as const,
      migrationRequired: true,
      subscription: null,
      banner: null,
    }
  }

  const sourceStatus = subscriptionResult.data?.subscription_status ?? 'missing'
  const status = mapToBillingAccessStatus(sourceStatus)

  return {
    status,
    sourceStatus,
    migrationRequired: false,
    subscription: subscriptionResult.data,
    banner: buildAccessBanner(status),
  } satisfies RestaurantBillingAccessSummary
}
export {
  canAccessPermissionByBillingStatus,
  getBillingAccessDeniedMessage,
  mapToBillingAccessStatus,
} from './access-policy'
