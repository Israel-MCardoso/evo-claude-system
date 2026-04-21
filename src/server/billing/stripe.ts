import Stripe from 'stripe'

let stripeClient: InstanceType<typeof Stripe> | null = null

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StripeConfigurationError'
  }
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!secretKey) {
    throw new StripeConfigurationError('Stripe nao configurado neste ambiente')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      appInfo: {
        name: 'evo-claude-system',
      },
    })
  }

  return stripeClient
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!webhookSecret) {
    throw new StripeConfigurationError('Webhook da Stripe nao configurado neste ambiente')
  }

  return webhookSecret
}

export function getBillingBaseUrl(request?: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '')
  }

  if (request) {
    const requestUrl = new URL(request.url)
    return `${requestUrl.protocol}//${requestUrl.host}`
  }

  return 'http://localhost:3000'
}

export function getBillingTrialPeriodDays() {
  const rawValue = process.env.STRIPE_BILLING_TRIAL_DAYS?.trim()
  if (!rawValue) return 0

  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }

  return Math.floor(parsed)
}
