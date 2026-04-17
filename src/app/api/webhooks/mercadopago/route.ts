// Sprint 02 — POST /api/webhooks/mercadopago
// Callback de pagamento aprovado pelo Mercado Pago
// Valida assinatura HMAC-SHA256 + idempotência

import { NextResponse } from 'next/server'

export async function POST(_request: Request) {
  // TODO: implementar em Sprint 02
  return NextResponse.json({ received: true })
}
