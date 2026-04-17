import { CarrinhoProvider } from '@/contexts/CarrinhoContext'
import type { ReactNode } from 'react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <CarrinhoProvider>{children}</CarrinhoProvider>
}
