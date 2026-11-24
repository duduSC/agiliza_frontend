/**
 * T010, item 4: operação unificada (Despacho + Monitoramento; D013 decisão 3).
 *
 * Pelo caminho de rede (MSW no formato do backend): pedidos e entregadores no mesmo mapa, o número
 * do card igual ao do círculo, os filtros da D013, o entregador de cada lote, a posição em tempo
 * real (tópico de frota e polling de reserva), a legenda e o fundo do mapa sem chave.
 */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { criarQueryClient } from '@/app/queryClient'
import type { EntregaResponse, MotoboyResponse } from '@/shared/api'
import { paraLocalDateTimeBackend } from '@/shared/formatacao'
import { criarEntregaResponse, criarMotoboyResponse } from '@/test/fabricas'
import { dbEntregas, IDS_ENTREGAS } from '@/test/msw/dadosEntregas'
import { dbLotes, IDS_LOTES } from '@/test/msw/dadosLotes'
import { dbMotoboys, IDS_MOTOBOYS } from '@/test/msw/dadosMotoboys'
import { criarEstabelecimentoMock } from '@/test/msw/handlersEstabelecimento'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'
import { Client } from '@/test/stompFalso'
import { useSelecaoStore } from './selecaoStore'
import { estadoNoMapa, montarItensOperacao } from './operacao'

const ESPERA = { timeout: 10_000 }
const LOJA = 'a1b2c3d4-0001-4a00-8a00-00000000d001'
const FROTA = `/topic/estabelecimento/${LOJA}/frota`
const ID_EM_ROTA = 'e1111111-1111-4111-8111-111111111111'

beforeEach(() => {
  redefinirSessao()
  entrarComo('OPERADOR')
  // Posição recente para quem não é o caso "sem sinal" (Paulo Santos continua com a antiga).
  const agora = paraLocalDateTimeBackend(new Date())
  for (const id of [IDS_MOTOBOYS.online1, IDS_MOTOBOYS.online2, IDS_MOTOBOYS.emRota]) {
    dbMotoboys.atualizar(id, { ultimaPosicaoEm: agora })
  }
})
afterEach(() => vi.useRealTimers())

function semRepeticao() {
  const cliente = criarQueryClient()
  cliente.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  return cliente
}

function pinos() {
  return screen.queryAllByTestId('pino-mapa')
}
function pinoComTitulo(titulo: string) {
  return pinos().find((p) => p.title === titulo)
}
function titulosDosPinos() {
  return pinos().map((p) => p.title)
}

async function listaDePedidos() {
  return screen.findByRole('list', { name: 'Pedidos da operação' }, ESPERA)
}
function rotulos(lista: HTMLElement) {
  return [...lista.querySelectorAll('li > [aria-label]')].map((el) => el.getAttribute('aria-label'))
}

function escolherFiltro(nome: 'Aguardando despacho' | 'Saiu para entrega' | 'Todos') {
  fireEvent.click(screen.getByRole('button', { name: nome }))
}

/** Uma entrega EM_ROTA no lote em rota, que passa a ser do Paulo Santos. */
function comEntregaEmRota() {
  dbEntregas.inserir(
    criarEntregaResponse({
      id: ID_EM_ROTA,
      nomeCliente: 'Iara Melo',
      bairro: 'Petrópolis',
      status: 'EM_ROTA',
      loteId: IDS_LOTES.emRota,
      coordenada: { latitude: -23.62, longitude: -46.7 },
      distanciaKm: 4,
      valorRepasse: 9,
    }),
  )
  dbLotes.atualizar(IDS_LOTES.emRota, { motoboyId: IDS_MOTOBOYS.emRotaDesatualizado })
}

