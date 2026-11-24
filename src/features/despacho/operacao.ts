/**
 * Regras puras da operação unificada (T010, D013 decisão 3): Despacho + Monitoramento na mesma tela.
 *
 * - `montarItensOperacao` numera os pedidos visíveis: o número do círculo no mapa é o número do
 *   card na coluna à direita. Sem dinheiro: só repassa o que veio do servidor.
 * - `estadoNoMapa` decide o ícone do entregador (UC04, HU08 e A1).
 * O filtro em si fica em `filtroOperacaoStore.ts`.
 */
import { posicaoDesatualizada } from '@/features/monitoramento'
import type { EntregaResponse, LoteEntregaResponse, MotoboyResponse } from '@/shared/api'
import { LABEL_STATUS_DISPONIBILIDADE_MOTOBOY } from '@/shared/dominio'
import type { EstadoEntregadorNoMapa } from '@/shared/ui/mapa/iconesOperacao'
import { filtroMostraAguardando, filtroMostraSaidas, type FiltroOperacao } from './filtroOperacaoStore'

export type ItemOperacao = {
  numero: number
  entrega: EntregaResponse
  /** `true` para DESPACHADA ou EM_ROTA: não selecionável, mostra o entregador. */
  emSaida: boolean
  /** Nome do entregador do lote (só em saída); `null` se o lote ou o entregador não vierem. */
  entregador: string | null
}

function saiu(entrega: EntregaResponse): boolean {
  return entrega.status === 'DESPACHADA' || entrega.status === 'EM_ROTA'
}

/**
 * Lista numerada da operação: as que aguardam despacho primeiro, na ordem do servidor (a mais
 * antiga antes), depois as que saíram.
 *
 * - Aguardando em revisão nunca entra: tem a própria lista e não pode ser despachada (5.4).
 * - A que saiu entra mesmo se estiver em revisão: ela está na rua, com um entregador.
 * - O entregador vem do lote (`loteId` → `motoboyId`) e o nome, da frota. Durante o lote o
 *   backend deixa o entregador EM_ROTA (`LoteEntregaServiceImpl.despachar`), então ele está na frota.
 */
export function montarItensOperacao(params: {
  filtro: FiltroOperacao
  pendentes: readonly EntregaResponse[]
  emSaida: readonly EntregaResponse[]
  lotes: readonly LoteEntregaResponse[]
  entregadores: readonly MotoboyResponse[]
}): ItemOperacao[] {
  const { filtro, pendentes, emSaida, lotes, entregadores } = params
  const motoboyDoLote = new Map(lotes.map((l) => [l.id, l.motoboyId]))
  const nomeDoMotoboy = new Map(entregadores.map((m) => [m.id, m.nome]))

  const aguardando = filtroMostraAguardando(filtro)
    ? pendentes.filter((e) => e.status === 'AGUARDANDO_DESPACHO' && !e.pendenteRevisao)
    : []
  const saidas = filtroMostraSaidas(filtro) ? emSaida.filter(saiu) : []

  return [
    ...aguardando.map((entrega) => ({ entrega, emSaida: false, entregador: null })),
    ...saidas.map((entrega) => {
      const motoboyId = entrega.loteId ? motoboyDoLote.get(entrega.loteId) : undefined
      return { entrega, emSaida: true, entregador: (motoboyId && nomeDoMotoboy.get(motoboyId)) || null }
    }),
  ].map((item, i) => ({ ...item, numero: i + 1 }))
}

/** Nome de quem tem o lote, pela frota; `null` se ele não estiver nela. */
export function nomeDoEntregador(
  motoboyId: string,
  entregadores: readonly MotoboyResponse[] | undefined,
): string | null {
  return entregadores?.find((m) => m.id === motoboyId)?.nome ?? null
}

/** Sem sinal há mais de 3 min vence o status (UC04 A1); depois, em rota ou disponível. */
export function estadoNoMapa(entregador: MotoboyResponse, agora: Date): EstadoEntregadorNoMapa {
  if (posicaoDesatualizada(entregador.ultimaPosicaoEm, agora)) return 'SEM_SINAL'
  return entregador.statusDisponibilidade === 'EM_ROTA' ? 'EM_ROTA' : 'ONLINE'
}

export const ROTULO_ESTADO_ENTREGADOR: Readonly<Record<EstadoEntregadorNoMapa, string>> = {
  ONLINE: LABEL_STATUS_DISPONIBILIDADE_MOTOBOY.ONLINE,
  EM_ROTA: LABEL_STATUS_DISPONIBILIDADE_MOTOBOY.EM_ROTA,
  SEM_SINAL: 'Sem sinal',
}
