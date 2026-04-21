import { getStripeClient, isStripeConfigured } from '@/server/billing/stripe'

export type BillingPlanKey = 'starter' | 'pro'

export interface BillingPlan {
  key: BillingPlanKey
  name: string
  description: string
  featured: boolean
  priceId: string | null
  amount: number | null
  currency: string | null
  interval: string | null
  available: boolean
}

const PLAN_DEFINITIONS: Array<{
  key: BillingPlanKey
  name: string
  description: string
  featured: boolean
  envKey: string
}> = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'Base para operar o restaurante com onboarding, cardapio e pedidos.',
    featured: false,
    envKey: 'STRIPE_PRICE_STARTER_MONTHLY',
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Plano para operacao recorrente com equipe, entrega e crescimento comercial.',
    featured: true,
    envKey: 'STRIPE_PRICE_PRO_MONTHLY',
  },
]

function getConfiguredPriceId(envKey: string) {
  return process.env[envKey]?.trim() || null
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  const stripeEnabled = isStripeConfigured()
  const stripe = stripeEnabled ? getStripeClient() : null

  return Promise.all(
    PLAN_DEFINITIONS.map(async (definition) => {
      const priceId = getConfiguredPriceId(definition.envKey)

      if (!stripe || !priceId) {
        return {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          featured: definition.featured,
          priceId,
          amount: null,
          currency: null,
          interval: null,
          available: false,
        }
      }

      try {
        const price = await stripe.prices.retrieve(priceId)

        return {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          featured: definition.featured,
          priceId,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null,
          available: price.active,
        }
      } catch (error) {
        console.error('[billing][plans] erro ao buscar price na Stripe:', {
          plan_key: definition.key,
          price_id: priceId,
          error,
        })

        return {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          featured: definition.featured,
          priceId,
          amount: null,
          currency: null,
          interval: null,
          available: false,
        }
      }
    })
  )
}

export async function getBillingPlanByKey(planKey: string) {
  const plans = await listBillingPlans()
  return plans.find((plan) => plan.key === planKey) ?? null
}

export function getKnownBillingPlanKeys() {
  return PLAN_DEFINITIONS.map((definition) => definition.key)
}
