// Interface agnóstica de gateway de pagamento
// Facilita troca futura (Mercado Pago → Asaas ou outro)
// Sprint 02

export interface CreateChargeInput {
  pedidoId: string
  total: number
  descricao: string
  expiracaoMinutos?: number
}

export interface CreateChargeOutput {
  externalId: string
  qrCode: string
  qrCodeBase64: string
  expiraEm: Date
}

export interface PaymentGateway {
  createCharge(input: CreateChargeInput): Promise<CreateChargeOutput>
  getPaymentStatus(externalId: string): Promise<'pending' | 'approved' | 'failed'>
}
