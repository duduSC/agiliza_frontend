/**
 * Tempo real do monitoramento da frota (T005, RNF06).
 * Ao receber evento de frota, invalida o cache de motoboys.
 */
import { useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { topicoFrota, useInscricoesTempoReal, type EstadoConexao } from '@/shared/realtime'
import { chavesMotoboysMonitoramento } from './hooks'

/** Deve ser chamado uma vez, no componente de pagina do monitoramento. */
export function useTempoRealFrota(): EstadoConexao {
  const queryClient = useQueryClient()
  const id = useSessaoStore((s) => s.estabelecimentoId)

  return useInscricoesTempoReal(
    id
      ? [
          [
            topicoFrota(id),
            (ressincronizar) =>
              void queryClient.invalidateQueries(
                { queryKey: chavesMotoboysMonitoramento.todas(id) },
                { cancelRefetch: !ressincronizar },
              ),
          ],
        ]
      : [],
  )
}
