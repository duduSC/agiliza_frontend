/**
 * Máquina de estados da ENTREGA (DVP 1.4.4) e ações que o Backoffice pode oferecer
 * a partir de cada status (AGENT.md, seção 6.2; Constituição, Artigo 5.5).
 *
 * A interface só oferece o que está aqui e nunca muda o status localmente sem a
 * confirmação do servidor — estas funções decidem o que MOSTRAR, não o que acontece.
 */
import type { StatusEntrega } from './enums'

/** Transições permitidas exatamente como no DVP 1.4.4. */
export const TRANSICOES_ENTREGA: Readonly<Record<StatusEntrega, readonly StatusEntrega[]>> = {
  AGUARDANDO_DESPACHO: ['DESPACHADA', 'CANCELADA'],
  DESPACHADA: ['EM_ROTA', 'AGUARDANDO_DESPACHO', 'CANCELADA'],
  EM_ROTA: ['ENTREGUE', 'FALHA', 'CANCELADA'],
  ENTREGUE: [],
  FALHA: [],
  CANCELADA: [],
}

export const ACOES_ENTREGA = [
  'MARCAR_PRONTO',
  'AJUSTAR_PINO',
  'INCLUIR_EM_LOTE',
  'DEVOLVER_LOTE',
  'CANCELAR',
  'AJUSTAR_REPASSE',
] as const
export type AcaoEntrega = (typeof ACOES_ENTREGA)[number]

export const LABEL_ACAO_ENTREGA: Record<AcaoEntrega, string> = {
  MARCAR_PRONTO: 'Marcar pronto',
  AJUSTAR_PINO: 'Ajustar pino',
  INCLUIR_EM_LOTE: 'Incluir em lote',
  DEVOLVER_LOTE: 'Devolver lote',
  CANCELAR: 'Cancelar entrega',
  AJUSTAR_REPASSE: 'Ajustar repasse',
}

/**
 * Ações do Backoffice por status (AGENT.md 6.2).
 *
 * `AJUSTAR_REPASSE` nos estados finais é só a condição de STATUS. A tela que oferecer
 * o ajuste ainda precisa checar `reciboId === null` e caixa `ABERTO`/`REABERTO`
 * (Constituição, Artigo 5.2) — isso fica na feature de acerto.
 */
const ACOES_POR_STATUS: Readonly<Record<StatusEntrega, readonly AcaoEntrega[]>> = {
  AGUARDANDO_DESPACHO: ['MARCAR_PRONTO', 'AJUSTAR_PINO', 'INCLUIR_EM_LOTE', 'CANCELAR'],
  DESPACHADA: ['DEVOLVER_LOTE', 'CANCELAR'],
  EM_ROTA: ['CANCELAR'],
  ENTREGUE: ['AJUSTAR_REPASSE'],
  FALHA: ['AJUSTAR_REPASSE'],
  CANCELADA: ['AJUSTAR_REPASSE'],
}

export function acoesPermitidas(status: StatusEntrega): readonly AcaoEntrega[] {
  return ACOES_POR_STATUS[status]
}

export function podeTransicionar(de: StatusEntrega, para: StatusEntrega): boolean {
  return TRANSICOES_ENTREGA[de].includes(para)
}

export function ehStatusFinal(status: StatusEntrega): boolean {
  return TRANSICOES_ENTREGA[status].length === 0
}
