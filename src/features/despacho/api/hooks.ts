/**
 * Hooks TanStack Query do despacho (T003).
 *
 * - Chaves escopadas pelo `estabelecimentoId` da SESSÃO (nunca de entrada do usuário —
 *   Constituição, Artigo 6.2).
 * - Polling de 15 s como fallback enquanto não há tempo real (AGENT.md 6.8; WebSocket é F3).
 * - Nenhuma escrita é otimista: a tela só muda depois da resposta do servidor e da
 *   invalidação das listas (Constituição, Artigos 5.5 e 5.8).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import type { AjustarCoordenadaRequest, CriarEntregaAvulsaRequest } from '@/shared/api'
import {
  ajustarCoordenada,
  cancelarEntrega,
  criarEntregaAvulsa,
  listarEmRevisao,
  listarPendentesDeDespacho,
  marcarPronto,
} from './entregasApi'

export const INTERVALO_POLLING_MS = 15_000

export const chavesEntregas = {
  todas: (estabelecimentoId: string | null) => ['entregas', estabelecimentoId] as const,
  pendentes: (estabelecimentoId: string | null) =>
    ['entregas', estabelecimentoId, 'pendentes'] as const,
  revisao: (estabelecimentoId: string | null) => ['entregas', estabelecimentoId, 'revisao'] as const,
}

function useEstabelecimentoDaSessao(): string | null {
  return useSessaoStore((s) => s.estabelecimentoId)
}

export function useEntregasPendentes() {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesEntregas.pendentes(estabelecimentoId),
    queryFn: ({ signal }) => listarPendentesDeDespacho(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval: INTERVALO_POLLING_MS,
  })
}

export function useEntregasEmRevisao() {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesEntregas.revisao(estabelecimentoId),
    queryFn: ({ signal }) => listarEmRevisao(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval: INTERVALO_POLLING_MS,
  })
}

function useInvalidarEntregas() {
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return () => queryClient.invalidateQueries({ queryKey: chavesEntregas.todas(estabelecimentoId) })
}

export function useCriarEntregaAvulsa() {
  const invalidar = useInvalidarEntregas()
  return useMutation({
    mutationFn: (corpo: CriarEntregaAvulsaRequest) => criarEntregaAvulsa(corpo),
    onSuccess: () => invalidar(),
  })
}

export function useMarcarPronto() {
  const invalidar = useInvalidarEntregas()
  return useMutation({
    mutationFn: (id: string) => marcarPronto(id),
    onSuccess: () => invalidar(),
  })
}

export function useCancelarEntrega() {
  const invalidar = useInvalidarEntregas()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => cancelarEntrega(id, motivo),
    onSuccess: () => invalidar(),
  })
}

export function useAjustarCoordenada() {
  const invalidar = useInvalidarEntregas()
  return useMutation({
    mutationFn: ({ id, coordenada }: { id: string; coordenada: AjustarCoordenadaRequest }) =>
      ajustarCoordenada(id, coordenada),
    onSuccess: () => invalidar(),
  })
}
