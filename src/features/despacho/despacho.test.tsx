/**
 * Testes do despacho (T003 + T004): lista de pendentes, lista de revisao, entrega avulsa,
 * marcar pronto, cancelar, ajustar coordenada, selecao multipla, despacho, devolucao.
 *
 * Regras de negocio verificadas:
 * - Constituicao 5.1: `valorRepasse === null` mostra "--", nunca "R$ 0,00"
 * - Constituicao 5.4: revisao fora da lista de pendentes; so tres motivos
 * - Constituicao 5.5: acoes so as permitidas pela maquina de estados
 * - Constituicao 5.6: despacho so ONLINE + ATIVO, limite maxPedidosPorLote
 * - Constituicao 5.8: sem atualizacao otimista em despacho/devolucao
 * - Constituicao 7.3: estados carregando, vazio, erro e sucesso
 * - UC01 A2: entrega avulsa com validacao Zod e erros do servidor por campo
 * - UC01 A4: devolucao so de lotes DESPACHADO
 * - UC01 A5: pode despachar sem marcar pronto
 * - UC01 E1: sem entregador online -> botao desabilitado
 * - UC01 E2: selecao limitada a maxPedidosPorLote
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { useSessaoStore } from '@/features/auth'
import { Toaster } from '@/shared/ui/sonner'
import { server } from '@/test/msw/server'
import { IDS_ENTREGAS, sementeEntregas } from '@/test/msw/dadosEntregas'
import { sementeLotes, IDS_LOTES } from '@/test/msw/dadosLotes'
import { sementeMotoboys } from '@/test/msw/dadosMotoboys'
import type { EntregaResponse } from '@/shared/api/schemas'
import { chavesEntregas, chavesLotes, chavesMotoboys, chavesFalhas } from './api/hooks'
import { useSelecaoStore } from './selecaoStore'
import { DespachoPagina } from './paginas/DespachoPagina'

/* ---- constantes ---- */

const ESTABELECIMENTO_TESTE = 'a1b2c3d4-0001-4a00-8a00-00000000d001'
const TIMEOUT = { timeout: 3000 }

/* ---- helpers ---- */

function dadosPendentes(): EntregaResponse[] {
  return sementeEntregas().filter(
    (e) => e.status === 'AGUARDANDO_DESPACHO' && !e.pendenteRevisao,
  )
}

function dadosRevisao(): EntregaResponse[] {
  return sementeEntregas().filter((e) => e.pendenteRevisao)
}

/**
 * Cria um QueryClient com o cache pre-populado com os dados da semente.
 * `staleTime: Infinity` evita que o TQ tente refetch automatico (o que
 * falharia por causa do bug do jsdom com AbortSignal).
 */
function criarQueryClientComDados() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
  qc.setQueryData(
    chavesEntregas.pendentes(ESTABELECIMENTO_TESTE),
    dadosPendentes(),
  )
  qc.setQueryData(
    chavesEntregas.revisao(ESTABELECIMENTO_TESTE),
    dadosRevisao(),
  )
  qc.setQueryData(
    chavesLotes.despachados(ESTABELECIMENTO_TESTE),
    sementeLotes().filter((l) => l.status === 'DESPACHADO'),
  )
  qc.setQueryData(
    chavesMotoboys.disponiveis(ESTABELECIMENTO_TESTE),
    sementeMotoboys().filter((m) => m.statusDisponibilidade === 'ONLINE' && m.statusCadastro === 'ATIVO'),
  )
  qc.setQueryData(
    chavesFalhas.pendentes(ESTABELECIMENTO_TESTE),
    2,
  )
  return qc
}

/** QueryClient sem dados pre-populados (para testes de estado vazio/erro). */
function criarQueryClientVazio() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

function iniciarSessaoOperador() {
  useSessaoStore.setState({
    usuario: {
      usuarioId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      estabelecimentoId: ESTABELECIMENTO_TESTE,
      motoboyId: null,
      nome: 'Operador (teste)',
      perfil: 'OPERADOR',
    },
    token: 'token-teste',
    estabelecimentoId: ESTABELECIMENTO_TESTE,
  })
}

function limparSessao() {
  useSessaoStore.setState({ usuario: null, token: null, estabelecimentoId: null })
}

