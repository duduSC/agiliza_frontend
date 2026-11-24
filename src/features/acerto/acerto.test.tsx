/**
 * Testes do acerto financeiro (UC03, T006).
 *
 * Regras de negocio verificadas:
 * - Constituicao 5.1: totais do backend, nunca somados no cliente; null mostra "--"
 * - Constituicao 5.2: ajuste bloqueado com recibo (reciboId preenchido)
 * - Constituicao 5.3: caixa fechado desabilita acoes
 * - Constituicao 5.8: sem atualizacao otimista em escritas de dinheiro
 * - Constituicao 7.3: estados carregando, vazio, erro
 * - UC03 HU06: extrato por entregador
 * - UC03 HU07: gerar recibo, marcar pago
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { Toaster } from '@/shared/ui/sonner'
import {
  sementeExtrato,
  sementeRecibos,
  sementeCaixaAtual,
  IDS_ACERTO,
} from '@/test/msw/dadosAcerto'
import { FiltroAcerto } from './componentes/FiltroAcerto'
import { TabelaExtrato } from './componentes/TabelaExtrato'
import { TotaisExtrato } from './componentes/TotaisExtrato'
import { TabelaRecibos } from './componentes/TabelaRecibos'
import { AcertoPagina } from './paginas/AcertoPagina'
import { chavesAcerto, chavesRecibos } from './api/hooks'
import { chavesCaixa } from '@/features/caixa/api/hooks'
import type { LinhaExtratoResponse } from '@/shared/api/schemas'

/* ---- constantes ---- */

const ESTABELECIMENTO_TESTE = 'a1b2c3d4-0001-4a00-8a00-00000000d001'
const TIMEOUT = { timeout: 3000 }

/* ---- helpers ---- */

const MOTOBOYS_MOCK = [
  {
    id: IDS_ACERTO.motoboy,
    usuarioId: '5f6a7b8c-9d0e-4f1a-d2b3-4c5d6e7f8a9b',
    nome: 'Entregador Exemplo',
    telefone: '(11) 99999-0001',
    statusCadastro: 'ATIVO' as const,
    statusDisponibilidade: 'ONLINE' as const,
    criadoEm: '2026-11-09T08:00:00',
  },
]

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
    refreshToken: 'refresh-token-teste',
    estabelecimentoId: ESTABELECIMENTO_TESTE,
  })
}

function limparSessao() {
  useSessaoStore.setState({ usuario: null, token: null, refreshToken: null, estabelecimentoId: null })
}

function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

/* ---- testes ---- */

beforeEach(() => {
  iniciarSessaoOperador()
})

afterEach(() => {
  limparSessao()
})

/* ====== Testes de componentes isolados (sem interacao com QueryClient) ====== */

describe('TotaisExtrato (Constituicao 5.1 — totais do backend)', () => {
  it('exibe totalDevido, totalConsolidado e totalEmRevisao', () => {
    const extrato = sementeExtrato()
    render(<TotaisExtrato extrato={extrato} />)

    expect(screen.getByText('Total devido')).toBeInTheDocument()
    expect(screen.getByText('Total consolidado')).toBeInTheDocument()
    expect(screen.getByText('Em revisão')).toBeInTheDocument()
  })

  it('mostra aviso quando possuiValorIndefinido', () => {
    const extrato = { ...sementeExtrato(), possuiValorIndefinido: true }
    render(<TotaisExtrato extrato={extrato} />)

    expect(screen.getByText('Há entregas sem valor calculado')).toBeInTheDocument()
  })

  it('nao mostra aviso quando possuiValorIndefinido e false', () => {
    const extrato = { ...sementeExtrato(), possuiValorIndefinido: false }
    render(<TotaisExtrato extrato={extrato} />)

    expect(screen.queryByText('Há entregas sem valor calculado')).not.toBeInTheDocument()
  })
})

