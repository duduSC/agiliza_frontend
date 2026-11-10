import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/shared/ui/sonner'
import { criarQueryClient } from './queryClient'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(criarQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
