/**
 * "Banco" em memória do acerto, recibos e caixa. Imita o `ExtratoAcertoServiceImpl`: o extrato e
 * os totais são derivados das entregas finalizadas, como o SERVIDOR faz. O frontend nunca soma.
 */
import type {
  CaixaResponse,
  EntregaAjusteValorResponse,
  ExtratoAcertoResponse,
  LinhaExtratoResponse,
  ReciboResponse,
} from '@/shared/api/schemas'
import {
  IDS,
  criarAjusteResponse,
  criarCaixaResponse,
  criarLinhaExtrato,
  criarReciboResponse,
} from '@/test/fabricas'

export const IDS_ACERTO = {
  motoboy: IDS.motoboy,
  entregaSemRecibo: 'aa111111-1111-4111-8111-111111111111',
  entregaComRecibo: 'bb222222-2222-4222-8222-222222222222',
  entregaEmRevisao: 'cc333333-3333-4333-8333-333333333333',
  recibo: 'dd444444-4444-4444-8444-444444444444',
  reciboGerado: 'dd444444-4444-4444-8444-444444444444',
  reciboPago: 'ee555555-5555-4555-8555-555555555555',
  caixaFechado: 'ff666666-6666-4666-8666-666666666666',
} as const

/** Entrega finalizada, com o dono. `situacao` é sempre derivada. */
export type FinalizadaMock = Omit<LinhaExtratoResponse, 'situacao'> & {
  motoboyId: string
  emRevisao: boolean
}

function finalizada(
  motoboyId: string,
  emRevisao: boolean,
  dados: Partial<LinhaExtratoResponse>,
): FinalizadaMock {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a situação é sempre derivada
  const { situacao: _derivada, ...linha } = criarLinhaExtrato(dados)
  return { ...linha, motoboyId, emRevisao }
}

function sementeFinalizadas(): FinalizadaMock[] {
  const m = IDS_ACERTO.motoboy
  return [
    finalizada(m, false, { entregaId: IDS_ACERTO.entregaSemRecibo, nomeCliente: 'Ana Souza' }),
    finalizada(m, false, {
      entregaId: IDS_ACERTO.entregaComRecibo,
      nomeCliente: 'Bruno Lima',
      finalizadaEm: '2026-11-09T15:10:00',
      distanciaKm: 4.5,
      reciboId: IDS_ACERTO.recibo,
    }),
    finalizada(m, true, {
      entregaId: IDS_ACERTO.entregaEmRevisao,
      nomeCliente: 'Carla Dias',
      finalizadaEm: '2026-11-09T16:00:00',
      distanciaKm: null,
      faixaDeKm: null,
      faixaAteKm: null,
      valorRepasse: null,
    }),
  ]
}

/** Como o backend: soma em centavos dos valores definidos. */
export function somarNoServidor(valores: readonly (number | null | undefined)[]): number {
  return valores.reduce<number>((total, v) => total + Math.round((v ?? 0) * 100), 0) / 100
}

