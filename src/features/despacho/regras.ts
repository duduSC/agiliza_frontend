/**
 * Regras de exibição do despacho (T003). Decidem o que MOSTRAR — quem valida de fato é
 * o backend (Constituição, Artigo 5.5).
 */
import { differenceInMinutes } from 'date-fns'
import type { EntregaResponse } from '@/shared/api'
import { acoesPermitidas, LABEL_FORMA_PAGAMENTO } from '@/shared/dominio'
import { formatarMoeda, instanteDeLocalDateTime, VALOR_INDEFINIDO } from '@/shared/formatacao'

type EntregaParaRegra = Pick<
  EntregaResponse,
  'status' | 'pendenteRevisao' | 'motivoRevisao' | 'prontoParaDespachoEm'
>

/**
 * "Marcar pronto" só quando a máquina de estados permite e a entrega ainda não foi
 * marcada. PROVISÓRIO (padrão restritivo, D006): o DVP não diz se remarcar sobrescreve
 * `prontoParaDespachoEm`; a interface não oferece a remarcação para não apagar o tempo
 * de estufa já registrado.
 */
export function podeMarcarPronto(entrega: EntregaParaRegra): boolean {
  return (
    acoesPermitidas(entrega.status).includes('MARCAR_PRONTO') && !entrega.prontoParaDespachoEm
  )
}

export function podeCancelar(entrega: EntregaParaRegra): boolean {
  return acoesPermitidas(entrega.status).includes('CANCELAR')
}

/**
 * Ajuste manual de coordenada (sem mapa nesta fase): só para revisão `SEM_COORDENADA`
 * e quando a máquina de estados permite ajustar o pino (UC01 A1).
 */
export function podeAjustarCoordenada(entrega: EntregaParaRegra): boolean {
  return (
    entrega.pendenteRevisao &&
    entrega.motivoRevisao === 'SEM_COORDENADA' &&
    acoesPermitidas(entrega.status).includes('AJUSTAR_PINO')
  )
}

/** Minutos desde `prontoParaDespachoEm`; `null` se a entrega não foi marcada pronta (UC01 A5). */
export function minutosDeEspera(prontoEm: string | null | undefined, agora: Date): number | null {
  if (!prontoEm) return null
  return Math.max(0, differenceInMinutes(agora, instanteDeLocalDateTime(prontoEm)))
}

export function descreverEspera(prontoEm: string | null | undefined, agora: Date): string {
  const minutos = minutosDeEspera(prontoEm, agora)
  if (minutos === null) return 'Não marcada como pronta'
  if (minutos < 1) return 'Pronta há menos de 1 min'
  if (minutos < 60) return `Pronta há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `Pronta há ${horas} h ${resto} min`
}

export function descreverFormaPagamento(entrega: Pick<EntregaResponse, 'formaPagamento'>): string {
  return entrega.formaPagamento ? LABEL_FORMA_PAGAMENTO[entrega.formaPagamento] : VALOR_INDEFINIDO
}

/**
 * Pago online, ou o que o entregador recebe na porta. `trocoPara` é só exibido, como veio
 * do backend (Constituição, Artigo 5.1).
 */
export function descreverCobranca(
  entrega: Pick<EntregaResponse, 'pagoOnline' | 'trocoPara'>,
): string {
  if (entrega.pagoOnline) return 'Pago online'
  if (entrega.trocoPara !== null && entrega.trocoPara !== undefined) {
    return `Receber na entrega · troco para ${formatarMoeda(entrega.trocoPara)}`
  }
  return 'Receber na entrega'
}
