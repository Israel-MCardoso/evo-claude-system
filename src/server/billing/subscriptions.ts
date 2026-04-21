import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isMissingTableError } from '@/server/admin/schemaFallback'
import type { BillingPlanKey } from '@/server/billing/plans'

export type RestaurantSubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

export interface RestaurantSubscriptionRecord {
  id: string
  restaurant_id: string
  provider: 'stripe'
  plan_key: string
  subscription_status: RestaurantSubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  billing_email: string | null
  currency: string | null
  interval: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  next_billing_at: string | null
  cancel_at_period_end: boolean
  last_invoice_status: string | null
  last_invoice_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type QueryLikeError = {
  message?: string
  details?: string
  code?: string
}

type StripeSubscriptionLike = {
  id: string
  status: string
  cancel_at_period_end: boolean
  trial_end?: number | null
  metadata: Record<string, string>
  customer: string | { id: string } | null
  items: {
    data: Array<{
      current_period_start?: number
      current_period_end?: number
      price?: {
        id?: string | null
        currency?: string | null
        lookup_key?: string | null
        recurring?: {
          interval?: string | null
        } | null
      } | null
    }>
  }
  latest_invoice?: string | { id: string; status?: string | null } | null
}

const DEFAULT_SUBSCRIPTION: Omit<
  RestaurantSubscriptionRecord,
  'id' | 'created_at' | 'updated_at' | 'restaurant_id'
> = {
  provider: 'stripe',
  plan_key: 'starter',
  subscription_status: 'inactive',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  billing_email: null,
  currency: null,
  interval: null,
  trial_ends_at: null,
  current_period_start: null,
  current_period_end: null,
  next_billing_at: null,
  cancel_at_period_end: false,
  last_invoice_status: null,
  last_invoice_id: null,
  metadata: {},
}

function isUniqueViolation(error: QueryLikeError | null | undefined) {
  return error?.code === '23505'
}

function toIsoDate(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null
}

function getPriceFromSubscription(subscription: StripeSubscriptionLike) {
  return subscription.items.data[0]?.price ?? null
}

function getCurrentPeriodStart(subscription: StripeSubscriptionLike) {
  return subscription.items.data[0]?.current_period_start ?? null
}

function getCurrentPeriodEnd(subscription: StripeSubscriptionLike) {
  return subscription.items.data[0]?.current_period_end ?? null
}

function getPlanKeyFromSubscription(subscription: StripeSubscriptionLike) {
  const metadataPlan = subscription.metadata?.plan_key?.trim()
  if (metadataPlan) {
    return metadataPlan
  }

  const priceLookupKey = getPriceFromSubscription(subscription)?.lookup_key?.trim()
  if (priceLookupKey) {
    return priceLookupKey
  }

  return 'starter'
}

function normalizeSubscriptionStatus(status: string): RestaurantSubscriptionStatus {
  if (
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete' ||
    status === 'incomplete_expired' ||
    status === 'paused'
  ) {
    return status
  }

  return 'inactive'
}

function buildSubscriptionUpdateFromStripe(
  subscription: StripeSubscriptionLike,
  overrides?: {
    restaurantId?: string
    customerId?: string | null
    billingEmail?: string | null
  }
) {
  const price = getPriceFromSubscription(subscription)
  const latestInvoice =
    typeof subscription.latest_invoice === 'object' && subscription.latest_invoice
      ? subscription.latest_invoice
      : null

  return {
    restaurant_id: overrides?.restaurantId ?? subscription.metadata.restaurant_id,
    provider: 'stripe' as const,
    plan_key: getPlanKeyFromSubscription(subscription),
    subscription_status: normalizeSubscriptionStatus(subscription.status),
    stripe_customer_id:
      overrides?.customerId ??
      (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null),
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id ?? null,
    billing_email: overrides?.billingEmail ?? null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
    trial_ends_at: toIsoDate(subscription.trial_end),
    current_period_start: toIsoDate(getCurrentPeriodStart(subscription)),
    current_period_end: toIsoDate(getCurrentPeriodEnd(subscription)),
    next_billing_at: toIsoDate(getCurrentPeriodEnd(subscription)),
    cancel_at_period_end: subscription.cancel_at_period_end,
    last_invoice_status: latestInvoice?.status ?? null,
    last_invoice_id: latestInvoice?.id ?? null,
    metadata: subscription.metadata ?? {},
  }
}

export async function getRestaurantSubscription(restaurantId: string) {
  const admin = createSupabaseAdminClient()
  const result = await admin
    .from('restaurant_subscriptions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (result.error) {
    if (isMissingTableError(result.error, 'restaurant_subscriptions')) {
      return {
        data: null,
        migrationRequired: true,
      }
    }

    throw result.error
  }

  return {
    data: (result.data as RestaurantSubscriptionRecord | null) ?? null,
    migrationRequired: false,
  }
}

export async function ensureRestaurantSubscription(
  restaurantId: string,
  options?: {
    billingEmail?: string | null
    planKey?: BillingPlanKey
  }
) {
  const existing = await getRestaurantSubscription(restaurantId)
  if (existing.migrationRequired) {
    return existing
  }

  if (existing.data) {
    return existing
  }

  const admin = createSupabaseAdminClient()
  const insertResult = await admin
    .from('restaurant_subscriptions')
    .insert({
      restaurant_id: restaurantId,
      ...DEFAULT_SUBSCRIPTION,
      plan_key: options?.planKey ?? DEFAULT_SUBSCRIPTION.plan_key,
      billing_email: options?.billingEmail ?? DEFAULT_SUBSCRIPTION.billing_email,
    })
    .select('*')
    .single()

  if (insertResult.error) {
    if (isUniqueViolation(insertResult.error)) {
      return getRestaurantSubscription(restaurantId)
    }

    if (isMissingTableError(insertResult.error, 'restaurant_subscriptions')) {
      return {
        data: null,
        migrationRequired: true,
      }
    }

    throw insertResult.error
  }

  return {
    data: insertResult.data as RestaurantSubscriptionRecord,
    migrationRequired: false,
  }
}

export async function updateRestaurantStripeCustomer(
  restaurantId: string,
  payload: {
    stripeCustomerId: string
    billingEmail?: string | null
  }
) {
  const admin = createSupabaseAdminClient()
  const result = await admin
    .from('restaurant_subscriptions')
    .upsert(
      {
        restaurant_id: restaurantId,
        ...DEFAULT_SUBSCRIPTION,
        stripe_customer_id: payload.stripeCustomerId,
        billing_email: payload.billingEmail ?? null,
      },
      {
        onConflict: 'restaurant_id',
      }
    )
    .select('*')
    .single()

  if (result.error) {
    throw result.error
  }

  return result.data as RestaurantSubscriptionRecord
}

export async function syncSubscriptionFromStripe(
  subscription: StripeSubscriptionLike,
  overrides?: {
    restaurantId?: string
    billingEmail?: string | null
  }
) {
  const payload = buildSubscriptionUpdateFromStripe(subscription, overrides)
  const restaurantId = payload.restaurant_id

  if (!restaurantId) {
    throw new Error(`Webhook Stripe sem restaurant_id para subscription ${subscription.id}`)
  }

  const admin = createSupabaseAdminClient()
  const result = await admin
    .from('restaurant_subscriptions')
    .upsert(
      {
        ...DEFAULT_SUBSCRIPTION,
        ...payload,
      },
      {
        onConflict: 'restaurant_id',
      }
    )
    .select('*')
    .single()

  if (result.error) {
    throw result.error
  }

  return result.data as RestaurantSubscriptionRecord
}

export async function syncCheckoutSessionCustomer(payload: {
  restaurantId: string
  customerId: string
  subscriptionId?: string | null
  billingEmail?: string | null
  planKey?: string | null
}) {
  const admin = createSupabaseAdminClient()
  const result = await admin
    .from('restaurant_subscriptions')
    .upsert(
      {
        restaurant_id: payload.restaurantId,
        ...DEFAULT_SUBSCRIPTION,
        stripe_customer_id: payload.customerId,
        stripe_subscription_id: payload.subscriptionId ?? null,
        billing_email: payload.billingEmail ?? null,
        plan_key: payload.planKey ?? DEFAULT_SUBSCRIPTION.plan_key,
        subscription_status:
          payload.subscriptionId != null ? 'incomplete' : DEFAULT_SUBSCRIPTION.subscription_status,
      },
      {
        onConflict: 'restaurant_id',
      }
    )
    .select('*')
    .single()

  if (result.error) {
    throw result.error
  }

  return result.data as RestaurantSubscriptionRecord
}

export async function findRestaurantByStripeReferences(payload: {
  subscriptionId?: string | null
  customerId?: string | null
}) {
  const admin = createSupabaseAdminClient()

  if (payload.subscriptionId) {
    const subscriptionResult = await admin
      .from('restaurant_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', payload.subscriptionId)
      .maybeSingle()

    if (subscriptionResult.error) {
      throw subscriptionResult.error
    }

    if (subscriptionResult.data) {
      return subscriptionResult.data as RestaurantSubscriptionRecord
    }
  }

  if (payload.customerId) {
    const customerResult = await admin
      .from('restaurant_subscriptions')
      .select('*')
      .eq('stripe_customer_id', payload.customerId)
      .maybeSingle()

    if (customerResult.error) {
      throw customerResult.error
    }

    if (customerResult.data) {
      return customerResult.data as RestaurantSubscriptionRecord
    }
  }

  return null
}

export async function markWebhookEventProcessed(eventId: string, eventType: string, payload: unknown) {
  const admin = createSupabaseAdminClient()
  const result = await admin.from('billing_webhook_events').insert({
    provider: 'stripe',
    event_id: eventId,
    event_type: eventType,
    payload,
  })

  if (!result.error) {
    return true
  }

  if (isUniqueViolation(result.error)) {
    return false
  }

  throw result.error
}
