import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { registrarLimpezaDeCache } from '@/features/auth'
import { Toaster } from '@/shared/ui/sonner'
import { criarQueryClient } from './queryClient'

export function Providers({
  children,
  queryClient: clienteInjetado,
}: {
  children: ReactNode
  /** Injetável para testes. */
  queryClient?: QueryClient
}) {
  const [queryClient] = useState(() => clienteInjetado ?? criarQueryClient())

  // Logout e troca de usuário limpam todo o cache de dados (Constituição, Artigo 6.2).
  useEffect(() => registrarLimpezaDeCache(() => queryClient.clear()), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