describe('pedidos e entregadores no mesmo mapa', () => {
  it('mostra a loja, os pedidos numerados e os entregadores, cada um com título próprio', async () => {
    renderizarApp('/despacho')
    await waitFor(
      () =>
        expect(titulosDosPinos()).toEqual(
          expect.arrayContaining([
            'Loja',
            'Pedido 1: entrega de Ana Souza',
            'Pedido 2: entrega de Bruno Lima',
            'Pedido 3: entrega de Carla Dias',
            'Entregador Ricardo Silva: Online',
            'Entregador Marcos Oliveira: Online',
            'Entregador Julio Fernandes: Em rota',
            'Entregador Paulo Santos: Sem sinal',
          ]),
        ),
      ESPERA,
    )
    // Offline e bloqueado não fazem parte da frota (UC04).
    expect(titulosDosPinos().some((t) => /Pedro Costa|Jose Bloqueado/.test(t))).toBe(false)
  })

  it('o ícone do entregador traz o nome e o estado em texto (HU08, UC04 A1)', async () => {
    renderizarApp('/despacho')
    await waitFor(() => expect(pinoComTitulo('Entregador Paulo Santos: Sem sinal')).toBeDefined(), ESPERA)
    expect(within(pinoComTitulo('Entregador Ricardo Silva: Online')!).getByText('Ricardo · Online')).toBeInTheDocument()
    expect(within(pinoComTitulo('Entregador Julio Fernandes: Em rota')!).getByText('Julio · Em rota')).toBeInTheDocument()
    expect(within(pinoComTitulo('Entregador Paulo Santos: Sem sinal')!).getByText('Paulo · Sem sinal')).toBeInTheDocument()
  })

  it('o número do card é o número do círculo no mapa', async () => {
    renderizarApp('/despacho')
    const lista = await listaDePedidos()
    expect(rotulos(lista)).toEqual([
      'Pedido 1: Ana Souza, aguardando despacho',
      'Pedido 2: Bruno Lima, aguardando despacho',
      'Pedido 3: Carla Dias, aguardando despacho',
    ])
    expect(within(within(lista).getByRole('button', { name: /^Pedido 2:/ })).getByText('2')).toBeInTheDocument()
    await waitFor(() => expect(pinoComTitulo('Pedido 2: entrega de Bruno Lima')).toBeDefined(), ESPERA)
  })

  it('pedido sem coordenada tem card, mas nunca pino (HU01)', async () => {
    dbEntregas.inserir(
      criarEntregaResponse({ id: 'f2222222-2222-4222-8222-222222222222', nomeCliente: 'Sem Pino', coordenada: null }),
    )
    renderizarApp('/despacho')
    const lista = await listaDePedidos()
    expect(within(lista).getByRole('button', { name: /^Pedido 4: Sem Pino/ })).toBeInTheDocument()
    await waitFor(() => expect(pinoComTitulo('Pedido 3: entrega de Carla Dias')).toBeDefined(), ESPERA)
    expect(titulosDosPinos().some((t) => t.includes('Sem Pino'))).toBe(false)
  })

  it('cada lote despachado mostra o entregador', async () => {
    renderizarApp('/despacho')
    const lote = await screen.findByTestId(`lote-${IDS_LOTES.despachado}`, undefined, ESPERA)
    await waitFor(() => expect(within(lote).getByText('Julio Fernandes')).toBeInTheDocument(), ESPERA)
  })
})

