/**
 * Hook de tempo real para o monitoramento da frota (T005, RNF06).
 * Reutiliza o cliente STOMP de shared/realtime (T004).
 * Ao receber evento de frota, invalida o cache de motoboys do monitoramento.
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import {
  conectarStomp,
  topicoFrota,
  useConexaoTempoReal,
  type EstadoConexao,
} from '@/shared/realtime'
import { chavesMotoboysMonitoramento } from './hooks'

/**
 * Conecta ao STOMP e inscreve-se no topico de frota. Invalida o cache ao
 * receber qualquer evento de frota (posicao, disponibilidade).
 * Deve ser chamado uma vez, no componente de pagina do monitoramento.
 */
export function useTempoRealFrota(): EstadoConexao {
  const queryClient = useQueryClient()
  const token = useSessaoStore((s) => s.token)
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)
  const estado = useConexaoTempoReal()
  const inscricoesRef = useRef<Array<{ unsubscribe: () => void }>>([])

  useEffect(() => {
    if (!token || !estabelecimentoId) return

    const cliente = conectarStomp(token)

    const tentarInscrever = () => {
      if (!cliente.connected) return

      inscricoesRef.current.forEach((s) => s.unsubscribe())
      inscricoesRef.current = []

      const onEvento = () => {
        void queryClient.invalidateQueries({
          queryKey: chavesMotoboysMonitoramento.todas(estabelecimentoId),
        })
      }

      const subFrota = cliente.subscribe(topicoFrota(estabelecimentoId), onEvento)
      inscricoesRef.current = [subFrota]
    }

    if (cliente.connected) {
      tentarInscrever()
    }

    const onConectadoOriginal = cliente.onConnect
    cliente.onConnect = (frame) => {
      onConectadoOriginal?.(frame)
      tentarInscrever()
    }

    return () => {
      inscricoesRef.current.forEach((s) => s.unsubscribe())
      inscricoesRef.current = []
    }
  }, [token, estabelecimentoId, queryClient])

  return estado
}