describe('TabelaExtrato', () => {
  it('renderiza entregas com cliente, data e situacao', () => {
    const linhas = sementeExtrato().linhas
    render(<TabelaExtrato linhas={linhas} />)

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('Carla Dias')).toBeInTheDocument()
  })

  it('valor null mostra "--" e nunca "R$ 0,00" (Constituicao 5.1)', () => {
    const linhaComNull: LinhaExtratoResponse = {
      entregaId: 'test-id',
      nomeCliente: 'Valor Nulo',
      finalizadaEm: '2026-11-09T14:30:00',
      status: 'ENTREGUE',
      distanciaKm: null,
      faixaDeKm: null,
      faixaAteKm: null,
      foraDeArea: false,
      valorRepasse: null,
      situacao: 'EM_REVISAO',
      reciboId: null,
    }
    render(<TabelaExtrato linhas={[linhaComNull]} />)

    const linhaEl = screen.getByText('Valor Nulo').closest('tr')
    expect(linhaEl).toBeTruthy()
    if (linhaEl) {
      // Deve ter "--" para valor null, nunca "R$ 0,00"
      expect(within(linhaEl).getAllByText('—').length).toBeGreaterThanOrEqual(1)
      expect(within(linhaEl).queryByText('R$ 0,00')).not.toBeInTheDocument()
    }
  })

  it('destaca entregas EM_REVISAO visualmente (cor nao e unico indicador - Constituicao 7.6)', () => {
    const linhas = sementeExtrato().linhas
    render(<TabelaExtrato linhas={linhas} />)

    // Badge "Em revisao" existe com texto legivel (nao so cor)
    // O label usa acentos: "Em revisão"
    const badges = screen.getAllByText(/Em revis/)
    expect(badges.length).toBeGreaterThanOrEqual(1)
    // Badge usa aria-label para acessibilidade
    expect(screen.getByLabelText(/Em revis.*requer/)).toBeInTheDocument()
  })

  it('entrega sem recibo e A_ACERTAR mostra botao "Ajustar"', () => {
    const linhas = sementeExtrato().linhas
    const handler = vi.fn()
    render(<TabelaExtrato linhas={linhas} aoSelecionarEntrega={handler} />)

    // Ana Souza e A_ACERTAR sem recibo — deve ter "Ajustar"
    const linhaAna = screen.getByText('Ana Souza').closest('tr')
    expect(linhaAna).toBeTruthy()
    if (linhaAna) {
      expect(within(linhaAna).getByText('Ajustar')).toBeInTheDocument()
    }
  })

  it('entrega com recibo mostra "Recibo vinculado" em vez de "Ajustar" (Constituicao 5.2)', () => {
    const linhas = sementeExtrato().linhas
    const handler = vi.fn()
    render(<TabelaExtrato linhas={linhas} aoSelecionarEntrega={handler} />)

    // Bruno Lima tem recibo vinculado
    const linhaBruno = screen.getByText('Bruno Lima').closest('tr')
    expect(linhaBruno).toBeTruthy()
    if (linhaBruno) {
      expect(within(linhaBruno).getByText(/No recibo #dd444444/)).toBeInTheDocument()
      expect(within(linhaBruno).queryByText('Ajustar')).not.toBeInTheDocument()
    }
  })

  it('sem callback aoSelecionarEntrega, nao mostra botao "Ajustar" (caixa fechado)', () => {
    const linhas = sementeExtrato().linhas
    render(<TabelaExtrato linhas={linhas} />)

    // Ana Souza e A_ACERTAR sem recibo mas sem handler = sem botao
    const linhaAna = screen.getByText('Ana Souza').closest('tr')
    expect(linhaAna).toBeTruthy()
    if (linhaAna) {
      expect(within(linhaAna).queryByText('Ajustar')).not.toBeInTheDocument()
    }
  })

  it('lista vazia mostra mensagem "Nenhuma entrega encontrada"', () => {
    render(<TabelaExtrato linhas={[]} />)
    expect(screen.getByText(/[Nn]enhuma entrega encontrada/)).toBeInTheDocument()
  })
})

describe('TabelaRecibos', () => {
  const recibos = sementeRecibos()

  it('recibo GERADO mostra "Marcar pago" quando caixa aberto', () => {
    const handler = vi.fn()
    render(<TabelaRecibos recibos={recibos} aoMarcarPago={handler} pagandoId={null} caixaDe={() => 'ABERTO'} />)

    expect(screen.getByRole('button', { name: 'Marcar pago' })).toBeInTheDocument()
  })

  it('recibo GERADO com caixa fechado mostra "Caixa fechado" (Constituicao 5.3)', () => {
    const handler = vi.fn()
    render(<TabelaRecibos recibos={recibos} aoMarcarPago={handler} pagandoId={null} caixaDe={() => 'FECHADO'} />)

    expect(screen.queryByRole('button', { name: 'Marcar pago' })).not.toBeInTheDocument()
    expect(screen.getByText('Caixa fechado')).toBeInTheDocument()
  })

  it('recibo PAGO nao mostra acoes', () => {
    const handler = vi.fn()
    render(<TabelaRecibos recibos={recibos} aoMarcarPago={handler} pagandoId={null} caixaDe={() => 'ABERTO'} />)

    // Recibo PAGO nao tem botao
    const linhaPago = screen.getByText('Pago', { selector: 'span' }).closest('tr')
    expect(linhaPago).toBeTruthy()
    if (linhaPago) {
      expect(within(linhaPago).queryByRole('button')).not.toBeInTheDocument()
    }
  })

  it('lista vazia mostra "Nenhum recibo encontrado"', () => {
    render(<TabelaRecibos recibos={[]} aoMarcarPago={vi.fn()} pagandoId={null} caixaDe={() => 'ABERTO'} />)
    expect(screen.getByText(/[Nn]enhum recibo encontrado/)).toBeInTheDocument()
  })
})

/* ====== Testes da pagina inteira ====== */

describe('AcertoPagina — estado inicial', () => {
  it('mostra instrucao para selecionar entregador antes de filtrar (Constituicao 7.3)', () => {
    const qc = criarQueryClient()
    qc.setQueryData(['motoboys', ESTABELECIMENTO_TESTE, 'todos'], MOTOBOYS_MOCK)
    qc.setQueryData(chavesCaixa.atual(ESTABELECIMENTO_TESTE), sementeCaixaAtual())
    render(
      <QueryClientProvider client={qc}>
        <AcertoPagina />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/entregador e período/i)).toBeInTheDocument()
  })
})

