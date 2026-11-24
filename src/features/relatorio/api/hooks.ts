/** Hook TanStack Query do relatório do dia (T010). Chave escopada pela loja da sessão (6.2). */
import { useQuery } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { buscarRelatorioDoDia } from './relatorioApi'

export const chavesRelatorio = {
  todas: (estabelecimentoId: string | null) => ['relatorio', estabelecimentoId] as const,
  dia: (estabelecimentoId: string | null, data: string) => ['relatorio', estabelecimentoId, 'dia', data] as const,
}

/**
 * `staleTime: 0`: o resultado guardado aparece na hora ao voltar à tela (T010, decisão 4), mas é
 * sempre relido. Pagar um recibo ou resolver uma contestação no Acerto muda os totais, e o
 * relatório não pode mostrar o valor pago de antes (Constituição 5.1: o servidor é a fonte).
 */
export function useRelatorioDoDia(data: string) {
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)
  return useQuery({
    queryKey: chavesRelatorio.dia(estabelecimentoId, data),
    queryFn: ({ signal }) => buscarRelatorioDoDia(data, signal),
    enabled: estabelecimentoId !== null,
    staleTime: 0,
  })
}
