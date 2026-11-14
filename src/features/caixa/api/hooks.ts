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
import { chavesAcerto, chavesRecibos } from '@/features/acerto/api/hooks'

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

function useInvalidarCaixa() {
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return () => {
    void queryClient.invalidateQueries({ queryKey: chavesCaixa.todas(estabelecimentoId) })
    // Mudanca de caixa afeta acerto e recibos (ex.: fechar caixa bloqueia acoes)
    void queryClient.invalidateQueries({ queryKey: chavesAcerto.todas(estabelecimentoId) })
    void queryClient.invalidateQueries({ queryKey: chavesRecibos.todas(estabelecimentoId) })
  }
}

export function useAbrirCaixa() {
  const invalidar = useInvalidarCaixa()
  return useMutation({
    mutationFn: (corpo: AbrirCaixaRequest) => abrirCaixa(corpo),
    onSuccess: () => invalidar(),
  })
}

export function useFecharCaixa() {
  const invalidar = useInvalidarCaixa()
  return useMutation({
    mutationFn: (id: string) => fecharCaixa(id),
    onSuccess: () => invalidar(),
  })
}
