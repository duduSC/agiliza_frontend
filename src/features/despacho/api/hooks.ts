/**
 * Hooks TanStack Query do despacho (T003 + T004).
 *
 * - Chaves escopadas pelo `estabelecimentoId` da SESSAO (nunca de entrada do usuario --
 *   Constituicao, Artigo 6.2).
 * - Polling de 15 s como fallback enquanto STOMP desconectado (AGENT.md 6.8).
 * - Nenhuma escrita e otimista: a tela so muda depois da resposta do servidor e da
 *   invalidacao das listas (Constituicao, Artigos 5.5 e 5.8).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import type { AjustarCoordenadaRequest, CriarEntregaAvulsaRequest } from '@/shared/api'
import { usePollingDeReserva } from '@/shared/realtime'
import {
  ajustarCoordenada,
  cancelarEntrega,
  criarEntregaAvulsa,
  listarEmRevisao,
  listarEmSaida,
  listarPendentesDeDespacho,
  marcarPronto,
  resolverRevisao,
  type ResolverRevisaoRequest,
} from './entregasApi'
import { contarFalhasPendentes } from './falhasApi'
import { despacharLote, devolverLote, listarLotesDespachados, listarLotesEmRota, type DespacharLoteRequest } from './lotesApi'
import { listarEntregadoresDisponiveis } from './motoboysApi'

export const chavesEntregas = {
  todas: (estabelecimentoId: string | null) => ['entregas', estabelecimentoId] as const,
  pendentes: (estabelecimentoId: string | null) =>
    ['entregas', estabelecimentoId, 'pendentes'] as const,
  revisao: (estabelecimentoId: string | null) => ['entregas', estabelecimentoId, 'revisao'] as const,
  emSaida: (estabelecimentoId: string | null) => ['entregas', estabelecimentoId, 'emSaida'] as const,
}

export const chavesLotes = {
  todas: (estabelecimentoId: string | null) => ['lotes', estabelecimentoId] as const,
  despachados: (estabelecimentoId: string | null) =>
    ['lotes', estabelecimentoId, 'despachados'] as const,
  emRota: (estabelecimentoId: string | null) => ['lotes', estabelecimentoId, 'emRota'] as const,
}

export const chavesMotoboys = {
  todas: (estabelecimentoId: string | null) => ['motoboys', estabelecimentoId] as const,
  disponiveis: (estabelecimentoId: string | null) =>
    ['motoboys', estabelecimentoId, 'disponiveis'] as const,
}

export const chavesFalhas = {
  pendentes: (estabelecimentoId: string | null) =>
    ['falhas', estabelecimentoId, 'pendentes'] as const,
}

function useEstabelecimentoDaSessao(): string | null {
  return useSessaoStore((s) => s.estabelecimentoId)
}

export function useEntregasPendentes() {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesEntregas.pendentes(estabelecimentoId),
    queryFn: ({ signal }) => listarPendentesDeDespacho(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval,
  })
}

export function useEntregasEmRevisao() {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesEntregas.revisao(estabelecimentoId),
    queryFn: ({ signal }) => listarEmRevisao(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval,
  })
}

export function useLotesDespachados() {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesLotes.despachados(estabelecimentoId),
    queryFn: ({ signal }) => listarLotesDespachados(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval,
  })
}

/** Entregas DESPACHADA e EM_ROTA, só quando o filtro da operação as mostra (T010). */
export function useEntregasEmSaida(habilitado: boolean) {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesEntregas.emSaida(estabelecimentoId),
    queryFn: ({ signal }) => listarEmSaida(signal),
    enabled: habilitado && estabelecimentoId !== null,
    refetchInterval,
  })
}

/** Lotes EM_ROTA: junto com os DESPACHADO, dão o entregador de cada entrega em saída (T010). */
export function useLotesEmRota(habilitado: boolean) {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesLotes.emRota(estabelecimentoId),
    queryFn: ({ signal }) => listarLotesEmRota(signal),
    enabled: habilitado && estabelecimentoId !== null,
    refetchInterval,
  })
}

export function useEntregadoresDisponiveis() {
  const refetchInterval = usePollingDeReserva()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesMotoboys.disponiveis(estabelecimentoId),
    queryFn: ({ signal }) => listarEntregadoresDisponiveis(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval,
  })
}

export function useFalhasPendentes() {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesFalhas.pendentes(estabelecimentoId),
    queryFn: ({ signal }) => contarFalhasPendentes(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval: 60_000, // Falhas: polling menos frequente
  })
}

function useInvalidarDespacho() {
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  // Roda no sucesso E no erro (recusa costuma significar que o estado mudou por baixo). A mutacao
  // so termina com as listas recarregadas, entao o botao nao reabre sobre dado velho.
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chavesEntregas.todas(estabelecimentoId) }),
      queryClient.invalidateQueries({ queryKey: chavesLotes.todas(estabelecimentoId) }),
      queryClient.invalidateQueries({ queryKey: chavesMotoboys.todas(estabelecimentoId) }),
    ])
  }
}

export function useCriarEntregaAvulsa() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: (corpo: CriarEntregaAvulsaRequest) => criarEntregaAvulsa(corpo),
    onSettled: () => invalidar(),
  })
}

export function useMarcarPronto() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: (id: string) => marcarPronto(id),
    onSettled: () => invalidar(),
  })
}

export function useCancelarEntrega() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => cancelarEntrega(id, motivo),
    onSettled: () => invalidar(),
  })
}

export function useAjustarCoordenada() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: ({ id, coordenada }: { id: string; coordenada: AjustarCoordenadaRequest }) =>
      ajustarCoordenada(id, coordenada),
    onSettled: () => invalidar(),
  })
}

export function useDespacharLote() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: (corpo: DespacharLoteRequest) => despacharLote(corpo),
    onSettled: () => invalidar(),
  })
}

export function useDevolverLote() {
  const invalidar = useInvalidarDespacho()
  return useMutation({
    mutationFn: (id: string) => devolverLote(id),
    onSettled: () => invalidar(),
  })
}

/**
 * Analisar contestação (T010). Ao resolver, a entrega volta a contar no acerto: invalida também
 * acerto, recibos e caixa pelo prefixo (sem importar os módulos, para não criar ciclo).
 * Move dinheiro quando ajusta: sem otimismo (Constituição, Artigo 5.8).
 */
export function useResolverRevisao() {
  const invalidar = useInvalidarDespacho()
  const queryClient = useQueryClient()
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useMutation({
    mutationFn: ({ id, corpo }: { id: string; corpo: ResolverRevisaoRequest }) => resolverRevisao(id, corpo),
    onSettled: () =>
      Promise.all([
        invalidar(),
        queryClient.invalidateQueries({ queryKey: ['acerto', estabelecimentoId] }),
        queryClient.invalidateQueries({ queryKey: ['recibos', estabelecimentoId] }),
        queryClient.invalidateQueries({ queryKey: ['caixa', estabelecimentoId] }),
      ]),
  })
}
