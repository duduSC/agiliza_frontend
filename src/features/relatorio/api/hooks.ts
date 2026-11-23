/** Hook TanStack Query do relatório do dia (T010). Chave escopada pela loja da sessão (6.2). */
import { useQuery } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { buscarRelatorioDoDia } from './relatorioApi'

export const chavesRelatorio = {
  todas: (estabelecimentoId: string | null) => ['relatorio', estabelecimentoId] as const,
  dia: (estabelecimentoId: string | null, data: string) => ['relatorio', estabelecimentoId, 'dia', data] as const,
}

export function useRelatorioDoDia(data: string) {
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)
  return useQuery({
    queryKey: chavesRelatorio.dia(estabelecimentoId, data),
    queryFn: ({ signal }) => buscarRelatorioDoDia(data, signal),
    enabled: estabelecimentoId !== null,
  })
}
