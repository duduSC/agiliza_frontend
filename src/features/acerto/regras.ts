/**
 * Qual caixa manda em cada ação do acerto (Constituição, Artigos 5.2 e 5.3), como no backend:
 * - ajuste: o caixa do dia em que a entrega foi finalizada (`PoliticaCorrecao`);
 * - gerar recibo: o caixa do primeiro dia do período, e nenhuma entrega apta de dia fechado (S013);
 * - pagar: o caixa do próprio recibo.
 * Sem saber a situação do caixa, nada é oferecido (Artigo 1.3). Só decide o que MOSTRAR.
 */
import type { CaixaResponse, LinhaExtratoResponse, ReciboResponse } from '@/shared/api/schemas'

export type SituacaoCaixa = 'ABERTO' | 'FECHADO' | 'SEM_CAIXA' | 'DESCONHECIDA'

type Caixas = readonly CaixaResponse[] | undefined

function situacao(caixa: CaixaResponse | undefined): SituacaoCaixa {
  if (!caixa) return 'SEM_CAIXA'
  return caixa.status === 'FECHADO' ? 'FECHADO' : 'ABERTO'
}

/** Dia (`LocalDate`) de um `LocalDateTime`, que já vem em horário de São Paulo. */
export function diaDe(dataHora: string): string {
  return dataHora.slice(0, 10)
}

export function caixaDoDia(caixas: Caixas, dia: string): SituacaoCaixa {
  return caixas ? situacao(caixas.find((c) => c.dataReferencia === dia)) : 'DESCONHECIDA'
}

export function caixaDoRecibo(caixas: Caixas, recibo: ReciboResponse): SituacaoCaixa {
  return caixas ? situacao(caixas.find((c) => c.id === recibo.caixaId)) : 'DESCONHECIDA'
}

export function caixaDaEntrega(caixas: Caixas, linha: LinhaExtratoResponse): SituacaoCaixa {
  return linha.finalizadaEm ? caixaDoDia(caixas, diaDe(linha.finalizadaEm)) : 'DESCONHECIDA'
}

/** Primeiro dia fechado entre as entregas que entrariam no recibo. Dia sem caixa não é fechado. */
export function diaFechadoNoRecibo(
  caixas: Caixas,
  linhas: readonly LinhaExtratoResponse[],
): string | null {
  const linha = linhas.find(
    (l) => l.situacao === 'A_ACERTAR' && caixaDaEntrega(caixas, l) === 'FECHADO',
  )
  return linha?.finalizadaEm ? diaDe(linha.finalizadaEm) : null
}

/**
 * Total do servidor para exibir. O backend soma so os valores definidos: se todos os de uma
 * situacao forem nulos, o total vem 0, que pareceria definitivo (Constituicao, Artigo 5.1).
 * Nada e somado aqui; so se decide entre mostrar o numero do servidor e "—".
 */
export function totalParaExibir(
  total: number,
  situacao: LinhaExtratoResponse['situacao'],
  linhas: readonly LinhaExtratoResponse[],
): { valor: number | null; parcial: boolean } {
  const parcial = linhas.some((l) => l.situacao === situacao && l.valorRepasse == null)
  return { valor: parcial && total === 0 ? null : total, parcial }
}
