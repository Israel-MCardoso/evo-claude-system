import { notFound } from 'next/navigation'
import { getCardapio } from '@/lib/cardapio/get-cardapio'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Finalizar pedido' }

export default async function CheckoutPage({ params }: { params: { slug: string } }) {
  const cardapio = await getCardapio(params.slug)
  if (!cardapio) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutForm
        restaurante_id={cardapio.id}
        slug={cardapio.slug}
        nome_restaurante={cardapio.nome}
        aceita_entrega={cardapio.aceita_entrega}
        aceita_retirada={cardapio.aceita_retirada}
      />
    </div>
  )
}
