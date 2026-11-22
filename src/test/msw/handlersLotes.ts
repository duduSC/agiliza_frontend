/**
 * Handlers MSW de lotes, entregadores e falhas (S008, S010), com as regras do
 * `LoteEntregaServiceImpl`: despacho põe o entregador EM_ROTA; devolução traz tudo de volta.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { criarLoteResponse } from '@/test/fabricas'
import { somarNoServidor } from './dadosAcerto'
import { dbEntregas } from './dadosEntregas'
import { dbLotes } from './dadosLotes'
import { dbMotoboys } from './dadosMotoboys'
import { criarEstabelecimentoMock } from './handlersEstabelecimento'
import { erroApi, naoEncontrado, regraViolada } from './respostas'

const CONFIGURACAO_INTEGRACAO = 'c0000000-0000-4000-8000-000000000001'

const FALHAS = [
  {
    id: 1,
    configuracaoIntegracaoId: CONFIGURACAO_INTEGRACAO,
    idExterno: 'SIM-0001',
    etapa: 'GEOCODIFICACAO',
    tentativas: 5,
    status: 'PENDENTE',
    ocorridoEm: '2026-11-11T10:30:00.123456',
    resolvidoEm: null,
  },
  {
    id: 2,
    configuracaoIntegracaoId: CONFIGURACAO_INTEGRACAO,
    idExterno: null,
    etapa: 'CONSULTA',
    tentativas: 5,
    status: 'PENDENTE',
    ocorridoEm: '2026-11-11T11:00:00.123456',
    resolvidoEm: null,
  },
]

export const handlersLotes = [
  http.get(`*${ENDPOINTS.lotes.listar}`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status') ?? 'DESPACHADO'
    return HttpResponse.json(dbLotes.todos().filter((l) => l.status === status))
  }),

  // Como o controller: statusCadastro tem precedência sobre statusDisponibilidade.
  http.get(`*${ENDPOINTS.motoboys.listar}`, ({ request }) => {
    const p = new URL(request.url).searchParams
    const cadastro = p.get('statusCadastro')
    const disponibilidade = p.get('statusDisponibilidade')
    return HttpResponse.json(
      dbMotoboys.todos().filter((m) => {
        if (cadastro) return m.statusCadastro === cadastro
        return !disponibilidade || m.statusDisponibilidade === disponibilidade
      }),
    )
  }),

  http.post(`*${ENDPOINTS.lotes.despachar}`, async ({ request }) => {
    const { motoboyId, entregaIds } = (await request.json()) as { motoboyId?: string; entregaIds?: string[] }
    if (!motoboyId || !entregaIds?.length) {
      return erroApi(request, 400, 'DADOS_INVALIDOS', 'Um ou mais campos contêm valores inválidos.', [
        { campo: 'entregaIds', mensagem: 'não deve estar vazio' },
      ])
    }
    if (entregaIds.length > criarEstabelecimentoMock().maxPedidosPorLote) {
      return regraViolada(request, 'LIMITE_LOTE_EXCEDIDO', 'Limite de entregas por lote excedido.')
    }
    const motoboy = dbMotoboys.buscar(motoboyId)
    if (!motoboy) return naoEncontrado(request)
    if (motoboy.statusDisponibilidade !== 'ONLINE' || motoboy.statusCadastro !== 'ATIVO') {
      return regraViolada(request, 'MOTOBOY_INDISPONIVEL', 'O entregador não está disponível.')
    }
    const entregas = []
    for (const id of entregaIds) {
      const entrega = dbEntregas.buscar(id)
      if (!entrega) return naoEncontrado(request)
      if (entrega.status !== 'AGUARDANDO_DESPACHO' || entrega.pendenteRevisao) {
        return regraViolada(request, 'ENTREGA_INAPTA_LOTE', 'A entrega não pode ser incluída no lote.')
      }
      entregas.push(entrega)
    }

    const agora = '2026-11-11T12:00:00.123456'
    const lote = criarLoteResponse({
      id: crypto.randomUUID(),
      motoboyId,
      qtdEntregas: entregas.length,
      valorTotalRepasse: somarNoServidor(entregas.map((e) => e.valorRepasse)),
      despachadoEm: agora,
    })
    dbLotes.inserir(lote)
    entregas.forEach((e, i) =>
      dbEntregas.atualizar(e.id, {
        status: 'DESPACHADA',
        loteId: lote.id,
        ordemRota: i + 1,
        despachadaEm: agora,
      }),
    )
    dbMotoboys.atualizar(motoboyId, { statusDisponibilidade: 'EM_ROTA' })
    return HttpResponse.json(lote, { status: 201 })
  }),

  http.post('*/api/lotes/:id/devolver', ({ params, request }) => {
    const lote = dbLotes.buscar(params.id as string)
    if (!lote) return naoEncontrado(request)
    if (lote.status !== 'DESPACHADO') {
      return regraViolada(request, 'TRANSICAO_ESTADO_INVALIDA', 'Transição de estado inválida para Lote.')
    }
    for (const e of dbEntregas.todas()) {
      if (e.loteId !== lote.id || e.status !== 'DESPACHADA') continue
      dbEntregas.atualizar(e.id, {
        status: 'AGUARDANDO_DESPACHO',
        loteId: null,
        ordemRota: null,
        despachadaEm: null,
      })
    }
    if (dbMotoboys.buscar(lote.motoboyId)?.statusDisponibilidade === 'EM_ROTA') {
      dbMotoboys.atualizar(lote.motoboyId, { statusDisponibilidade: 'ONLINE' })
    }
    return HttpResponse.json(dbLotes.atualizar(lote.id, { status: 'CANCELADO' }))
  }),

  http.get(`*${ENDPOINTS.integracoes.falhas}`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status') ?? 'PENDENTE'
    return HttpResponse.json(FALHAS.filter((f) => f.status === status))
  }),
]
