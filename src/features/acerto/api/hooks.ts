/**
 * Hooks TanStack Query do acerto e recibos (UC03, T006).
 *
 * - Chaves escopadas pelo `estabelecimentoId` da sessao.
 * - Nenhuma escrita e otimista (Constituicao, Artigo 5.8).
 * - Totais vem do backend, nunca somados no cliente (Constituicao, Artigo 5.1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { buscarExtrato, ajustarRepasse, listarAjustes } from './acertoApi'
import { listarRecibos, gerarRecibo, marcarReciboPago, type GerarReciboRequest } from './recibosApi'

function useEstabelecimentoDaSessao(): string | null {
  return useSessaoStore((s) => s.estabelecimentoId)
}

export const chavesAcerto = {
  todas: (estabelecimentoId: string | null) => ['acerto', estabelecimentoId] as const,
  extrato: (estabelecimentoId: string | null, motoboyId: string, inicio: string, fim: string) =>
    ['acerto', estabelecimentoId, 'extrato', motoboyId, inicio, fim] as const,
  ajustes: (estabelecimentoId: string | null, entregaId: string) =>
    ['acerto', estabelecimentoId, 'ajustes', entregaId] as const,
}

export const chavesRecibos = {
  todas: (estabelecimentoId: string | null) => ['recibos', estabelecimentoId] as const,
  porMotoboy: (estabelecimentoId: string | null, motoboyId: string) =>
    ['recibos', estabelecimentoId, motoboyId] as const,
}

export function useExtrato(motoboyId: string | null, inicio: string | null, fim: string | null) {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesAcerto.extrato(estabelecimentoId, motoboyId ?? '', inicio ?? '', fim ?? ''),
    queryFn: ({ signal }) => buscarExtrato(motoboyId!, inicio!, fim!, signal),
    enabled: estabelecimentoId !== null && motoboyId !== null && inicio !== null && fim !== null,
  })
}

export function useAjustes(entregaId: string | null) {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesAcerto.ajustes(estabelecimentoId, entregaId ?? ''),
    queryFn: ({ signal }) => listarAjustes(entregaId!, signal),
    enabled: estabelecimentoId !== null && entregaId !== null,
  })
}

export function useRecibos(motoboyId: string | null) {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesRecibos.porMotoboy(estabelecimentoId, motoboyId ?? ''),
    queryFn: ({ signal }) => listarRecibos(motoboyId!, signal),
    enabled: estabelecimentoId !== null && motoboyId !== null,
  })
}

function useInvalidarAcerto() {
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  // No sucesso e no erro (recusa costuma ser estado que mudou, como caixa fechado por outro).
  // A mutacao so termina com as listas recarregadas.
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chavesAcerto.todas(estabelecimentoId) }),
      queryClient.invalidateQueries({ queryKey: chavesRecibos.todas(estabelecimentoId) }),
      queryClient.invalidateQueries({ queryKey: ['caixa', estabelecimentoId] }),
    ])
  }
}

export function useAjustarRepasse() {
  const invalidar = useInvalidarAcerto()
  return useMutation({
    mutationFn: ({ entregaId, valorNovo, motivo }: { entregaId: string; valorNovo: number; motivo: string }) =>
      ajustarRepasse(entregaId, valorNovo, motivo),
    onSettled: () => invalidar(),
  })
}

export function useGerarRecibo() {
  const invalidar = useInvalidarAcerto()
  return useMutation({
    mutationFn: (corpo: GerarReciboRequest) => gerarRecibo(corpo),
    onSettled: () => invalidar(),
  })
}

export function useMarcarReciboPago() {
  const invalidar = useInvalidarAcerto()
  return useMutation({
    mutationFn: (id: string) => marcarReciboPago(id),
    onSettled: () => invalidar(),
  })
}
