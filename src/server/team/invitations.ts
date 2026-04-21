import { createHash, randomBytes } from 'crypto'

export type RestaurantMemberRole = 'owner' | 'admin' | 'operator' | 'viewer'
export type TeamInvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired'

const INVITATION_EXPIRATION_DAYS = 7

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

export function generateInvitationToken() {
  return randomBytes(32).toString('hex')
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function buildInvitationExpiry() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS)
  return expiresAt.toISOString()
}

export function buildInvitationLink(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  return `${appUrl}/auth/invite?token=${encodeURIComponent(token)}`
}