function montarExtrato(
  finalizadas: readonly FinalizadaMock[],
  motoboyId: string,
  inicio: string,
  fim: string,
): ExtratoAcertoResponse {
  const linhas = finalizadas
    .filter(
      (e) =>
        e.motoboyId === motoboyId && !!e.finalizadaEm && e.finalizadaEm >= inicio && e.finalizadaEm <= fim,
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- o dono não faz parte do DTO
    .map(({ motoboyId: _dono, emRevisao, ...linha }): LinhaExtratoResponse => ({
      ...linha,
      situacao: emRevisao ? 'EM_REVISAO' : linha.reciboId ? 'CONSOLIDADA' : 'A_ACERTAR',
    }))
  const total = (situacao: LinhaExtratoResponse['situacao']) =>
    somarNoServidor(linhas.filter((l) => l.situacao === situacao).map((l) => l.valorRepasse))
  return {
    motoboyId,
    nomeEntregador: 'Entregador Exemplo',
    periodoInicio: inicio,
    periodoFim: fim,
    linhas,
    totalDevido: total('A_ACERTAR'),
    totalConsolidado: total('CONSOLIDADA'),
    totalEmRevisao: total('EM_REVISAO'),
    possuiValorIndefinido: linhas.some((l) => l.situacao === 'A_ACERTAR' && l.valorRepasse == null),
  }
}

export function sementeExtrato(): ExtratoAcertoResponse {
  return montarExtrato(
    sementeFinalizadas(),
    IDS_ACERTO.motoboy,
    '2026-11-09T00:00:00',
    '2026-11-09T23:59:59.999999',
  )
}

export function sementeRecibos(): ReciboResponse[] {
  return [
    criarReciboResponse({ id: IDS_ACERTO.reciboGerado, qtdEntregas: 1, valorTotal: 9 }),
    criarReciboResponse({
      id: IDS_ACERTO.reciboPago,
      caixaId: IDS_ACERTO.caixaFechado,
      dataReferencia: '2026-11-08',
      periodoInicio: '2026-11-08T00:00:00',
      periodoFim: '2026-11-08T23:59:59',
      qtdEntregas: 3,
      valorTotal: 27,
      status: 'PAGO',
      pagoEm: '2026-11-08T18:00:00',
    }),
  ]
}

export function sementeCaixaAtual(): CaixaResponse {
  return criarCaixaResponse()
}

export function sementeHistoricoCaixas(): CaixaResponse[] {
  return [
    criarCaixaResponse(),
    criarCaixaResponse({
      id: IDS_ACERTO.caixaFechado,
      dataReferencia: '2026-11-08',
      abertoEm: '2026-11-08T08:00:00',
      fechadoEm: '2026-11-08T22:00:00',
      status: 'FECHADO',
      qtdRecibos: 1,
      valorTotal: 27,
    }),
  ]
}

export function sementeAjustes(): EntregaAjusteValorResponse[] {
  return [criarAjusteResponse({ entregaId: IDS_ACERTO.entregaSemRecibo, motivo: 'Correção de faixa' })]
}

// --- Dados em memória que os handlers usam ---

let finalizadas = sementeFinalizadas()
let recibos = sementeRecibos()
let caixaAtual: CaixaResponse | null = sementeCaixaAtual()
let caixas = sementeHistoricoCaixas()
let ajustes = sementeAjustes()

export const dbAcerto = {
  extrato: (motoboyId: string, inicio: string, fim: string) =>
    montarExtrato(finalizadas, motoboyId, inicio, fim),
  finalizada: (entregaId: string) => finalizadas.find((e) => e.entregaId === entregaId),
  atualizarFinalizada: (entregaId: string, mudancas: Partial<FinalizadaMock>) => {
    finalizadas = finalizadas.map((e) => (e.entregaId === entregaId ? { ...e, ...mudancas } : e))
  },
  recibos: () => recibos,
  inserirRecibo: (r: ReciboResponse) => {
    recibos = [...recibos, r]
  },
  atualizarRecibo: (id: string, mudancas: Partial<ReciboResponse>): ReciboResponse | undefined => {
    recibos = recibos.map((r) => (r.id === id ? { ...r, ...mudancas } : r))
    return recibos.find((r) => r.id === id)
  },
  caixaAtual: () => caixaAtual,
  /** Redefinir "hoje sem caixa" também tira o caixa do dia da lista. */
  definirCaixaAtual: (caixa: CaixaResponse | null) => {
    const anterior = caixaAtual
    caixas = caixas.filter((c) => c.id !== anterior?.id && c.id !== caixa?.id)
    if (caixa) caixas = [...caixas, caixa]
    caixaAtual = caixa
  },
  caixas: () => caixas,
  inserirCaixa: (caixa: CaixaResponse) => {
    caixas = [...caixas, caixa]
    caixaAtual ??= caixa
  },
  atualizarCaixa: (id: string, mudancas: Partial<CaixaResponse>): CaixaResponse | undefined => {
    caixas = caixas.map((c) => (c.id === id ? { ...c, ...mudancas } : c))
    const atualizado = caixas.find((c) => c.id === id)
    if (atualizado && caixaAtual?.id === id) caixaAtual = atualizado
    return atualizado
  },
  ajustes: (entregaId: string) => ajustes.filter((a) => a.entregaId === entregaId),
  inserirAjuste: (ajuste: EntregaAjusteValorResponse) => {
    ajustes = [...ajustes, ajuste]
  },
}

export function redefinirAcerto(): void {
  finalizadas = sementeFinalizadas()
  recibos = sementeRecibos()
  caixaAtual = sementeCaixaAtual()
  caixas = sementeHistoricoCaixas()
  ajustes = sementeAjustes()
}
