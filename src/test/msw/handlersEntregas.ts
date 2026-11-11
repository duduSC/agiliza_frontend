/**
 * Handlers MSW dos endpoints de entrega (T003). Todos PROVISORIOS (AGENT.md 6.7).
 *
 * Casos de sucesso, erro 400 com `campos[]`, 404, 409 (transicao invalida).
 * O "banco" em memoria (`dadosEntregas.ts`) permite que os testes manipulem o
 * estado para verificar comportamentos especificos.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { EntregaResponse } from '@/shared/api/schemas'
import { criarEntregaResponse } from '@/test/fabricas'
import { dbEntregas } from './dadosEntregas'

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
      error: status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Conflict',
      codigo,
      message,
      path: '/api/entregas',
      campos: campos ?? [],
    },
    { status },
  )
}

export const handlersEntregas = [
  /**
   * GET /api/entregas — filtra por `status` e/ou `pendenteRevisao`.
   * PROVISORIO: o backend ainda nao tem este controller.
   */
  http.get(`*${ENDPOINTS.entregas.listar}`, ({ request }) => {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const revisaoParam = url.searchParams.get('pendenteRevisao')

    let resultado = dbEntregas.todas()

    if (statusParam) {
      resultado = resultado.filter((e) => e.status === statusParam)
    }
    if (revisaoParam === 'true') {
      resultado = resultado.filter((e) => e.pendenteRevisao)
    }
    if (revisaoParam === 'false') {
      resultado = resultado.filter((e) => !e.pendenteRevisao)
    }

    return HttpResponse.json(resultado)
  }),

  /** POST /api/entregas — entrega avulsa (UC01 A2). */
  http.post(`*${ENDPOINTS.entregas.criarAvulsa}`, async ({ request }) => {
    const corpo = (await request.json()) as Record<string, unknown>

    // Validacao minima: nomeCliente e enderecoCompleto obrigatorios
    const campos: { campo: string; mensagem: string }[] = []
    if (!corpo.nomeCliente || (corpo.nomeCliente as string).trim() === '') {
      campos.push({ campo: 'nomeCliente', mensagem: 'Nome do cliente e obrigatorio.' })
    }
    if (!corpo.enderecoCompleto || (corpo.enderecoCompleto as string).trim() === '') {
      campos.push({ campo: 'enderecoCompleto', mensagem: 'Endereco e obrigatorio.' })
    }
    if (campos.length > 0) {
      return erroApi(400, 'DADOS_INVALIDOS', 'Ha campos com dados invalidos.', campos)
    }

    const nova = criarEntregaResponse({
      id: crypto.randomUUID(),
      nomeCliente: corpo.nomeCliente as string,
      enderecoCompleto: corpo.enderecoCompleto as string,
      bairro: (corpo.bairro as string | null) ?? undefined,
      cep: (corpo.cep as string | null) ?? undefined,
      complemento: (corpo.complemento as string | null) ?? undefined,
      pontoReferencia: (corpo.pontoReferencia as string | null) ?? undefined,
      telefoneCliente: (corpo.telefoneCliente as string | null) ?? undefined,
      coordenada: corpo.coordenada as EntregaResponse['coordenada'],
      valorPedido: corpo.valorPedido as number | undefined,
      formaPagamento: corpo.formaPagamento as EntregaResponse['formaPagamento'],
      pagoOnline: corpo.pagoOnline as boolean,
      trocoPara: corpo.trocoPara as number | undefined,
      observacoes: (corpo.observacoes as string | null) ?? undefined,
      status: 'AGUARDANDO_DESPACHO',
      pendenteRevisao: corpo.coordenada == null,
      motivoRevisao: corpo.coordenada == null ? 'SEM_COORDENADA' : undefined,
    })

    dbEntregas.inserir(nova)
    return HttpResponse.json(nova, { status: 201 })
  }),

  /** POST /api/entregas/:id/pronto — marcar como pronto para despacho. */
  http.post('*/api/entregas/:id/pronto', ({ params }) => {
    const id = params.id as string
    const entrega = dbEntregas.buscar(id)
    if (!entrega) {
      return erroApi(404, 'ENTREGA_NAO_ENCONTRADA', 'Entrega nao encontrada.')
    }
    if (entrega.status !== 'AGUARDANDO_DESPACHO') {
      return erroApi(409, 'TRANSICAO_ESTADO_INVALIDA', 'Esta acao nao e permitida no status atual.')
    }
    const atualizada = dbEntregas.atualizar(id, {
      prontoParaDespachoEm: '2026-11-11T12:00:00',
      atualizadoEm: '2026-11-11T12:00:00',
    })
    return HttpResponse.json(atualizada)
  }),

  /** POST /api/entregas/:id/cancelar — cancelar entrega com motivo. */
  http.post('*/api/entregas/:id/cancelar', async ({ params, request }) => {
    const id = params.id as string
    const entrega = dbEntregas.buscar(id)
    if (!entrega) {
      return erroApi(404, 'ENTREGA_NAO_ENCONTRADA', 'Entrega nao encontrada.')
    }

    const statusPermitidos = ['AGUARDANDO_DESPACHO', 'DESPACHADA', 'EM_ROTA']
    if (!statusPermitidos.includes(entrega.status)) {
      return erroApi(409, 'TRANSICAO_ESTADO_INVALIDA', 'Esta acao nao e permitida no status atual.')
    }

    const corpo = (await request.json()) as Record<string, unknown>
    if (!corpo.motivo || (corpo.motivo as string).trim() === '') {
      return erroApi(400, 'DADOS_INVALIDOS', 'O motivo do cancelamento e obrigatorio.', [
        { campo: 'motivo', mensagem: 'O motivo do cancelamento e obrigatorio.' },
      ])
    }

    const atualizada = dbEntregas.atualizar(id, {
      status: 'CANCELADA',
      motivoFalha: corpo.motivo as string,
      finalizadaEm: '2026-11-11T12:05:00',
      atualizadoEm: '2026-11-11T12:05:00',
    })
    return HttpResponse.json(atualizada)
  }),

  /** PATCH /api/entregas/:id/coordenada — ajustar pino (revisao SEM_COORDENADA). */
  http.patch('*/api/entregas/:id/coordenada', async ({ params, request }) => {
    const id = params.id as string
    const entrega = dbEntregas.buscar(id)
    if (!entrega) {
      return erroApi(404, 'ENTREGA_NAO_ENCONTRADA', 'Entrega nao encontrada.')
    }

    const corpo = (await request.json()) as Record<string, unknown>
    const latitude = corpo.latitude as number
    const longitude = corpo.longitude as number

    if (latitude == null || longitude == null) {
      return erroApi(400, 'DADOS_INVALIDOS', 'Coordenada invalida.', [
        { campo: 'latitude', mensagem: 'Informe a latitude.' },
        { campo: 'longitude', mensagem: 'Informe a longitude.' },
      ])
    }

    const atualizada = dbEntregas.atualizar(id, {
      coordenada: { latitude, longitude },
      pendenteRevisao: false,
      motivoRevisao: undefined,
      distanciaKm: 3.5, // Valor de exemplo — recalculado pelo backend
      valorRepasse: 9.5, // Valor de exemplo — recalculado pelo backend
      atualizadoEm: '2026-11-11T12:10:00',
    })
    return HttpResponse.json(atualizada)
  }),
]
