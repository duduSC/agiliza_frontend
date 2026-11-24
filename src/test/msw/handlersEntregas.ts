/**
 * Handlers MSW dos endpoints de entrega (S007), com os status do backend (422 nas regras).
 *
 * O "banco" em memoria (`dadosEntregas.ts`) permite que os testes manipulem o
 * estado para verificar comportamentos especificos.
 */
import { http, HttpResponse } from 'msw'
import { formatInTimeZone } from 'date-fns-tz'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { EntregaResponse } from '@/shared/api/schemas'
import { criarEntregaResponse } from '@/test/fabricas'
import { dbAcerto } from './dadosAcerto'
import { dbEntregas } from './dadosEntregas'
import { erroApi, naoEncontrado, regraViolada } from './respostas'

const ESTADOS_FINAIS: readonly EntregaResponse['status'][] = ['ENTREGUE', 'FALHA', 'CANCELADA']

export const handlersEntregas = [
  /**
   * GET /api/entregas — filtra por `status` e/ou `pendenteRevisao`.
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
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'Um ou mais campos contêm valores inválidos.', campos)
    }

    const nova = criarEntregaResponse({
      id: crypto.randomUUID(),
      nomeCliente: corpo.nomeCliente as string,
      enderecoCompleto: corpo.enderecoCompleto as string,
      bairro: (corpo.bairro as string | null) ?? null,
      cep: (corpo.cep as string | null) ?? null,
      complemento: (corpo.complemento as string | null) ?? null,
      pontoReferencia: (corpo.pontoReferencia as string | null) ?? null,
      telefoneCliente: (corpo.telefoneCliente as string | null) ?? null,
      coordenada: (corpo.coordenada as EntregaResponse['coordenada']) ?? null,
      valorPedido: (corpo.valorPedido as number | null) ?? null,
      formaPagamento: (corpo.formaPagamento as EntregaResponse['formaPagamento']) ?? null,
      pagoOnline: corpo.pagoOnline === true,
      trocoPara: (corpo.trocoPara as number | null) ?? null,
      observacoes: (corpo.observacoes as string | null) ?? null,
      status: 'AGUARDANDO_DESPACHO',
      pendenteRevisao: corpo.coordenada == null,
      motivoRevisao: corpo.coordenada == null ? 'SEM_COORDENADA' : null,
    })

    dbEntregas.inserir(nova)
    return HttpResponse.json(nova, { status: 201 })
  }),

  /** POST /api/entregas/:id/pronto — marcar como pronto para despacho. */
  http.post('*/api/entregas/:id/pronto', ({ params, request }) => {
    const id = params.id as string
    const entrega = dbEntregas.buscar(id)
    if (!entrega) {
      return naoEncontrado(request)
    }
    if (entrega.status !== 'AGUARDANDO_DESPACHO') {
      return regraViolada(request, 'TRANSICAO_ESTADO_INVALIDA', 'Transição de estado inválida.')
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
      return naoEncontrado(request)
    }

    const statusPermitidos = ['AGUARDANDO_DESPACHO', 'DESPACHADA', 'EM_ROTA']
    if (!statusPermitidos.includes(entrega.status)) {
      return regraViolada(request, 'TRANSICAO_ESTADO_INVALIDA', 'Transição de estado inválida.')
    }

    const corpo = (await request.json()) as Record<string, unknown>
    if (!corpo.motivo || (corpo.motivo as string).trim() === '') {
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'O motivo do cancelamento é obrigatório.', [
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

  /** PATCH /api/entregas/:id/coordenada — reposicionar pino (SEM_COORDENADA e SEM_DISTANCIA; T010). */
  http.patch('*/api/entregas/:id/coordenada', async ({ params, request }) => {
    const id = params.id as string
    const entrega = dbEntregas.buscar(id)
    if (!entrega) {
      return naoEncontrado(request)
    }

    const corpo = (await request.json()) as Record<string, unknown>
    const latitude = corpo.latitude as number
    const longitude = corpo.longitude as number

    if (latitude == null || longitude == null) {
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'Coordenada inválida.', [
        { campo: 'latitude', mensagem: 'Informe a latitude.' },
        { campo: 'longitude', mensagem: 'Informe a longitude.' },
      ])
    }

    // Como `EntregaServiceImpl.exigirReposicionavel`: estado final nao se reposiciona.
    if (ESTADOS_FINAIS.includes(entrega.status)) {
      return regraViolada(request, 'REGRA_NEGOCIO_VIOLADA', 'Não é possível reposicionar uma entrega já finalizada.')
    }

    // Como `limparRevisaoDeLocalizacao`: o pino nao resolve a contestacao do entregador.
    const contestada = entrega.motivoRevisao === 'CONTESTACAO_ENTREGADOR'
    const atualizada = dbEntregas.atualizar(id, {
      coordenada: { latitude, longitude },
      pendenteRevisao: contestada,
      motivoRevisao: contestada ? 'CONTESTACAO_ENTREGADOR' : null,
      distanciaKm: 3.5, // Valor de exemplo — recalculado pelo backend
      valorRepasse: 9.5, // Valor de exemplo — recalculado pelo backend
      atualizadoEm: '2026-11-11T12:10:00',
    })
    return HttpResponse.json(atualizada)
  }),

  /**
   * POST /api/entregas/:id/revisao/resolver — analise da contestacao (T010). Mesmas recusas e na
   * mesma ordem de `EntregaServiceImpl.resolverRevisao`, `AjusteRepasse` e `PoliticaCorrecao`
   * (develop 8c02b47).
   */
  http.post('*/api/entregas/:id/revisao/resolver', async ({ params, request }) => {
    const corpo = (await request.json()) as { valorRepasse?: number | null; motivo?: string }
    if (!corpo.motivo?.trim()) {
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'Um ou mais campos contêm valores inválidos.', [
        { campo: 'motivo', mensagem: 'não deve estar em branco' },
      ])
    }
    const entrega = dbEntregas.buscar(params.id as string)
    if (!entrega) return naoEncontrado(request)
    if (!entrega.pendenteRevisao) {
      return regraViolada(request, 'REGRA_NEGOCIO_VIOLADA', 'A entrega não possui revisão pendente.')
    }
    if (entrega.motivoRevisao !== 'CONTESTACAO_ENTREGADOR') {
      return regraViolada(
        request,
        'REGRA_NEGOCIO_VIOLADA',
        'Pendências de localização são resolvidas reposicionando o pino da entrega.',
      )
    }

    const dia = entrega.finalizadaEm
      ? entrega.finalizadaEm.slice(0, 10)
      : formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd')
    const caixa = dbAcerto.caixas().find((c) => c.dataReferencia === dia)
    const caixaFechado = (operacao: string) =>
      regraViolada(
        request,
        'CAIXA_FECHADO',
        `Operação '${operacao}' não permitida: o caixa do período de operação já está fechado.`,
      )
    const recusarAjuste = (motivo: string) =>
      regraViolada(request, 'AJUSTE_VALOR_NAO_PERMITIDO', `Ajuste manual de repasse não permitido: ${motivo}.`)

    const valor = corpo.valorRepasse ?? null
    const ajusta = valor !== null && (entrega.valorRepasse == null || valor !== entrega.valorRepasse)
    if (ajusta) {
      if (!ESTADOS_FINAIS.includes(entrega.status)) {
        return recusarAjuste('a entrega ainda não foi finalizada; o valor dela é provisório até lá')
      }
      if (entrega.reciboId) {
        return recusarAjuste(
          `a entrega está vinculada ao recibo '${entrega.reciboId}'; cancele o recibo antes de ajustar o valor e gere um novo acerto em seguida`,
        )
      }
      if (!caixa) return recusarAjuste('não há caixa aberto para o dia da entrega')
      if (caixa.status === 'FECHADO') return caixaFechado('ajustar o valor de repasse')
      // `AjusteRepasse`: o valor anterior nulo conta como zero.
      if ((entrega.valorRepasse ?? 0) === valor) return recusarAjuste('o novo valor é igual ao valor atual')
    } else if (!caixa || caixa.status === 'FECHADO') {
      return caixaFechado('resolver a revisão da entrega')
    }

    const atualizada = dbEntregas.atualizar(entrega.id, {
      pendenteRevisao: false,
      motivoRevisao: null,
      ...(ajusta ? { valorRepasse: valor } : {}),
      atualizadoEm: '2026-11-11T12:20:00',
    })
    return HttpResponse.json(atualizada)
  }),
]
