/**
 * Handlers MSW dos endpoints de lotes e motoboys (T004). PROVISORIOS.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { LoteEntregaResponse } from '@/shared/api/schemas'
import { dbLotes } from './dadosLotes'
import { dbMotoboys } from './dadosMotoboys'
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
      path: '/api/lotes',
      campos: campos ?? [],
    },
    { status },
  )
}

export const handlersLotes = [
  /** GET /api/lotes — filtra por status. PROVISORIO. */
  http.get(`*${ENDPOINTS.lotes.listar}`, ({ request }) => {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    let resultado = dbLotes.todos()
    if (statusParam) {
      resultado = resultado.filter((l) => l.status === statusParam)
    }
    return HttpResponse.json(resultado)
  }),

  /** GET /api/motoboys — filtra por statusDisponibilidade. PROVISORIO. */
  http.get(`*${ENDPOINTS.motoboys.listar}`, ({ request }) => {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('statusDisponibilidade')
    let resultado = dbMotoboys.todos()
    if (statusParam) {
      resultado = resultado.filter((m) => m.statusDisponibilidade === statusParam)
    }
    return HttpResponse.json(resultado)
  }),

  /** POST /api/lotes — despachar lote. PROVISORIO. */
  http.post(`*${ENDPOINTS.lotes.despachar}`, async ({ request }) => {
    const corpo = (await request.json()) as Record<string, unknown>
    const motoboyId = corpo.motoboyId as string
    const entregaIds = corpo.entregaIds as string[]

    if (!motoboyId || !entregaIds || entregaIds.length === 0) {
      return erroApi(400, 'DADOS_INVALIDOS', 'motoboyId e entregaIds sao obrigatorios.')
    }

    // Verificar se o motoboy esta disponivel
    const motoboy = dbMotoboys.todos().find((m) => m.id === motoboyId)
    if (!motoboy || motoboy.statusDisponibilidade !== 'ONLINE' || motoboy.statusCadastro !== 'ATIVO') {
      return erroApi(422, 'MOTOBOY_INDISPONIVEL', 'O entregador nao esta disponivel.')
    }

    // Verificar limite
    if (entregaIds.length > 5) {
      return erroApi(422, 'LIMITE_LOTE_EXCEDIDO', 'Limite de entregas por lote excedido.')
    }

    const novoLote: LoteEntregaResponse = {
      id: crypto.randomUUID(),
      estabelecimentoId: '6f1c2a3b-4d5e-4f60-8a71-0b2c3d4e5f60',
      motoboyId,
      usuarioDespachanteId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      status: 'DESPACHADO',
      qtdEntregas: entregaIds.length,
      despachadoEm: '2026-11-11T12:00:00',
      criadoEm: '2026-11-11T12:00:00',
    }

    dbLotes.inserir(novoLote)

    // Atualizar status das entregas
    for (const eid of entregaIds) {
      dbEntregas.atualizar(eid, {
        status: 'DESPACHADA',
        loteId: novoLote.id,
        despachadaEm: '2026-11-11T12:00:00',
        atualizadoEm: '2026-11-11T12:00:00',
      })
    }

    return HttpResponse.json(novoLote, { status: 201 })
  }),

  /** POST /api/lotes/:id/devolver — devolver lote. PROVISORIO. */
  http.post('*/api/lotes/:id/devolver', ({ params }) => {
    const id = params.id as string
    const lote = dbLotes.buscar(id)
    if (!lote) {
      return erroApi(404, 'LOTE_NAO_ENCONTRADO', 'Lote nao encontrado.')
    }
    if (lote.status !== 'DESPACHADO') {
      return erroApi(422, 'TRANSICAO_ESTADO_INVALIDA', 'So lotes DESPACHADO podem ser devolvidos.')
    }

    const atualizado = dbLotes.atualizar(id, {
      status: 'CANCELADO',
      atualizadoEm: '2026-11-11T12:15:00',
    })
    return HttpResponse.json(atualizado)
  }),

  /** GET /api/falhas-integracao — contagem de falhas. PROVISORIO. */
  http.get(`*${ENDPOINTS.integracoes.falhas}`, () => {
    // Retornar duas falhas de exemplo
    return HttpResponse.json([
      {
        id: 1,
        configuracaoIntegracaoId: 'cfg-001',
        etapa: 'GEOCODIFICACAO',
        tentativas: 3,
        status: 'PENDENTE',
        ocorridoEm: '2026-11-11T10:30:00',
      },
      {
        id: 2,
        configuracaoIntegracaoId: 'cfg-001',
        etapa: 'CONSULTA',
        tentativas: 1,
        status: 'PENDENTE',
        ocorridoEm: '2026-11-11T11:00:00',
      },
    ])
  }),
]
