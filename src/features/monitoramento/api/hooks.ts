/**
 * Hooks TanStack Query do monitoramento (T005, UC04 HU08).
 *
 * - Chaves escopadas pelo `estabelecimentoId` da sessao (Constituicao 6.2).
 * - Polling de 15 s como fallback enquanto STOMP desconectado (AGENT.md 6.8).
 * - Somente consulta: nenhuma mutacao nesta tela.
 */
import { useQuery } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { obterEstadoConexao } from '@/shared/realtime'
import { listarEntregadoresNoMapa } from './motoboysMonitoramentoApi'

export const INTERVALO_POLLING_FROTA_MS = 15_000

/** Polling ativo apenas quando STOMP desconectado. */
function intervaloPolling(): number | false {
  return obterEstadoConexao() === 'conectado' ? false : INTERVALO_POLLING_FROTA_MS
}

export const chavesMotoboysMonitoramento = {
  todas: (estabelecimentoId: string | null) => ['motoboys', estabelecimentoId] as const,
  noMapa: (estabelecimentoId: string | null) =>
    ['motoboys', estabelecimentoId, 'monitoramento'] as const,
}

function useEstabelecimentoDaSessao(): string | null {
  return useSessaoStore((s) => s.estabelecimentoId)
}

/**
 * Entregadores ONLINE e EM_ROTA com posicao, para o mapa de monitoramento.
 */
export function useEntregadoresNoMapa() {
  const estabelecimentoId = useEstabelecimentoDaSessao()
  return useQuery({
    queryKey: chavesMotoboysMonitoramento.noMapa(estabelecimentoId),
    queryFn: ({ signal }) => listarEntregadoresNoMapa(signal),
    enabled: estabelecimentoId !== null,
    refetchInterval: intervaloPolling,
  })
}
