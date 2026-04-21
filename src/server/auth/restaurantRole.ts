import type { RestaurantMemberRole } from '@/types/database'

const ROLE_ALIASES: Record<string, RestaurantMemberRole> = {
  manager: 'admin',
  staff: 'operator',
}

export function normalizeRestaurantRole(role: string | null | undefined): RestaurantMemberRole {
  if (!role) return 'owner'
  return ROLE_ALIASES[role] ?? (role as RestaurantMemberRole)
}
