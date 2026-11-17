/**
 * T008 — Despacho com respostas no formato REAL do backend (capturadas em 17/11/2026).
 *
 * Regressao do travamento: com o backend real a tela caia inteira porque o pino de entrega
 * recebia `icon={undefined}` (o mock de `react-leaflet` em `test/setup.ts` agora reproduz esse
 * erro do Leaflet). Verifica tambem: entrega sem coordenada fora do mapa e na lista de revisao
 * (Constituicao 5.4 / HU01), centro do mapa na loja e limite do lote vindo do backend (5.6).
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { server } from '@/test/msw/server'
import {
  ENTREGAS_PENDENTES_REAIS,
  ENTREGA_REVISAO_SEM_COORDENADA_REAL,
  ESTABELECIMENTO_REAL,
  ID_ESTABELECIMENTO_REAL,
  MOTOBOYS_ONLINE_REAIS,
} from '@/test/msw/dadosBackendReal'
import { buscarEstabelecimentoAtual, chavesEstabelecimento } from '@/features/loja'
import { chavesEntregas, chavesFalhas, chavesLotes, chavesMotoboys } from './api/hooks'
import { listarEmRevisao, listarPendentesDeDespacho } from './api/entregasApi'
import { contarFalhasPendentes } from './api/falhasApi'
import { listarLotesDespachados } from './api/lotesApi'
import { listarEntregadoresDisponiveis } from './api/motoboysApi'
import { centroDoMapa } from './mapa'
import { DespachoPagina } from './paginas/DespachoPagina'
import { useSelecaoStore } from './selecaoStore'

function usarBackendReal(estabelecimento = ESTABELECIMENTO_REAL) {
  server.use(
    http.get(`*${ENDPOINTS.entregas.listar}`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('pendenteRevisao') === 'true') {
        return HttpResponse.json([ENTREGA_REVISAO_SEM_COORDENADA_REAL])
      }
      return HttpResponse.json(ENTREGAS_PENDENTES_REAIS)
    }),
    http.get(`*${ENDPOINTS.lotes.listar}`, () => HttpResponse.json([])),
    http.get(`*${ENDPOINTS.motoboys.listar}`, () => HttpResponse.json(MOTOBOYS_ONLINE_REAIS)),
    http.get(`*${ENDPOINTS.integracoes.falhas}`, () => HttpResponse.json([])),
    http.get(`*${ENDPOINTS.estabelecimento.atual}`, () => HttpResponse.json(estabelecimento)),
  )
}

/**
 * Busca pelo caminho de rede REAL (cliente HTTP + schema Zod) e entrega o resultado ao cache.
 * As chamadas vao sem `AbortSignal`: no jsdom, o `fetch` do Node recusa o `AbortSignal` do
 * jsdom (mesmo motivo pelo qual `despacho.test.tsx` pre-popula o cache).
 */
async function renderizar() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
  const id = ID_ESTABELECIMENTO_REAL
  qc.setQueryData(chavesEntregas.pendentes(id), await listarPendentesDeDespacho())
  qc.setQueryData(chavesEntregas.revisao(id), await listarEmRevisao())
  qc.setQueryData(chavesLotes.despachados(id), await listarLotesDespachados())
  qc.setQueryData(chavesMotoboys.disponiveis(id), await listarEntregadoresDisponiveis())
  qc.setQueryData(chavesFalhas.pendentes(id), await contarFalhasPendentes())
  try {
    qc.setQueryData(chavesEstabelecimento.atual(id), await buscarEstabelecimentoAtual())
  } catch {
    // Falha da loja: a tela segue sem ela (testado abaixo). Marca a query como erro.
    qc.getQueryCache().build(qc, { queryKey: chavesEstabelecimento.atual(id) }).setState({
      status: 'error',
      error: new Error('falha'),
    })
  }
  return render(
    <QueryClientProvider client={qc}>
      <DespachoPagina />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useSessaoStore.setState({
    usuario: {
      usuarioId: '1ed0ebca-86d4-4333-bd65-2a9d0fbaef8a',
      estabelecimentoId: ID_ESTABELECIMENTO_REAL,
      motoboyId: null,
      nome: 'Operador de Logistica',
      perfil: 'OPERADOR',
    },
    token: 'token-teste',
    refreshToken: 'refresh-teste',
    estabelecimentoId: ID_ESTABELECIMENTO_REAL,
  })
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
})

