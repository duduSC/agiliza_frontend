/**
 * Hooks TanStack Query do caixa (UC03 A3, T006).
 *
 * - Chaves escopadas pelo `estabelecimentoId` da sessao.
 * - Nenhuma escrita e otimista (Constituicao, Artigo 5.8).
 * - Caixa fechado torna o periodo imutavel (Constituicao, Artigo 5.3).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import {
  abrirCaixa,
  buscarCaixaAtual,
  fecharCaixa,
  listarCaixas,
  type AbrirCaixaRequest,
} from './caixaApi'

function useEstabelecimentoDaSessao(): string | null {
  return useSessaoStore((s) => s.estabelecimentoId)
}

export const chavesCaixa = {
  todas: (estabelecimentoId: string | null) => ['caixa', estabelecimentoId] as const,
  atual: (estabelecimentoId: string | null) => ['caixa', estabelecimentoId, 'atual'] as const,
  historico: (estabelecimentoId: string | null, dataInicio?: string, dataFim?: string) =>
    ['caixa', estabelecimentoId, 'historico', dataInicio, dataFim] as const,
}

export function useCaixaAtual() {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesCaixa.atual(estabelecimentoId),
    queryFn: ({ signal }) => buscarCaixaAtual(signal),
    enabled: estabelecimentoId !== null,
  })
}

export function useHistoricoCaixas(dataInicio?: string, dataFim?: string) {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesCaixa.historico(estabelecimentoId, dataInicio, dataFim),
    queryFn: ({ signal }) => listarCaixas(dataInicio, dataFim, signal),
    enabled: estabelecimentoId !== null,
  })
}

/**
 * Caixas que cobrem os dias dados (menor ao maior). O acerto decide ajuste, recibo e pagamento
 * pelo caixa do dia de cada um, e nao pelo de hoje.
 */
export function useCaixasDosDias(dias: readonly string[], habilitada: boolean) {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  const ordenados = [...dias].sort()
  const de = ordenados[0]
  const ate = ordenados[ordenados.length - 1]
  return useQuery({
    queryKey: chavesCaixa.historico(estabelecimentoId, de, ate),
    queryFn: ({ signal }) => listarCaixas(de, ate, signal),
    enabled: estabelecimentoId !== null && habilitada && de !== undefined,
  })
}

function useInvalidarCaixa() {
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chavesCaixa.todas(estabelecimentoId) }),
      // Mudanca de caixa afeta acerto e recibos. So os prefixos, para nao importar o modulo acerto
      // (que importa este) e criar ciclo.
      queryClient.invalidateQueries({ queryKey: ['acerto', estabelecimentoId] }),
      queryClient.invalidateQueries({ queryKey: ['recibos', estabelecimentoId] }),
    ])
  }
}

export function useAbrirCaixa() {
  const invalidar = useInvalidarCaixa()
  return useMutation({
    mutationFn: (corpo: AbrirCaixaRequest) => abrirCaixa(corpo),
    onSettled: () => invalidar(),
  })
}

export function useFecharCaixa() {
  const invalidar = useInvalidarCaixa()
  return useMutation({
    mutationFn: (id: string) => fecharCaixa(id),
    onSettled: () => invalidar(),
  })
}
