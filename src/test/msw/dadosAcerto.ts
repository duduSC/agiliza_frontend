/**
 * "Banco" em memoria para acerto, recibos e caixa (T006).
 * Os valores monetarios sao dados de exemplo — o frontend nunca os calcula.
 */
import type { ExtratoAcertoResponse, ReciboResponse, CaixaResponse, EntregaAjusteValorResponse } from '@/shared/api/schemas'
import { IDS, criarCaixaResponse } from '@/test/fabricas'

export const IDS_ACERTO = {
  motoboy: IDS.motoboy,
  entregaSemRecibo: 'aa111111-1111-4111-8111-111111111111',
  entregaComRecibo: 'bb222222-2222-4222-8222-222222222222',
  entregaEmRevisao: 'cc333333-3333-4333-8333-333333333333',
  recibo: 'dd444444-4444-4444-8444-444444444444',
  reciboGerado: 'dd444444-4444-4444-8444-444444444444',
  reciboPago: 'ee555555-5555-4555-8555-555555555555',
} as const

export function sementeExtrato(): ExtratoAcertoResponse {
  return {
    motoboyId: IDS_ACERTO.motoboy,
    nomeEntregador: 'Entregador Exemplo',
    periodoInicio: '2026-11-09T00:00:00',
    periodoFim: '2026-11-09T23:59:59',
    linhas: [
      {
        entregaId: IDS_ACERTO.entregaSemRecibo,
        nomeCliente: 'Ana Souza',
        finalizadaEm: '2026-11-09T14:30:00',
        status: 'ENTREGUE',
        distanciaKm: 3.2,
        faixaDeKm: 0,
        faixaAteKm: 5,
        foraDeArea: false,
        valorRepasse: 9,
        situacao: 'A_ACERTAR',
        reciboId: null,
      },
      {
        entregaId: IDS_ACERTO.entregaComRecibo,
        nomeCliente: 'Bruno Lima',
        finalizadaEm: '2026-11-09T15:10:00',
        status: 'ENTREGUE',
        distanciaKm: 4.5,
        faixaDeKm: 0,
        faixaAteKm: 5,
        foraDeArea: false,
        valorRepasse: 9,
        situacao: 'CONSOLIDADA',
        reciboId: IDS_ACERTO.recibo,
      },
      {
        entregaId: IDS_ACERTO.entregaEmRevisao,
        nomeCliente: 'Carla Dias',
        finalizadaEm: '2026-11-09T16:00:00',
        status: 'ENTREGUE',
        distanciaKm: null,
        faixaDeKm: null,
        faixaAteKm: null,
        foraDeArea: false,
        valorRepasse: null,
        situacao: 'EM_REVISAO',
        reciboId: null,
      },
    ],
    totalDevido: 18,
    totalConsolidado: 9,
    totalEmRevisao: 0,
    possuiValorIndefinido: true,
  }
}

export function sementeRecibos(): ReciboResponse[] {
  return [
    {
      id: IDS_ACERTO.reciboGerado,
      estabelecimentoId: IDS.estabelecimento,
      caixaId: IDS.caixa,
      motoboyId: IDS_ACERTO.motoboy,
      usuarioGeradorId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      dataReferencia: '2026-11-09',
      periodoInicio: '2026-11-09T00:00:00',
      periodoFim: '2026-11-09T23:59:59',
      qtdEntregas: 1,
      valorTotal: 9,
      status: 'GERADO',
      criadoEm: '2026-11-09T17:00:00',
    },
    {
      id: IDS_ACERTO.reciboPago,
      estabelecimentoId: IDS.estabelecimento,
      caixaId: IDS.caixa,
      motoboyId: IDS_ACERTO.motoboy,
      usuarioGeradorId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      dataReferencia: '2026-11-08',
      periodoInicio: '2026-11-08T00:00:00',
      periodoFim: '2026-11-08T23:59:59',
      qtdEntregas: 3,
      valorTotal: 27,
      status: 'PAGO',
      pagoEm: '2026-11-08T18:00:00',
      criadoEm: '2026-11-08T17:00:00',
    },
  ]
}

export function sementeCaixaAtual(): CaixaResponse {
  return criarCaixaResponse()
}

export function sementeHistoricoCaixas(): CaixaResponse[] {
  return [
    criarCaixaResponse(),
    criarCaixaResponse({
      id: 'ff666666-6666-4666-8666-666666666666',
      dataReferencia: '2026-11-08',
      abertoEm: '2026-11-08T08:00:00',
      fechadoEm: '2026-11-08T22:00:00',
      status: 'FECHADO',
      qtdRecibos: 5,
      valorTotal: 150,
      criadoEm: '2026-11-08T08:00:00',
    }),
  ]
}

export function sementeAjustes(): EntregaAjusteValorResponse[] {
  return [
    {
      id: 1,
      entregaId: IDS_ACERTO.entregaSemRecibo,
      usuarioId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      valorAnterior: 7,
      valorNovo: 9,
      motivo: 'Correcao de faixa aplicada',
      ajustadoEm: '2026-11-09T14:45:00',
    },
  ]
}

// --- Dados em memoria que os handlers usam ---

let extrato: ExtratoAcertoResponse = sementeExtrato()
let recibos: ReciboResponse[] = sementeRecibos()
let caixaAtual: CaixaResponse | null = sementeCaixaAtual()
let historicoCaixas: CaixaResponse[] = sementeHistoricoCaixas()
let ajustes: Record<string, EntregaAjusteValorResponse[]> = {
  [IDS_ACERTO.entregaSemRecibo]: sementeAjustes(),
}

export const dbAcerto = {
  extrato: () => extrato,
  atualizarExtrato: (novo: ExtratoAcertoResponse) => { extrato = novo },
  recibos: () => recibos,
  inserirRecibo: (r: ReciboResponse) => { recibos = [...recibos, r] },
  atualizarRecibo: (id: string, mudancas: Partial<ReciboResponse>): ReciboResponse | undefined => {
    let atualizado: ReciboResponse | undefined
    recibos = recibos.map((r) => {
      if (r.id !== id) return r
      atualizado = { ...r, ...mudancas }
      return atualizado
    })
    return atualizado
  },
  caixaAtual: () => caixaAtual,
  definirCaixaAtual: (c: CaixaResponse | null) => { caixaAtual = c },
  historicoCaixas: () => historicoCaixas,
  inserirCaixa: (c: CaixaResponse) => { historicoCaixas = [...historicoCaixas, c] },
  atualizarCaixa: (id: string, mudancas: Partial<CaixaResponse>): CaixaResponse | undefined => {
    let atualizado: CaixaResponse | undefined
    historicoCaixas = historicoCaixas.map((c) => {
      if (c.id !== id) return c
      atualizado = { ...c, ...mudancas }
      return atualizado
    })
    if (atualizado && caixaAtual && caixaAtual.id === id) {
      caixaAtual = atualizado
    }
    return atualizado
  },
  ajustes: (entregaId: string) => ajustes[entregaId] ?? [],
  inserirAjuste: (a: EntregaAjusteValorResponse) => {
    const lista = ajustes[a.entregaId] ?? []
    ajustes[a.entregaId] = [...lista, a]
  },
}

export function redefinirAcerto(): void {
  extrato = sementeExtrato()
  recibos = sementeRecibos()
  caixaAtual = sementeCaixaAtual()
  historicoCaixas = sementeHistoricoCaixas()
  ajustes = { [IDS_ACERTO.entregaSemRecibo]: sementeAjustes() }
}
