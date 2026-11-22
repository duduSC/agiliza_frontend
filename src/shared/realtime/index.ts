/**
 * Cliente STOMP único + hooks de inscrição (AGENT.md 6.8; T004; revisto na T009).
 *
 * - `/ws` com o JWT ATUAL no CONNECT, lido a cada tentativa (o token pode ter sido renovado);
 * - reconexão com recuo exponencial; enquanto desconectado, os hooks de dados fazem polling de 15 s;
 * - as inscrições pertencem à tela montada e saem com ela; a conexão dura a sessão;
 * - logout ou troca de usuário encerra a conexão;
 * - evento só invalida o cache do TanStack Query (nunca segunda fonte de verdade).
 *
 * Só existem os tópicos `entregas` e `frota`. Assinar qualquer outro destino faz o backend fechar
 * a sessão inteira (S013), por isso não há tópico de integração: as falhas usam polling.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Client, ReconnectionTimeMode, type StompSubscription } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'

// Tópicos confirmados (S008, S013), escopados pelo estabelecimento do token.
export function topicoEntregas(estabelecimentoId: string): string {
  return `/topic/estabelecimento/${estabelecimentoId}/entregas`
}
export function topicoFrota(estabelecimentoId: string): string {
  return `/topic/estabelecimento/${estabelecimentoId}/frota`
}

export const INTERVALO_POLLING_RESERVA_MS = 15_000
const PRIMEIRO_RECUO_MS = 2_000
const RECUO_MAXIMO_MS = 30_000

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL
  if (base && base.trim() !== '') return base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

export type EstadoConexao = 'conectando' | 'conectado' | 'desconectado'

/**
 * `ressincronizar` é verdadeiro quando não houve evento, e sim a possibilidade de ter perdido
 * algum: tela que acabou de assinar ou socket que acabou de voltar.
 */
type AoReceber = (ressincronizar: boolean) => void
type Inscricao = { destino: string; aoReceber: AoReceber; noServidor: StompSubscription | null }

let clienteGlobal: Client | null = null
let estadoAtual: EstadoConexao = 'desconectado'
const ouvintes = new Set<() => void>()
const inscricoes = new Set<Inscricao>()

function mudarEstado(estado: EstadoConexao): void {
  estadoAtual = estado
  ouvintes.forEach((avisar) => avisar())
}

function assinarNoServidor(inscricao: Inscricao): void {
  if (!clienteGlobal?.connected) return
  inscricao.noServidor = clienteGlobal.subscribe(inscricao.destino, () => inscricao.aoReceber(false))
  inscricao.aoReceber(true)
}

function conectarStomp(): void {
  if (clienteGlobal) return

  let jaTentou = false
  const ehAtual = () => clienteGlobal === cliente
  const caiu = () => {
    if (!ehAtual()) return
    inscricoes.forEach((i) => (i.noServidor = null))
    mudarEstado('desconectado')
  }

  const cliente: Client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: PRIMEIRO_RECUO_MS,
    maxReconnectDelay: RECUO_MAXIMO_MS,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    connectionTimeout: 10_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    beforeConnect: (c) => {
      const token = useSessaoStore.getState().token
      c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      // Nas novas tentativas o indicador continua "offline", em vez de piscar.
      if (!jaTentou && ehAtual()) mudarEstado('conectando')
      jaTentou = true
    },
    onConnect: () => {
      if (!ehAtual()) return
      mudarEstado('conectado')
      inscricoes.forEach(assinarNoServidor)
    },
    onDisconnect: caiu,
    onStompError: caiu,
    onWebSocketClose: caiu,
  })

  clienteGlobal = cliente
  cliente.activate()
}

export function desconectarStomp(): void {
  const cliente = clienteGlobal
  if (!cliente) return
  clienteGlobal = null
  inscricoes.forEach((i) => (i.noServidor = null))
  mudarEstado('desconectado')
  void cliente.deactivate()
}

// Logout e troca de usuário: a conexão carrega o token e a loja de quem saiu (Artigo 6.2).
useSessaoStore.subscribe((atual, anterior) => {
  if (atual.usuario?.usuarioId !== anterior.usuario?.usuarioId) desconectarStomp()
})

export function obterEstadoConexao(): EstadoConexao {
  return estadoAtual
}

function ouvirEstado(avisar: () => void): () => void {
  ouvintes.add(avisar)
  return () => void ouvintes.delete(avisar)
}

/** Estado da conexão STOMP, para o indicador "tempo real offline" (RNF06) e o polling. */
export function useConexaoTempoReal(): EstadoConexao {
  return useSyncExternalStore(ouvirEstado, obterEstadoConexao)
}

/** Polling de reserva: 15 s enquanto o socket não está ativo. Reage à queda na hora. */
export function usePollingDeReserva(): number | false {
  return useConexaoTempoReal() === 'conectado' ? false : INTERVALO_POLLING_RESERVA_MS
}

/** Assina os destinos enquanto o componente está montado. */
export function useInscricoesTempoReal(assinaturas: readonly [string, AoReceber][]): EstadoConexao {
  const usuarioId = useSessaoStore((s) => s.usuario?.usuarioId)
  const estado = useConexaoTempoReal()
  const atuais = useRef(assinaturas)
  atuais.current = assinaturas
  const destinos = assinaturas.map(([destino]) => destino).join(' ')

  useEffect(() => {
    if (!usuarioId || !destinos) return
    const minhas = destinos.split(' ').map<Inscricao>((destino, i) => ({
      destino,
      aoReceber: (ressincronizar) => atuais.current[i]?.[1](ressincronizar),
      noServidor: null,
    }))
    minhas.forEach((inscricao) => {
      inscricoes.add(inscricao)
      assinarNoServidor(inscricao)
    })
    conectarStomp()

    return () => {
      minhas.forEach((inscricao) => {
        inscricoes.delete(inscricao)
        if (clienteGlobal?.connected) inscricao.noServidor?.unsubscribe()
      })
    }
  }, [usuarioId, destinos])

  return estado
}

/** Tempo real do despacho: deve ser chamado uma vez, no componente de página. */
export function useTempoRealDespacho(): EstadoConexao {
  const queryClient = useQueryClient()
  const id = useSessaoStore((s) => s.estabelecimentoId)

  // Um evento cancela a leitura em andamento, que pode ser anterior a ele; a ressincronização
  // aproveita a que já está no ar.
  const invalidar =
    (...recursos: string[]): AoReceber =>
    (ressincronizar) => {
      for (const recurso of recursos) {
        void queryClient.invalidateQueries(
          { queryKey: [recurso, id] },
          { cancelRefetch: !ressincronizar },
        )
      }
    }

  return useInscricoesTempoReal(
    id
      ? [
          [topicoEntregas(id), invalidar('entregas', 'lotes')],
          [topicoFrota(id), invalidar('motoboys')],
        ]
      : [],
  )
}
