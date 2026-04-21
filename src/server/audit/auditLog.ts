import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isMissingTableError } from '@/server/admin/schemaFallback'
import { logError, logWarn } from '@/server/observability/logger'

interface AuditActor {
  userId?: string | null
  email?: string | null
  role?: string | null
}

interface AuditTarget {
  type?: string | null
  id?: string | null
}

interface AuditRequestContext {
  ipAddress?: string | null
  userAgent?: string | null
}

interface AuditLogInput {
  action: string
  status?: 'success' | 'failure'
  restaurantId?: string | null
  actor?: AuditActor | null
  target?: AuditTarget | null
  request?: AuditRequestContext | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditLogInput) {
  const admin = createSupabaseAdminClient()
  const result = await admin.from('audit_logs').insert({
    action: input.action,
    actor_user_id: input.actor?.userId ?? null,
    actor_email: input.actor?.email ?? null,
    actor_role: input.actor?.role ?? null,
    restaurant_id: input.restaurantId ?? null,
    target_type: input.target?.type ?? null,
    target_id: input.target?.id ?? null,
    status: input.status ?? 'success',
    ip_address: input.request?.ipAddress ?? null,
    user_agent: input.request?.userAgent ?? null,
    metadata: input.metadata ?? {},
  })

  if (!result.error) {
    return
  }

  if (isMissingTableError(result.error, 'audit_logs')) {
    logWarn('audit.write.skipped_missing_table', {
      action: input.action,
      restaurant_id: input.restaurantId ?? null,
    })
    return
  }

  logError('audit.write.failed', {
    action: input.action,
    restaurant_id: input.restaurantId ?? null,
    error: result.error,
  })
}
