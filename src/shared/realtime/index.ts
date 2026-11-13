/**
 * Cliente STOMP unico + hooks de inscricao (AGENT.md 6.8; T004).
 *
 * Conecta em `/ws` com JWT no header Authorization. Reconexao automatica com backoff
 * exponencial. Indicador de "tempo real offline" via `useConexaoTempoReal`.
 * Ao receber evento, invalida o cache do TanStack Query (nunca segunda fonte de verdade).
 *
 * PROVISORIO: o backend ainda nao tem WebSocket/STOMP (T006 do backend).
 */
import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'

// Topicos escopados pelo estabelecimento (AGENT.md 6.8)
export function topicoEntregas(estabelecimentoId: string): string {
  return `/topic/estabelecimento/${estabelecimentoId}/entregas`
}
export function topicoFrota(estabelecimentoId: string): string {
  return `/topic/estabelecimento/${estabelecimentoId}/frota`
}
export function topicoIntegracao(estabelecimentoId: string): string {
  return `/topic/estabelecimento/${estabelecimentoId}/integracao`
}

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL
  if (base && base.trim() !== '') {
    return base.replace(/^http/, 'ws') + '/ws'
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws`
  }
  return 'ws://localhost:8080/ws'
}

export type EstadoConexao = 'conectando' | 'conectado' | 'desconectado'

let clienteGlobal: Client | null = null
let estadoAtual: EstadoConexao = 'desconectado'
const ouvintes = new Set<(estado: EstadoConexao) => void>()

function notificarOuvintes(estado: EstadoConexao) {
  estadoAtual = estado
  ouvintes.forEach((fn) => fn(estado))
}

export function conectarStomp(token: string): Client {
  if (clienteGlobal?.active) return clienteGlobal

  const cliente = new Client({
    brokerURL: wsUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => notificarOuvintes('conectado'),
    onDisconnect: () => notificarOuvintes('desconectado'),
    onStompError: () => notificarOuvintes('desconectado'),
    onWebSocketClose: () => notificarOuvintes('desconectado'),
  })

  notificarOuvintes('conectando')
  cliente.activate()
  clienteGlobal = cliente
  return cliente
}

export function desconectarStomp(): void {
  if (clienteGlobal) {
    clienteGlobal.deactivate()
    clienteGlobal = null
    notificarOuvintes('desconectado')
  }
}

export function obterEstadoConexao(): EstadoConexao {
  return estadoAtual
}

/**
 * Hook que retorna o estado da conexao STOMP. Usado para o indicador
 * "tempo real offline" (RNF06).
 */
export function useConexaoTempoReal(): EstadoConexao {
  const [estado, setEstado] = useState<EstadoConexao>(estadoAtual)
  useEffect(() => {
    ouvintes.add(setEstado)
    // Sincronizar com o estado atual
    setEstado(estadoAtual)
    return () => {
      ouvintes.delete(setEstado)
    }
  }, [])
  return estado
}

/**
 * Hook que gerencia a conexao STOMP e invalida o cache ao receber eventos.
 * Deve ser chamado uma vez, no componente de pagina do despacho.
 */
export function useTempoRealDespacho(): EstadoConexao {
  const queryClient = useQueryClient()
  const token = useSessaoStore((s) => s.token)
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)
  const estado = useConexaoTempoReal()
  const inscricoesRef = useRef<Array<{ unsubscribe: () => void }>>([])

  useEffect(() => {
    if (!token || !estabelecimentoId) return

    const cliente = conectarStomp(token)

    // A inscricao so funciona apos conectar
    const tentarInscrever = () => {
      if (!cliente.connected) return

      // Limpar inscricoes anteriores
      inscricoesRef.current.forEach((s) => s.unsubscribe())
      inscricoesRef.current = []

      const onEvento = () => {
        // Invalida todas as queries de entregas e lotes ao receber qualquer evento
        void queryClient.invalidateQueries({ queryKey: ['entregas'] })
        void queryClient.invalidateQueries({ queryKey: ['lotes'] })
        void queryClient.invalidateQueries({ queryKey: ['motoboys'] })
      }

      const subEntregas = cliente.subscribe(topicoEntregas(estabelecimentoId), onEvento)
      const subFrota = cliente.subscribe(topicoFrota(estabelecimentoId), onEvento)
      inscricoesRef.current = [subEntregas, subFrota]
    }

    // Se ja esta conectado, inscrever imediatamente
    if (cliente.connected) {
      tentarInscrever()
    }

    // Reagir a reconexoes
    const onConectado = cliente.onConnect
    cliente.onConnect = (frame) => {
      onConectado?.(frame)
      tentarInscrever()
    }

    return () => {
      inscricoesRef.current.forEach((s) => s.unsubscribe())
      inscricoesRef.current = []
    }
  }, [token, estabelecimentoId, queryClient])

  return estado
}
