/**
 * Handlers MSW de acerto, recibos e caixa (S009), com as recusas do backend da develop 8c02b47
 * (`PoliticaCorrecao`, `ReciboServiceImpl`, `CaixaServiceImpl`; S013).
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { criarAjusteResponse, criarCaixaResponse, criarReciboResponse } from '@/test/fabricas'
import { dbAcerto, somarNoServidor } from './dadosAcerto'
import { erroApi, naoEncontrado, regraViolada } from './respostas'

const OPERADOR = 'b1b2c3d4-0003-4b00-8b00-00000000e003'
let proximoAjuste = 100

function caixaDoDia(dia: string) {
  return dbAcerto.caixas().find((c) => c.dataReferencia === dia)
}

export const handlersAcerto = [
  http.get(`*${ENDPOINTS.acertos.extrato}`, ({ request }) => {
    const p = new URL(request.url).searchParams
    const motoboyId = p.get('motoboyId')
    const inicio = p.get('inicio')
    const fim = p.get('fim')
    if (!motoboyId || !inicio || !fim) {
      return erroApi(request, 400, 'PARAMETRO_INVALIDO', 'Parâmetro obrigatório não informado.')
    }
    if (fim <= inicio) return regraViolada(request, 'REGRA_NEGOCIO_VIOLADA', 'O período informado é inválido.')
    return HttpResponse.json(dbAcerto.extrato(motoboyId, inicio, fim))
  }),

  http.get('*/api/entregas/:id/ajustes', ({ params }) =>
    HttpResponse.json(dbAcerto.ajustes(params.id as string)),
  ),

  http.post('*/api/entregas/:id/ajustes', async ({ params, request }) => {
    const entregaId = params.id as string
    const corpo = (await request.json()) as { valorNovo: number; motivo?: string }
    if (!corpo.motivo?.trim()) {
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'Um ou mais campos contêm valores inválidos.', [
        { campo: 'motivo', mensagem: 'não deve estar em branco' },
      ])
    }
    const entrega = dbAcerto.finalizada(entregaId)
    if (!entrega) return naoEncontrado(request)
    const recusar = (motivo: string) =>
      regraViolada(request, 'AJUSTE_VALOR_NAO_PERMITIDO', `Ajuste manual de repasse não permitido: ${motivo}.`)
    if (entrega.reciboId) return recusar(`a entrega está vinculada ao recibo '${entrega.reciboId}'`)
    const caixa = caixaDoDia(entrega.finalizadaEm!.slice(0, 10))
    if (!caixa) return recusar('não há caixa aberto para o dia da entrega')
    if (caixa.status === 'FECHADO') return regraViolada(request, 'CAIXA_FECHADO', 'O caixa está fechado.')
    if ((entrega.valorRepasse ?? 0) === corpo.valorNovo) return recusar('o novo valor é igual ao valor atual')

    const ajuste = criarAjusteResponse({
      id: ++proximoAjuste,
      entregaId,
      valorAnterior: entrega.valorRepasse ?? 0,
      valorNovo: corpo.valorNovo,
      motivo: corpo.motivo,
      ajustadoEm: '2026-11-09T17:30:00.123456',
    })
    dbAcerto.atualizarFinalizada(entregaId, { valorRepasse: corpo.valorNovo })
    dbAcerto.inserirAjuste(ajuste)
    return HttpResponse.json(ajuste, { status: 201 })
  }),

  http.get(`*${ENDPOINTS.recibos.listar}`, ({ request }) => {
    const motoboyId = new URL(request.url).searchParams.get('motoboyId')
    return HttpResponse.json(dbAcerto.recibos().filter((r) => !motoboyId || r.motoboyId === motoboyId))
  }),

  http.post(`*${ENDPOINTS.recibos.gerar}`, async ({ request }) => {
    const { motoboyId, periodoInicio, periodoFim } = (await request.json()) as Record<
      'motoboyId' | 'periodoInicio' | 'periodoFim',
      string
    >
    if (periodoFim <= periodoInicio) {
      return regraViolada(request, 'REGRA_NEGOCIO_VIOLADA', 'O fim do período deve ser posterior ao início.')
    }
    const caixa = caixaDoDia(periodoInicio.slice(0, 10))
    if (!caixa) return naoEncontrado(request)
    if (caixa.status === 'FECHADO') return regraViolada(request, 'CAIXA_FECHADO', 'O caixa está fechado.')

    const aptas = dbAcerto
      .extrato(motoboyId, periodoInicio, periodoFim)
      .linhas.filter((l) => l.situacao === 'A_ACERTAR')
    if (aptas.length === 0) {
      return regraViolada(
        request,
        'REGRA_NEGOCIO_VIOLADA',
        'Não há entregas finalizadas, sem revisão pendente e fora de recibo no período informado.',
      )
    }
    if (aptas.some((l) => l.valorRepasse == null)) {
      return regraViolada(request, 'ENTREGA_INAPTA_RECIBO', 'O valor de repasse não está definido.')
    }
    // S013: período que alcança um dia já fechado.
    if (aptas.some((l) => caixaDoDia(l.finalizadaEm!.slice(0, 10))?.status === 'FECHADO')) {
      return regraViolada(request, 'CAIXA_FECHADO', 'O período alcança um dia com caixa fechado.')
    }

    const recibo = criarReciboResponse({
      id: crypto.randomUUID(),
      caixaId: caixa.id,
      motoboyId,
      dataReferencia: caixa.dataReferencia,
      periodoInicio,
      periodoFim,
      qtdEntregas: aptas.length,
      valorTotal: somarNoServidor(aptas.map((l) => l.valorRepasse)),
    })
    dbAcerto.inserirRecibo(recibo)
    aptas.forEach((l) => dbAcerto.atualizarFinalizada(l.entregaId, { reciboId: recibo.id }))
    return HttpResponse.json(recibo, { status: 201 })
  }),

  http.post('*/api/recibos/:id/pagar', ({ params, request }) => {
    const recibo = dbAcerto.recibos().find((r) => r.id === params.id)
    if (!recibo) return naoEncontrado(request)
    if (recibo.status !== 'GERADO') {
      return regraViolada(request, 'TRANSICAO_ESTADO_INVALIDA', 'Transição de estado inválida para Recibo.')
    }
    if (dbAcerto.caixas().find((c) => c.id === recibo.caixaId)?.status === 'FECHADO') {
      return regraViolada(request, 'CAIXA_FECHADO', 'O caixa está fechado.')
    }
    return HttpResponse.json(
      dbAcerto.atualizarRecibo(recibo.id, { status: 'PAGO', pagoEm: '2026-11-09T18:00:00.123456' }),
    )
  }),

  http.get(`*${ENDPOINTS.caixas.atual}`, ({ request }) => {
    const caixa = dbAcerto.caixaAtual()
    return caixa ? HttpResponse.json(caixa) : naoEncontrado(request)
  }),

  http.get(`*${ENDPOINTS.caixas.listar}`, ({ request }) => {
    const p = new URL(request.url).searchParams
    const de = p.get('dataInicio')
    const ate = p.get('dataFim')
    return HttpResponse.json(
      dbAcerto
        .caixas()
        .filter((c) => !de || !ate || (c.dataReferencia >= de && c.dataReferencia <= ate)),
    )
  }),

  http.post(`*${ENDPOINTS.caixas.abrir}`, async ({ request }) => {
    const { dataReferencia } = (await request.json()) as { dataReferencia: string }
    if (caixaDoDia(dataReferencia)) {
      return erroApi(request, 409, 'CAIXA_JA_ABERTO', 'Já existe um caixa registrado para esta data.')
    }
    const caixa = criarCaixaResponse({ id: crypto.randomUUID(), dataReferencia })
    dbAcerto.inserirCaixa(caixa)
    return HttpResponse.json(caixa, { status: 201 })
  }),

  http.post('*/api/caixas/:id/fechar', ({ params, request }) => {
    const caixa = dbAcerto.caixas().find((c) => c.id === params.id)
    if (!caixa) return naoEncontrado(request)
    if (caixa.status === 'FECHADO') return regraViolada(request, 'CAIXA_FECHADO', 'O caixa está fechado.')
    const validos = dbAcerto.recibos().filter((r) => r.caixaId === caixa.id && r.status !== 'CANCELADO')
    return HttpResponse.json(
      dbAcerto.atualizarCaixa(caixa.id, {
        status: 'FECHADO',
        fechadoEm: '2026-11-09T22:00:00.123456',
        usuarioFechamentoId: OPERADOR,
        qtdRecibos: validos.length,
        valorTotal: somarNoServidor(validos.map((r) => r.valorTotal)),
      }),
    )
  }),
]
