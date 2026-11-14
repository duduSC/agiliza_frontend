/**
 * Handlers MSW dos endpoints de acerto, recibos e caixa (T006).
 * Endpoints confirmados pelo backend (S009).
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ReciboResponse } from '@/shared/api/schemas'
import { IDS } from '@/test/fabricas'
import { dbAcerto } from './dadosAcerto'

function erroApi(
  status: number,
  codigo: string,
  message: string,
  campos?: { campo: string; mensagem: string }[],
) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      error: status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Unprocessable Entity',
      codigo,
      message,
      path: '/api',
      campos: campos ?? [],
    },
    { status },
  )
}

export const handlersAcerto = [
  /** GET /api/acertos — extrato do acerto. Confirmado (S009). */
  http.get(`*${ENDPOINTS.acertos.extrato}`, ({ request }) => {
    const url = new URL(request.url)
    const motoboyId = url.searchParams.get('motoboyId')
    if (!motoboyId) {
      return erroApi(400, 'PARAMETRO_INVALIDO', 'motoboyId e obrigatorio.')
    }
    return HttpResponse.json(dbAcerto.extrato())
  }),

  /** GET /api/entregas/:id/ajustes — historico de ajustes. Confirmado (S009). */
  http.get('*/api/entregas/:id/ajustes', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(dbAcerto.ajustes(id))
  }),

  /** POST /api/entregas/:id/ajustes — ajustar repasse. Confirmado (S009). */
  http.post('*/api/entregas/:id/ajustes', async ({ params, request }) => {
    const id = params.id as string
    const corpo = (await request.json()) as Record<string, unknown>

    // Verificar se a entrega tem recibo
    const extrato = dbAcerto.extrato()
    const linha = extrato.linhas.find((l) => l.entregaId === id)
    if (linha && linha.reciboId) {
      return erroApi(422, 'AJUSTE_VALOR_NAO_PERMITIDO', 'A entrega ja esta vinculada a um recibo.')
    }

    // Verificar caixa fechado
    const caixa = dbAcerto.caixaAtual()
    if (caixa && caixa.status === 'FECHADO') {
      return erroApi(422, 'CAIXA_FECHADO', 'O caixa esta fechado.')
    }

    if (!corpo.motivo || (corpo.motivo as string).trim() === '') {
      return erroApi(400, 'DADOS_INVALIDOS', 'O motivo e obrigatorio.', [
        { campo: 'motivo', mensagem: 'O motivo e obrigatorio.' },
      ])
    }

    const ajuste = {
      id: Date.now(),
      entregaId: id,
      usuarioId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      valorAnterior: linha?.valorRepasse ?? 0,
      valorNovo: corpo.valorNovo as number,
      motivo: corpo.motivo as string,
      ajustadoEm: '2026-11-09T17:30:00',
    }
    dbAcerto.inserirAjuste(ajuste)
    return HttpResponse.json(ajuste)
  }),

  /** GET /api/recibos — listar recibos. Confirmado (S009). */
  http.get(`*${ENDPOINTS.recibos.listar}`, () => {
    return HttpResponse.json(dbAcerto.recibos())
  }),

  /** POST /api/recibos — gerar recibo. Confirmado (S009). */
  http.post(`*${ENDPOINTS.recibos.gerar}`, async ({ request }) => {
    const corpo = (await request.json()) as Record<string, unknown>
    const motoboyId = corpo.motoboyId as string

    // Verificar caixa fechado
    const caixa = dbAcerto.caixaAtual()
    if (caixa && caixa.status === 'FECHADO') {
      return erroApi(422, 'CAIXA_FECHADO', 'O caixa esta fechado.')
    }

    const novoRecibo: ReciboResponse = {
      id: crypto.randomUUID(),
      estabelecimentoId: IDS.estabelecimento,
      caixaId: IDS.caixa,
      motoboyId,
      usuarioGeradorId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      dataReferencia: '2026-11-09',
      periodoInicio: corpo.periodoInicio as string,
      periodoFim: corpo.periodoFim as string,
      qtdEntregas: 1,
      valorTotal: 9,
      status: 'GERADO',
      criadoEm: '2026-11-09T17:30:00',
    }
    dbAcerto.inserirRecibo(novoRecibo)
    return HttpResponse.json(novoRecibo, { status: 201 })
  }),

  /** POST /api/recibos/:id/pagar — marcar como pago. Confirmado (S009). */
  http.post('*/api/recibos/:id/pagar', ({ params }) => {
    const id = params.id as string
    const recibo = dbAcerto.recibos().find((r) => r.id === id)
    if (!recibo) {
      return erroApi(404, 'RECIBO_NAO_ENCONTRADO', 'Recibo nao encontrado.')
    }
    if (recibo.status !== 'GERADO') {
      return erroApi(422, 'RECIBO_INALTERAVEL', 'So recibos GERADO podem ser marcados como pago.')
    }
    const atualizado = dbAcerto.atualizarRecibo(id, {
      status: 'PAGO',
      pagoEm: '2026-11-09T18:00:00',
      atualizadoEm: '2026-11-09T18:00:00',
    })
    return HttpResponse.json(atualizado)
  }),

  /** POST /api/recibos/:id/cancelar — cancelar recibo. Confirmado (S009). */
  http.post('*/api/recibos/:id/cancelar', async ({ params, request }) => {
    const id = params.id as string
    const recibo = dbAcerto.recibos().find((r) => r.id === id)
    if (!recibo) {
      return erroApi(404, 'RECIBO_NAO_ENCONTRADO', 'Recibo nao encontrado.')
    }
    const corpo = (await request.json()) as Record<string, unknown>
    if (!corpo.motivo || (corpo.motivo as string).trim() === '') {
      return erroApi(400, 'DADOS_INVALIDOS', 'O motivo e obrigatorio.')
    }
    const atualizado = dbAcerto.atualizarRecibo(id, {
      status: 'CANCELADO',
      atualizadoEm: '2026-11-09T18:10:00',
    })
    return HttpResponse.json(atualizado)
  }),

  /** GET /api/caixas/atual — caixa do dia. Confirmado (S009). */
  http.get(`*${ENDPOINTS.caixas.atual}`, () => {
    const caixa = dbAcerto.caixaAtual()
    if (!caixa) {
      return erroApi(404, 'CAIXA_NAO_ENCONTRADO', 'Nao ha caixa aberto para hoje.')
    }
    return HttpResponse.json(caixa)
  }),

  /** GET /api/caixas — historico. Confirmado (S009). */
  http.get(`*${ENDPOINTS.caixas.listar}`, () => {
    return HttpResponse.json(dbAcerto.historicoCaixas())
  }),

  /** POST /api/caixas — abrir caixa. Confirmado (S009). */
  http.post(`*${ENDPOINTS.caixas.abrir}`, async ({ request }) => {
    const corpo = (await request.json()) as Record<string, unknown>
    const dataReferencia = corpo.dataReferencia as string

    // Verificar se ja existe caixa para o dia
    const existente = dbAcerto.caixaAtual()
    if (existente) {
      return erroApi(409, 'CAIXA_JA_ABERTO', 'Ja existe um caixa aberto para esta data.')
    }

    const novoCaixa = {
      id: crypto.randomUUID(),
      estabelecimentoId: IDS.estabelecimento,
      dataReferencia,
      abertoEm: '2026-11-09T08:00:00',
      status: 'ABERTO' as const,
      criadoEm: '2026-11-09T08:00:00',
    }
    dbAcerto.definirCaixaAtual(novoCaixa)
    dbAcerto.inserirCaixa(novoCaixa)
    return HttpResponse.json(novoCaixa, { status: 201 })
  }),

  /** POST /api/caixas/:id/fechar — fechar caixa. Confirmado (S009). */
  http.post('*/api/caixas/:id/fechar', ({ params }) => {
    const id = params.id as string
    const caixa = dbAcerto.caixaAtual()
    if (!caixa || caixa.id !== id) {
      return erroApi(404, 'CAIXA_NAO_ENCONTRADO', 'Caixa nao encontrado.')
    }
    if (caixa.status === 'FECHADO') {
      return erroApi(422, 'TRANSICAO_ESTADO_INVALIDA', 'O caixa ja esta fechado.')
    }
    const atualizado = dbAcerto.atualizarCaixa(id, {
      status: 'FECHADO',
      fechadoEm: '2026-11-09T22:00:00',
      atualizadoEm: '2026-11-09T22:00:00',
    })
    if (atualizado) dbAcerto.definirCaixaAtual(atualizado)
    return HttpResponse.json(atualizado)
  }),
]
