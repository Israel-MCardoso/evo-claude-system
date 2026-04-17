import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCardapio } from '@/lib/cardapio/get-cardapio'
import { CardapioView } from '@/components/cardapio/CardapioView'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const cardapio = await getCardapio(params.slug)
  if (!cardapio) return { title: 'Cardápio não encontrado' }
  return {
    title: `${cardapio.nome} — Cardápio`,
    description: `Peça agora pelo cardápio digital do ${cardapio.nome}`,
  }
}

export default async function CardapioPage({ params }: { params: { slug: string } }) {
  const cardapio = await getCardapio(params.slug)
  if (!cardapio) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <CardapioView cardapio={cardapio} />
    </div>
  )
}