afterEach(() => {
  useSessaoStore.setState({ usuario: null, token: null, refreshToken: null, estabelecimentoId: null })
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
})

describe('Despacho com o formato real do backend (T008)', () => {
  it('carrega a lista e o mapa sem quebrar a tela', async () => {
    usarBackendReal()
    await renderizar()

    const tabela = await screen.findByRole('table', { name: 'Entregas aguardando despacho' })
    for (const e of ENTREGAS_PENDENTES_REAIS) {
      expect(within(tabela).getByTestId(`pendente-${e.id}`)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 1, name: 'Despacho' })).toBeInTheDocument()
    expect(screen.queryByText(/nao foi possivel exibir o mapa/i)).not.toBeInTheDocument()

    // 4 entregas com coordenada + o pino da loja (que chega por GET /api/estabelecimento).
    await waitFor(() =>
      expect(screen.getAllByTestId('pino-mapa')).toHaveLength(ENTREGAS_PENDENTES_REAIS.length + 1),
    )
  })

  it('entrega sem coordenada vai para a lista de revisao e nunca para o mapa', async () => {
    usarBackendReal()
    await renderizar()

    const revisao = await screen.findByTestId(`revisao-${ENTREGA_REVISAO_SEM_COORDENADA_REAL.id}`)
    expect(within(revisao).getByText('Revisão: Endereço sem coordenada')).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getAllByTestId('pino-mapa')).toHaveLength(ENTREGAS_PENDENTES_REAIS.length + 1),
    )
    const mapa = screen.getByTestId('mapa-leaflet')
    expect(within(mapa).queryByText('Cliente Sem Coordenada')).not.toBeInTheDocument()
  })

  it('o limite do lote vem do maxPedidosPorLote da loja (Constituicao 5.6)', async () => {
    usarBackendReal({ ...ESTABELECIMENTO_REAL, maxPedidosPorLote: 3 })
    await renderizar()
    await waitFor(() => expect(useSelecaoStore.getState().maxPedidosPorLote).toBe(3))
  })

  it('falha do estabelecimento nao derruba o despacho', async () => {
    usarBackendReal()
    server.use(
      http.get(`*${ENDPOINTS.estabelecimento.atual}`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-11-17T19:00:00',
            status: 500,
            error: 'Internal Server Error',
            codigo: 'ERRO_INTERNO_SERVIDOR',
            message: 'Erro interno',
            path: '/api/estabelecimento',
          },
          { status: 500 },
        ),
      ),
    )
    await renderizar()
    const tabela = await screen.findByRole('table', { name: 'Entregas aguardando despacho' })
    expect(within(tabela).getAllByRole('checkbox')).toHaveLength(ENTREGAS_PENDENTES_REAIS.length)
    // Sem a loja, so os pinos das entregas.
    await waitFor(() =>
      expect(screen.getAllByTestId('pino-mapa')).toHaveLength(ENTREGAS_PENDENTES_REAIS.length),
    )
  })
})

describe('centroDoMapa (T008)', () => {
  it('usa a loja quando ela existe', () => {
    expect(
      centroDoMapa({ latitude: -28.262, longitude: -52.4083 }, ENTREGAS_PENDENTES_REAIS),
    ).toEqual([-28.262, -52.4083])
  })

  it('sem loja, usa a primeira entrega com coordenada (ignora as sem coordenada)', () => {
    const [primeira] = ENTREGAS_PENDENTES_REAIS
    expect(
      centroDoMapa(null, [ENTREGA_REVISAO_SEM_COORDENADA_REAL, ...ENTREGAS_PENDENTES_REAIS]),
    ).toEqual([primeira?.coordenada?.latitude, primeira?.coordenada?.longitude])
  })

  it('sem loja e sem coordenadas, cai num centro neutro', () => {
    expect(centroDoMapa(null, [ENTREGA_REVISAO_SEM_COORDENADA_REAL])).toHaveLength(2)
  })
})