describe('filtros (D013): aguardando, saiu para entrega e todos', () => {
  it('abre em "Aguardando despacho"', async () => {
    renderizarApp('/despacho')
    await listaDePedidos()
    expect(screen.getByRole('button', { name: 'Aguardando despacho' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Saiu para entrega' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('"Saiu para entrega": só DESPACHADA e EM_ROTA, com o entregador do lote', async () => {
    comEntregaEmRota()
    renderizarApp('/despacho')
    await listaDePedidos()
    escolherFiltro('Saiu para entrega')

    await waitFor(async () => {
      expect(rotulos(await listaDePedidos())).toEqual([
        'Pedido 1: Gabi Torres, despachada',
        'Pedido 2: Hugo Prado, despachada',
        'Pedido 3: Iara Melo, em rota',
      ])
    }, ESPERA)
    const lista = await listaDePedidos()
    await waitFor(() => {
      expect(within(lista).getByRole('group', { name: /^Pedido 1:/ })).toHaveTextContent('Entregador: Julio Fernandes')
      expect(within(lista).getByRole('group', { name: /^Pedido 3:/ })).toHaveTextContent('Entregador: Paulo Santos')
    }, ESPERA)
    // Quem saiu não é selecionável: o card não é botão.
    expect(within(lista).queryAllByRole('button')).toHaveLength(0)

    await waitFor(
      () =>
        expect(titulosDosPinos()).toEqual(
          expect.arrayContaining([
            'Pedido 1: entrega de Gabi Torres (Despachada)',
            'Pedido 3: entrega de Iara Melo (Em rota)',
          ]),
        ),
      ESPERA,
    )
    expect(titulosDosPinos().some((t) => t.includes('Ana Souza'))).toBe(false)
  })

  it('"Todos": primeiro os que aguardam, depois os que saíram, numeração contínua', async () => {
    renderizarApp('/despacho')
    await listaDePedidos()
    escolherFiltro('Todos')
    await waitFor(async () => {
      expect(rotulos(await listaDePedidos())).toEqual([
        'Pedido 1: Ana Souza, aguardando despacho',
        'Pedido 2: Bruno Lima, aguardando despacho',
        'Pedido 3: Carla Dias, aguardando despacho',
        'Pedido 4: Gabi Torres, despachada',
        'Pedido 5: Hugo Prado, despachada',
      ])
    }, ESPERA)
  })

  it('entrega em revisão não vira pedido numerado: continua na lista de revisão', async () => {
    renderizarApp('/despacho')
    await listaDePedidos()
    escolherFiltro('Todos')
    await waitFor(async () => expect(rotulos(await listaDePedidos())).toHaveLength(5), ESPERA)
    expect(rotulos(await listaDePedidos()).some((r) => /Diego Alves|Elisa Rocha|Fábio Nunes/.test(r ?? ''))).toBe(false)
    expect(screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`)).toBeInTheDocument()
  })

  it('sem nenhuma que saiu: estado vazio próprio do filtro', async () => {
    dbEntregas.substituir(dbEntregas.todas().filter((e) => e.status !== 'DESPACHADA'))
    renderizarApp('/despacho')
    await listaDePedidos()
    escolherFiltro('Saiu para entrega')
    expect(await screen.findByText('Nenhum pedido saiu para entrega', undefined, ESPERA)).toBeInTheDocument()
  })

  it('enquanto as que saíram carregam, a lista diz que está carregando', async () => {
    server.use(
      http.get('*/api/entregas', async ({ request }) => {
        if (new URL(request.url).searchParams.get('status') === 'DESPACHADA') await delay(400)
        return undefined
      }),
    )
    renderizarApp('/despacho')
    await listaDePedidos()
    escolherFiltro('Saiu para entrega')
    const secao = screen.getByRole('region', { name: /^Pedidos/ })
    expect(within(secao).getByText(/^Carregando/)).toBeInTheDocument()
    await waitFor(async () => expect(rotulos(await listaDePedidos())).toHaveLength(2), ESPERA)
  })

  it('falha ao ler as que saíram: erro com "Tentar novamente", que recupera', async () => {
    server.use(
      http.get('*/api/entregas', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'DESPACHADA'
          ? new HttpResponse(null, { status: 503 })
          : undefined,
      ),
    )
    renderizarApp('/despacho', { queryClient: semRepeticao() })
    await listaDePedidos()
    escolherFiltro('Saiu para entrega')
    const secao = screen.getByRole('region', { name: /^Pedidos/ })
    expect(await within(secao).findByText(/erro inesperado no servidor/i, undefined, ESPERA)).toBeInTheDocument()

    server.resetHandlers()
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(async () => expect(rotulos(await listaDePedidos())).toHaveLength(2), ESPERA)
  })
})

describe('falha parcial no filtro "Todos"', () => {
  it('se só as que saíram falham, os que aguardam continuam e o aviso diz o que faltou', async () => {
    server.use(
      http.get('*/api/entregas', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'DESPACHADA'
          ? new HttpResponse(null, { status: 503 })
          : undefined,
      ),
    )
    renderizarApp('/despacho', { queryClient: semRepeticao() })
    await listaDePedidos()
    escolherFiltro('Todos')
    const secao = screen.getByRole('region', { name: /^Pedidos/ })
    expect(await within(secao).findByText(/parte dos pedidos não carregou/i, undefined, ESPERA)).toBeInTheDocument()
    expect(rotulos(await listaDePedidos())).toEqual([
      'Pedido 1: Ana Souza, aguardando despacho',
      'Pedido 2: Bruno Lima, aguardando despacho',
      'Pedido 3: Carla Dias, aguardando despacho',
    ])
    expect(within(secao).queryByText(/nenhum pedido/i)).not.toBeInTheDocument()

    server.resetHandlers()
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(async () => expect(rotulos(await listaDePedidos())).toHaveLength(5), ESPERA)
    expect(within(secao).queryByText(/parte dos pedidos não carregou/i)).not.toBeInTheDocument()
  })

  it('se a parte que chegou está vazia, não afirma "nenhum pedido"', async () => {
    dbEntregas.substituir(dbEntregas.todas().filter((e) => e.status !== 'AGUARDANDO_DESPACHO'))
    server.use(
      http.get('*/api/entregas', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'DESPACHADA'
          ? new HttpResponse(null, { status: 503 })
          : undefined,
      ),
    )
    renderizarApp('/despacho', { queryClient: semRepeticao() })
    fireEvent.click(await screen.findByRole('button', { name: 'Todos' }, ESPERA))
    const secao = await screen.findByRole('region', { name: /^Pedidos/ }, ESPERA)
    expect(await within(secao).findByText(/parte dos pedidos não carregou/i, undefined, ESPERA)).toBeInTheDocument()
    expect(within(secao).queryByText(/nenhum pedido/i)).not.toBeInTheDocument()
  })
})

describe('seleção pelo card (UC01)', () => {
  it('clicar no card seleciona, como o pino e a tabela', async () => {
    renderizarApp('/despacho')
    const lista = await listaDePedidos()
    const card = within(lista).getByRole('button', { name: /^Pedido 1: Ana Souza/ })
    fireEvent.click(card)

    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(card).toHaveAccessibleName('Pedido 1: Ana Souza, aguardando despacho, selecionado para o lote')
    expect(screen.getByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' })).toBeChecked()
    expect(screen.getByText('1 de 5 entrega(s) selecionada(s)')).toBeInTheDocument()
    await waitFor(() => expect(pinoComTitulo('Pedido 1: entrega de Ana Souza (selecionada)')).toBeDefined(), ESPERA)
    expect(within(pinoComTitulo('Pedido 1: entrega de Ana Souza (selecionada)')!).getByText('1')).toBeInTheDocument()

    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'false')
  })

  it('no limite do lote, o card não seleciona e explica (UC01 E2)', async () => {
    server.use(http.get('*/api/estabelecimento', () => HttpResponse.json(criarEstabelecimentoMock({ maxPedidosPorLote: 1 }))))
    renderizarApp('/despacho')
    const lista = await listaDePedidos()
    await waitFor(() => expect(useSelecaoStore.getState().maxPedidosPorLote).toBe(1), ESPERA)

    fireEvent.click(within(lista).getByRole('button', { name: /^Pedido 1:/ }))
    const segundo = within(lista).getByRole('button', { name: /^Pedido 2:/ })
    fireEvent.click(segundo)
    expect(await screen.findByText(/Limite de 1 entregas por lote atingido/, undefined, ESPERA)).toBeInTheDocument()
    expect(segundo).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('posição dos entregadores em tempo real (UC04, HU08)', () => {
  const ricardo = () => pinos().find((p) => p.title.startsWith('Entregador Ricardo Silva'))
  const novaPosicao = () =>
    dbMotoboys.atualizar(IDS_MOTOBOYS.online1, {
      ultimaPosicao: { latitude: -23.5601, longitude: -46.6402 },
      ultimaPosicaoEm: paraLocalDateTimeBackend(new Date()),
    })

  it('um evento do tópico de frota move o entregador no mapa', async () => {
    renderizarApp('/despacho')
    await waitFor(() => expect(ricardo()).toHaveAttribute('data-posicao', '-23.5505,-46.634'), ESPERA)
    const cliente = Client.instancias[Client.instancias.length - 1]!
    await act(() => cliente.simularConexao())
    expect(cliente.destinos()).toContain(FROTA)

    novaPosicao()
    act(() => cliente.emitir(FROTA))
    await waitFor(() => expect(ricardo()).toHaveAttribute('data-posicao', '-23.5601,-46.6402'), ESPERA)
  })

  it('sem o socket, a posição é relida pelo polling de reserva de 15 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderizarApp('/despacho')
    await waitFor(() => expect(ricardo()).toHaveAttribute('data-posicao', '-23.5505,-46.634'), ESPERA)

    novaPosicao()
    await act(() => vi.advanceTimersByTimeAsync(15_500))
    await waitFor(() => expect(ricardo()).toHaveAttribute('data-posicao', '-23.5601,-46.6402'), ESPERA)
  })

  it('sem a frota, o mapa segue com os pedidos e avisa, com nova tentativa', async () => {
    server.use(
      http.get('*/api/motoboys', ({ request }) =>
        new URL(request.url).search === '' ? new HttpResponse(null, { status: 503 }) : undefined,
      ),
    )
    renderizarApp('/despacho', { queryClient: semRepeticao() })
    const aviso = await screen.findByText(/posição dos entregadores indisponível/i, undefined, ESPERA)
    expect(pinoComTitulo('Pedido 1: entrega de Ana Souza')).toBeDefined()

    server.resetHandlers()
    fireEvent.click(within(aviso).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(ricardo()).toBeDefined(), ESPERA)
  })
})

describe('legenda e fundo do mapa', () => {
  it('a legenda explica cada marcador em texto, não só pela cor (Constituição 7.6)', async () => {
    renderizarApp('/despacho')
    const legenda = await screen.findByRole('list', { name: 'Legenda do mapa' }, ESPERA)
    for (const texto of [
      'Loja',
      /Aguardando despacho/,
      'Selecionado para o lote',
      /Saiu para entrega/,
      'Entregador online',
      'Entregador em rota',
      /sem sinal há mais de 3 min/,
      /Em revisão/,
    ]) {
      expect(within(legenda).getByText(texto)).toBeInTheDocument()
    }
  })

  it('o fundo é o OpenStreetMap, sem chave, com a atribuição e o filtro claro', async () => {
    renderizarApp('/despacho')
    const camada = await screen.findByTestId('camada-mapa', undefined, ESPERA)
    expect(camada).toHaveAttribute('data-url', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    expect(camada.getAttribute('data-url')).not.toMatch(/key|token/i)
    expect(camada.getAttribute('data-atribuicao')).toContain('OpenStreetMap')
    expect(camada).toHaveAttribute('data-classe', 'camada-mapa-clara')
  })
})

describe('montarItensOperacao (regra pura)', () => {
  const entrega = (sobrescrever: Partial<EntregaResponse> & { id: string }) => criarEntregaResponse(sobrescrever)
  const julio = criarMotoboyResponse({ id: IDS_MOTOBOYS.emRota, nome: 'Julio Fernandes', statusDisponibilidade: 'EM_ROTA' })
  const base = {
    pendentes: [
      entrega({ id: 'a0000000-0000-4000-8000-000000000001', nomeCliente: 'A' }),
      entrega({ id: 'a0000000-0000-4000-8000-000000000002', nomeCliente: 'Em revisão', pendenteRevisao: true }),
    ],
    emSaida: [
      entrega({ id: 'b0000000-0000-4000-8000-000000000001', nomeCliente: 'B', status: 'EM_ROTA', loteId: IDS_LOTES.emRota }),
      entrega({ id: 'b0000000-0000-4000-8000-000000000002', nomeCliente: 'Lote sumiu', status: 'DESPACHADA', loteId: 'c0000000-0000-4000-8000-000000000009' }),
      entrega({ id: 'b0000000-0000-4000-8000-000000000003', nomeCliente: 'Já entregue', status: 'ENTREGUE' }),
    ],
    lotes: dbLotes.todos().map((l) => (l.id === IDS_LOTES.emRota ? { ...l, motoboyId: julio.id } : l)),
    entregadores: [julio] as MotoboyResponse[],
  }

  it('numera a partir de 1, aguardando antes, sem revisão nem estado final', () => {
    const itens = montarItensOperacao({ ...base, filtro: 'TODOS' })
    expect(itens.map((i) => [i.numero, i.entrega.nomeCliente, i.emSaida, i.entregador])).toEqual([
      [1, 'A', false, null],
      [2, 'B', true, 'Julio Fernandes'],
      [3, 'Lote sumiu', true, null],
    ])
  })

  it('cada filtro mostra só a sua parte, e a numeração recomeça', () => {
    expect(montarItensOperacao({ ...base, filtro: 'AGUARDANDO' }).map((i) => [i.numero, i.entrega.nomeCliente])).toEqual([
      [1, 'A'],
    ])
    expect(montarItensOperacao({ ...base, filtro: 'EM_SAIDA' }).map((i) => [i.numero, i.entrega.nomeCliente])).toEqual([
      [1, 'B'],
      [2, 'Lote sumiu'],
    ])
  })

  it('o estado no mapa: sem sinal vence o status; depois em rota ou online', () => {
    const agora = new Date('2026-11-13T17:10:00Z') // 14:10 em São Paulo
    const recente = '2026-11-13T14:09:00'
    const antiga = '2026-11-13T14:00:00'
    expect(estadoNoMapa({ ...julio, ultimaPosicaoEm: antiga }, agora)).toBe('SEM_SINAL')
    expect(estadoNoMapa({ ...julio, ultimaPosicaoEm: recente }, agora)).toBe('EM_ROTA')
    expect(estadoNoMapa({ ...julio, statusDisponibilidade: 'ONLINE', ultimaPosicaoEm: recente }, agora)).toBe('ONLINE')
    expect(estadoNoMapa({ ...julio, ultimaPosicaoEm: null }, agora)).toBe('SEM_SINAL')
  })
})