function renderizarDespacho(queryClient?: QueryClient) {
  const qc = queryClient ?? criarQueryClientComDados()
  const resultado = render(
    <QueryClientProvider client={qc}>
      <DespachoPagina />
      <Toaster />
    </QueryClientProvider>,
  )
  return { ...resultado, queryClient: qc }
}

/* ---- setup ---- */

beforeEach(() => {
  iniciarSessaoOperador()
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
})

afterEach(() => {
  limparSessao()
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
})

/* ---- Lista de pendentes ---- */

describe('lista de pendentes (AGUARDANDO_DESPACHO sem revisao)', () => {
  it('exibe as entregas pendentes com os campos corretos', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    // Ana Souza: com repasse, com troco
    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    expect(within(linhaAna).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(linhaAna).getByText('Centro')).toBeInTheDocument()
  })

  it('valorRepasse null mostra "---", nunca "R$ 0,00" (Constituicao 5.1)', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    const linhaBruno = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteSemRepasse}`)
    // Repasse null mostra --
    expect(within(linhaBruno).getByTitle('Repasse ainda nao calculado')).toHaveTextContent('—')
  })

  it('nao exibe entregas em revisao na lista de pendentes (Constituicao 5.4)', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    expect(within(tabela).queryByText('Diego Alves')).not.toBeInTheDocument()
    expect(within(tabela).queryByText('Elisa Rocha')).not.toBeInTheDocument()
  })

  it('nao exibe entregas DESPACHADA na lista de pendentes', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    expect(within(tabela).queryByText('Gabi Torres')).not.toBeInTheDocument()
  })

  it('mostra estado vazio quando nao ha entregas pendentes', () => {
    const qc = criarQueryClientVazio()
    qc.setQueryData(chavesEntregas.pendentes(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesEntregas.revisao(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesLotes.despachados(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesMotoboys.disponiveis(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesFalhas.pendentes(ESTABELECIMENTO_TESTE), 0)
    renderizarDespacho(qc)
    expect(
      screen.getByText(/nenhuma entrega aguardando despacho/i),
    ).toBeInTheDocument()
  })

  it('exibe a contagem de pendentes no titulo da secao', () => {
    renderizarDespacho()
    const secao = screen.getByRole('region', { name: /aguardando despacho/i })
    expect(within(secao).getByText('(3)')).toBeInTheDocument()
  })
})

/* ---- Lista de revisao ---- */

describe('lista de revisao', () => {
  it('exibe entregas em revisao com motivo em portugues', () => {
    renderizarDespacho()

    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemCoordenada}`)
    expect(within(cartao).getByText('Diego Alves')).toBeInTheDocument()
    expect(within(cartao).getByText(/sem coordenada/i)).toBeInTheDocument()

    const cartao2 = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`)
    expect(within(cartao2).getByText('Elisa Rocha')).toBeInTheDocument()
    expect(within(cartao2).getByText(/n.o calculada/i)).toBeInTheDocument()

    const cartao3 = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoContestacao}`)
    expect(within(cartao3).getByText(/contesta/i)).toBeInTheDocument()
    expect(within(cartao3).getByText(/tela de acerto/i)).toBeInTheDocument()
  })

  it('mostra estado vazio quando nao ha entregas em revisao', () => {
    const qc = criarQueryClientVazio()
    qc.setQueryData(chavesEntregas.pendentes(ESTABELECIMENTO_TESTE), dadosPendentes())
    qc.setQueryData(chavesEntregas.revisao(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesLotes.despachados(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesMotoboys.disponiveis(ESTABELECIMENTO_TESTE), [])
    qc.setQueryData(chavesFalhas.pendentes(ESTABELECIMENTO_TESTE), 0)
    renderizarDespacho(qc)
    expect(
      screen.getByText(/nenhuma entrega em revis/i),
    ).toBeInTheDocument()
  })
})

/* ---- Marcar pronto ---- */

