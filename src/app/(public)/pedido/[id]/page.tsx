import type { Metadata } from 'next'
import { TrackingView } from '@/components/pedido/TrackingView'

export const metadata: Metadata = { title: 'Acompanhar pedido' }

export default function TrackingPage({ params }: { params: { id: string } }) {
  return <TrackingView pedidoId={params.id} />
}
