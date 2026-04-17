import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Evo',
  description: 'Cardápio digital e gestão de pedidos para restaurantes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
