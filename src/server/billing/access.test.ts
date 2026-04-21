import assert from 'node:assert/strict'
import {
  canAccessPermissionByBillingStatus,
  getBillingAccessDeniedMessage,
} from './access-policy'

assert.equal(
  canAccessPermissionByBillingStatus('orders.manage', { status: 'past_due' }),
  true
)
assert.equal(
  canAccessPermissionByBillingStatus('settings.manage', { status: 'past_due' }),
  false
)
assert.equal(
  canAccessPermissionByBillingStatus('billing.manage', { status: 'past_due' }),
  true
)
assert.equal(
  canAccessPermissionByBillingStatus('orders.read', { status: 'suspended' }),
  true
)
assert.equal(
  canAccessPermissionByBillingStatus('orders.manage', { status: 'suspended' }),
  false
)
assert.equal(
  canAccessPermissionByBillingStatus('billing.manage', { status: 'canceled' }),
  true
)
assert.match(
  getBillingAccessDeniedMessage('settings.manage', { status: 'past_due' }) ?? '',
  /pagamento pendente/i
)
assert.match(
  getBillingAccessDeniedMessage('orders.manage', { status: 'suspended' }) ?? '',
  /modo leitura/i
)