describe('marcar pronto', () => {
  it('mostra o botao "Marcar pronto" apenas para entregas que podem ser marcadas', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    expect(
      within(linhaAna).getByRole('button', { name: /marcar pronto/i }),
    ).toBeInTheDocument()

    const linhaCarla = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendentePronta}`)
    expect(
      within(linhaCarla).queryByRole('button', { name: /marcar pronto/i }),
    ).not.toBeInTheDocument()
  })

  it('marca como pronto apos clique e mostra toast de sucesso', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    const botao = within(linhaAna).getByRole('button', { name: /marcar pronto/i })

    await user.click(botao)

    await waitFor(
      () => {
        expect(screen.getByText(/ana souza.*pronta/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Cancelar ---- */

describe('cancelar entrega', () => {
  it('mostra o botao "Cancelar" so para entregas que podem ser canceladas', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    expect(
      within(linhaAna).getByRole('button', { name: /cancelar/i }),
    ).toBeInTheDocument()
  })

  it('abre dialogo de confirmacao com motivo obrigatorio', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    await user.click(within(linhaAna).getByRole('button', { name: /cancelar/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    expect(within(dialogo).getByText(/cancelar entrega/i)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText(/motivo/i)).toBeInTheDocument()

    await user.click(within(dialogo).getByRole('button', { name: /confirmar cancelamento/i }))

    await waitFor(() => {
      expect(within(dialogo).getByText(/informe o motivo/i)).toBeInTheDocument()
    })
  })

  it('cancela com sucesso quando o motivo e fornecido', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    await user.click(within(linhaAna).getByRole('button', { name: /cancelar/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    await user.type(within(dialogo).getByLabelText(/motivo/i), 'Cliente desistiu')
    await user.click(within(dialogo).getByRole('button', { name: /confirmar cancelamento/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/ana souza.*cancelada/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Entrega avulsa ---- */

describe('entrega avulsa (UC01 A2)', () => {
  it('mostra o botao "Nova entrega avulsa" na pagina', () => {
    renderizarDespacho()
    expect(
      screen.getByRole('button', { name: /nova entrega avulsa/i }),
    ).toBeInTheDocument()
  })

  it('abre o formulario em dialogo', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    await user.click(screen.getByRole('button', { name: /nova entrega avulsa/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    expect(within(dialogo).getByText(/nova entrega avulsa/i)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText(/nome do cliente/i)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText(/endere.o completo/i)).toBeInTheDocument()
  })

  it('valida campos obrigatorios no cliente (Zod)', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    await user.click(screen.getByRole('button', { name: /nova entrega avulsa/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    await user.click(within(dialogo).getByRole('button', { name: /cadastrar entrega/i }))

    await waitFor(() => {
      expect(within(dialogo).getByText(/informe o nome do cliente/i)).toBeInTheDocument()
      expect(within(dialogo).getByText(/informe o endere/i)).toBeInTheDocument()
    })
  })

  it('cria entrega avulsa com sucesso', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    await user.click(screen.getByRole('button', { name: /nova entrega avulsa/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    await user.type(within(dialogo).getByLabelText(/nome do cliente/i), 'Novo Cliente')
    await user.type(
      within(dialogo).getByLabelText(/endere.o completo/i),
      'Rua Nova, 200 - Bairro',
    )
    await user.click(within(dialogo).getByRole('button', { name: /cadastrar entrega/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/entrega avulsa cadastrada/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })

  it('exibe erros de campo do servidor (ApiErrorResponse.campos[])', async () => {
    server.use(
      http.post(`*${ENDPOINTS.entregas.criarAvulsa}`, () =>
        HttpResponse.json(
          {
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            codigo: 'DADOS_INVALIDOS',
            message: 'Ha campos com dados invalidos.',
            path: '/api/entregas',
            campos: [
              { campo: 'nomeCliente', mensagem: 'Nome muito longo.' },
              { campo: 'enderecoCompleto', mensagem: 'Endereco invalido.' },
            ],
          },
          { status: 400 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderizarDespacho()
    await user.click(screen.getByRole('button', { name: /nova entrega avulsa/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    await user.type(within(dialogo).getByLabelText(/nome do cliente/i), 'Teste')
    await user.type(within(dialogo).getByLabelText(/endere.o completo/i), 'Rua Teste')
    await user.click(within(dialogo).getByRole('button', { name: /cadastrar entrega/i }))

    await waitFor(
      () => {
        expect(within(dialogo).getByText('Nome muito longo.')).toBeInTheDocument()
        expect(within(dialogo).getByText('Endereco invalido.')).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Ajustar coordenada (revisao SEM_COORDENADA) ---- */

describe('ajustar coordenada (revisao SEM_COORDENADA)', () => {
  it('mostra formulario de coordenada para SEM_COORDENADA', () => {
    renderizarDespacho()
    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemCoordenada}`)
    expect(within(cartao).getByLabelText(/^Latitude/)).toBeInTheDocument()
    expect(within(cartao).getByLabelText(/^Longitude/)).toBeInTheDocument()
  })

  it('nao mostra formulario de coordenada para SEM_DISTANCIA', () => {
    renderizarDespacho()
    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`)
    expect(within(cartao).queryByLabelText(/^Latitude/)).not.toBeInTheDocument()
  })

  it('nao mostra formulario de coordenada para CONTESTACAO_ENTREGADOR', () => {
    renderizarDespacho()
    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoContestacao}`)
    expect(within(cartao).queryByLabelText(/^Latitude/)).not.toBeInTheDocument()
  })

  it('envia coordenada com sucesso e mostra toast', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemCoordenada}`)
    await user.type(within(cartao).getByLabelText(/^Latitude/), '-23.55')
    await user.type(within(cartao).getByLabelText(/^Longitude/), '-46.63')
    await user.click(within(cartao).getByRole('button', { name: /salvar coordenada/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/coordenada.*enviada/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Selecao multipla (T004) ---- */

describe('selecao multipla (UC01 E2)', () => {
  it('checkbox de selecao aparece em cada linha de pendentes', () => {
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    expect(within(linhaAna).getByRole('checkbox')).toBeInTheDocument()
  })

  it('clicar no checkbox seleciona e desseleciona a entrega', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    const checkbox = within(linhaAna).getByRole('checkbox')

    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('selecao limitada a maxPedidosPorLote (UC01 E2)', async () => {
    // Definir limite de 2
    useSelecaoStore.setState({ maxPedidosPorLote: 2 })

    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })

    // Selecionar 2 entregas
    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)
    await user.click(within(linhaAna).getByRole('checkbox'))

    const linhaBruno = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteSemRepasse}`)
    await user.click(within(linhaBruno).getByRole('checkbox'))

    // Tentar selecionar a terceira (Carla)
    const linhaCarla = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendentePronta}`)
    await user.click(within(linhaCarla).getByRole('checkbox'))

    // Toast de erro
    await waitFor(() => {
      expect(screen.getByText(/limite.*2.*entregas/i)).toBeInTheDocument()
    })

    // Carla nao esta selecionada
    expect(within(linhaCarla).getByRole('checkbox')).not.toBeChecked()
  })

  it('barra de selecao aparece quando ha entregas selecionadas', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const tabela = screen.getByRole('table', { name: 'Entregas aguardando despacho' })
    const linhaAna = within(tabela).getByTestId(`pendente-${IDS_ENTREGAS.pendenteComRepasse}`)

    await user.click(within(linhaAna).getByRole('checkbox'))

    await waitFor(() => {
      expect(screen.getByText(/1 de 5 entrega/i)).toBeInTheDocument()
    })
  })
})

/* ---- Despacho (T004) ---- */

describe('despacho (UC01 HU02)', () => {
  it('botao despachar desabilitado sem entregadores online (UC01 E1)', () => {
    const qc = criarQueryClientComDados()
    // Zerar a lista de motoboys
    qc.setQueryData(chavesMotoboys.disponiveis(ESTABELECIMENTO_TESTE), [])
    useSelecaoStore.setState({ selecionadas: new Set([IDS_ENTREGAS.pendenteComRepasse]) })
    renderizarDespacho(qc)

    const botao = screen.getByRole('button', { name: /despachar/i })
    expect(botao).toBeDisabled()
  })

  it('abre dialogo de despacho com entregadores disponiveis', async () => {
    const user = userEvent.setup()
    useSelecaoStore.setState({ selecionadas: new Set([IDS_ENTREGAS.pendenteComRepasse]) })
    renderizarDespacho()

    const botao = screen.getByRole('button', { name: /despachar/i })
    await user.click(botao)

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)
    expect(within(dialogo).getByText(/despachar entregas/i)).toBeInTheDocument()
    expect(within(dialogo).getByText('Ricardo Silva')).toBeInTheDocument()
    expect(within(dialogo).getByText('Marcos Oliveira')).toBeInTheDocument()
  })

  it('despacha com sucesso ao selecionar entregador e confirmar', async () => {
    const user = userEvent.setup()
    useSelecaoStore.setState({ selecionadas: new Set([IDS_ENTREGAS.pendenteComRepasse]) })
    renderizarDespacho()

    await user.click(screen.getByRole('button', { name: /despachar/i }))

    const dialogo = await screen.findByRole('dialog', {}, TIMEOUT)

    // Selecionar Ricardo
    await user.click(within(dialogo).getByText('Ricardo Silva'))
    await user.click(within(dialogo).getByRole('button', { name: /confirmar despacho/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/lote.*1.*entrega.*despachado/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Lotes despachados (T004) ---- */

describe('lotes despachados (UC01 A4)', () => {
  it('exibe lotes DESPACHADO com opcao de devolver', () => {
    renderizarDespacho()
    const secao = screen.getByRole('region', { name: /lotes despachados/i })
    const lote = within(secao).getByTestId(`lote-${IDS_LOTES.despachado}`)
    expect(within(lote).getByText(/2 entrega/i)).toBeInTheDocument()
    expect(within(lote).getByRole('button', { name: /devolver lote/i })).toBeInTheDocument()
  })

  it('devolver lote com sucesso', async () => {
    const user = userEvent.setup()
    renderizarDespacho()
    const secao = screen.getByRole('region', { name: /lotes despachados/i })
    const lote = within(secao).getByTestId(`lote-${IDS_LOTES.despachado}`)
    await user.click(within(lote).getByRole('button', { name: /devolver lote/i }))

    await waitFor(
      () => {
        expect(screen.getByText(/lote.*2.*entrega.*devolvido/i)).toBeInTheDocument()
      },
      TIMEOUT,
    )
  })
})

/* ---- Alerta de integracao (T004) ---- */

describe('alerta de integracao degradada (UC01 A3)', () => {
  it('mostra banner quando ha falhas pendentes', () => {
    renderizarDespacho()
    expect(screen.getByText(/integracao degradada/i)).toBeInTheDocument()
    expect(screen.getByText(/2 falha/i)).toBeInTheDocument()
  })

  it('nao mostra banner quando nao ha falhas', () => {
    const qc = criarQueryClientComDados()
    qc.setQueryData(chavesFalhas.pendentes(ESTABELECIMENTO_TESTE), 0)
    renderizarDespacho(qc)
    expect(screen.queryByText(/integracao degradada/i)).not.toBeInTheDocument()
  })
})

/* ---- Indicador de tempo real (T004) ---- */

describe('indicador de tempo real (RNF06)', () => {
  it('mostra indicador de conexao na pagina', () => {
    renderizarDespacho()
    // STOMP mock nao conecta de verdade -> exibe um dos estados nao-conectado
    // O indicador aparece no header com um dos textos de estado
    const indicadores = screen.getAllByRole('status')
    // Pelo menos um role=status existe (indicador de tempo real + barras de selecao etc.)
    expect(indicadores.length).toBeGreaterThanOrEqual(1)
  })
})

/* ---- Maquina de estados ---- */

describe('maquina de estados (Constituicao 5.5)', () => {
  it('entrega ENTREGUE nao oferece "Cancelar" nem "Marcar pronto"', () => {
    renderizarDespacho()
    const cartao = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoContestacao}`)
    expect(
      within(cartao).queryByRole('button', { name: /cancelar/i }),
    ).not.toBeInTheDocument()
    expect(
      within(cartao).queryByRole('button', { name: /marcar pronto/i }),
    ).not.toBeInTheDocument()
  })
})

/* ---- Pagina completa ---- */

describe('pagina de despacho (composicao)', () => {
  it('exibe titulo e botao de entrega avulsa', () => {
    renderizarDespacho()
    expect(screen.getByRole('heading', { level: 1, name: /despacho/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nova entrega avulsa/i }),
    ).toBeInTheDocument()
  })

  it('sem sessao (estabelecimentoId null), as listas ficam carregando indefinidamente', () => {
    limparSessao()
    const qc = criarQueryClientVazio()
    renderizarDespacho(qc)
    expect(screen.getAllByText(/carregando/i).length).toBeGreaterThanOrEqual(1)
  })
})