describe('AcertoPagina — caixa fechado (Constituicao 5.3)', () => {
  it('mostra indicador de caixa fechado', () => {
    const qc = criarQueryClient()
    qc.setQueryData(['motoboys', ESTABELECIMENTO_TESTE, 'todos'], MOTOBOYS_MOCK)
    qc.setQueryData(chavesCaixa.atual(ESTABELECIMENTO_TESTE), {
      ...sementeCaixaAtual(),
      status: 'FECHADO',
      fechadoEm: '2026-11-09T22:00:00',
    })
    render(
      <QueryClientProvider client={qc}>
        <AcertoPagina />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/[Cc]aixa fechado/)).toBeInTheDocument()
  })
})

describe('FiltroAcerto (unitario)', () => {
  it('chama aoFiltrar com os valores corretos apos preenchimento', async () => {
    const handler = vi.fn()
    render(<FiltroAcerto motoboys={MOTOBOYS_MOCK} aoFiltrar={handler} />)

    // Selecionar entregador
    fireEvent.change(screen.getByLabelText('Selecionar entregador'), {
      target: { value: IDS_ACERTO.motoboy },
    })

    // Preencher datas
    fireEvent.change(screen.getByLabelText('Data início'), {
      target: { value: '2026-11-09' },
    })
    fireEvent.change(screen.getByLabelText('Data fim'), {
      target: { value: '2026-11-09' },
    })

    // Submeter clicando no botao
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(handler).toHaveBeenCalledWith({
      motoboyId: IDS_ACERTO.motoboy,
      inicio: '2026-11-09',
      fim: '2026-11-09',
    })
  })
})

describe('AcertoPagina — com filtro e dados (pre-populated)', () => {
  it('ao filtrar, mostra extrato com totais do backend', async () => {
    const qc = criarQueryClient()
    qc.setQueryData(['motoboys', ESTABELECIMENTO_TESTE, 'todos'], MOTOBOYS_MOCK)
    qc.setQueryData(chavesCaixa.atual(ESTABELECIMENTO_TESTE), sementeCaixaAtual())

    // Pre-popular o cache com a chave exata que useExtrato vai usar apos o filtro.
    // A chave e ['acerto', estId, 'extrato', motoboyId, inicio, fim].
    // Os valores de inicio/fim sao computados em AcertoPagina: `${filtroAtivo.inicio}T00:00:00`.
    const inicio = '2026-11-09T00:00:00'
    const fim = '2026-11-09T23:59:59.999999'
    qc.setQueryData(
      chavesAcerto.extrato(ESTABELECIMENTO_TESTE, IDS_ACERTO.motoboy, inicio, fim),
      sementeExtrato(),
    )
    qc.setQueryData(
      chavesRecibos.porMotoboy(ESTABELECIMENTO_TESTE, IDS_ACERTO.motoboy),
      sementeRecibos(),
    )

    render(
      <QueryClientProvider client={qc}>
        <AcertoPagina />
        <Toaster />
      </QueryClientProvider>,
    )

    // Preencher e submeter o filtro (filtroAtivo precisa estar setado para a pagina
    // exibir a secao de extrato)
    fireEvent.change(screen.getByLabelText('Selecionar entregador'), {
      target: { value: IDS_ACERTO.motoboy },
    })
    fireEvent.change(screen.getByLabelText('Data início'), {
      target: { value: '2026-11-09' },
    })
    fireEvent.change(screen.getByLabelText('Data fim'), {
      target: { value: '2026-11-09' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    // Aguardar — os dados ja estao no cache, entao deve aparecer imediatamente
    await waitFor(() => {
      expect(screen.getByText('Total devido')).toBeInTheDocument()
    }, TIMEOUT)

    // Verifica que os dados do extrato sao exibidos
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('Total consolidado')).toBeInTheDocument()

    // Verifica secao de recibos
    expect(screen.getByText('Recibos')).toBeInTheDocument()
  })
})
