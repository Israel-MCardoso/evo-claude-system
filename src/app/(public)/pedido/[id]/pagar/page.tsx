import type { Metadata } from 'next'
import { PagarView } from '@/components/pedido/PagarView'

export const metadata: Metadata = { title: 'Pagamento PIX' }

export default function PagarPage({ params }: { params: { id: string } }) {
  return <PagarView pedidoId={params.id} />
}
