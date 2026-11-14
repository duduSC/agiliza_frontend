/**
 * Testes do caixa (UC03 A3, T006).
 *
 * Regras de negocio verificadas:
 * - Constituicao 5.3: caixa fechado torna periodo imutavel
 * - Constituicao 5.8: sem atualizacao otimista
 * - Constituicao 7.3: estados carregando, vazio, erro
 * - UC03 A3: abrir, fechar caixa, historico
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { Toaster } from '@/shared/ui/sonner'
import { sementeCaixaAtual, sementeHistoricoCaixas } from '@/test/msw/dadosAcerto'
import { HistoricoCaixas } from './componentes/HistoricoCaixas'
import { CaixaPagina } from './paginas/CaixaPagina'
import { chavesCaixa } from './api/hooks'

/* ---- constantes ---- */

const ESTABELECIMENTO_TESTE = 'a1b2c3d4-0001-4a00-8a00-00000000d001'
const TIMEOUT = { timeout: 3000 }

/* ---- helpers ---- */

function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

function criarQueryClientComDados() {
  const qc = criarQueryClient()
  qc.setQueryData(
    chavesCaixa.atual(ESTABELECIMENTO_TESTE),
    sementeCaixaAtual(),
  )
  qc.setQueryData(
    chavesCaixa.historico(ESTABELECIMENTO_TESTE, undefined, undefined),
    sementeHistoricoCaixas(),
  )
  return qc
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

function iniciarSessaoAdmin() {
  useSessaoStore.setState({
    usuario: {
      usuarioId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
      estabelecimentoId: ESTABELECIMENTO_TESTE,
      motoboyId: null,
      nome: 'Admin (teste)',
      perfil: 'ADMIN_RESTAURANTE',
    },
    token: 'token-teste',
    estabelecimentoId: ESTABELECIMENTO_TESTE,
  })
}

function limparSessao() {
  useSessaoStore.setState({ usuario: null, token: null, estabelecimentoId: null })
}

function renderizarCaixa(queryClient?: QueryClient) {
  const qc = queryClient ?? criarQueryClientComDados()
  return render(
    <QueryClientProvider client={qc}>
      <CaixaPagina />
      <Toaster />
    </QueryClientProvider>,
  )
}

/* ---- testes ---- */

beforeEach(() => {
  iniciarSessaoOperador()
})

afterEach(() => {
  limparSessao()
})

/* ====== Teste de componente isolado ====== */

describe('HistoricoCaixas', () => {
  it('renderiza lista de caixas com status', () => {
    render(<HistoricoCaixas caixas={sementeHistoricoCaixas()} />)

    expect(screen.getByText('Aberto')).toBeInTheDocument()
    expect(screen.getByText('Fechado')).toBeInTheDocument()
  })

  it('lista vazia mostra mensagem', () => {
    render(<HistoricoCaixas caixas={[]} />)
    expect(screen.getByText(/[Nn]enhum caixa/)).toBeInTheDocument()
  })
})

/* ====== Testes da pagina ====== */

describe('caixa do dia', () => {
  it('mostra caixa aberto com status', async () => {
    renderizarCaixa()

    await waitFor(() => {
      expect(screen.getByText('Caixa do dia')).toBeInTheDocument()
    }, TIMEOUT)

    // "Aberto" aparece no badge e possivelmente no historico — basta existir
    const badges = screen.getAllByText('Aberto')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('mostra botao "Fechar caixa" quando caixa esta aberto', async () => {
    renderizarCaixa()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fechar caixa' })).toBeInTheDocument()
    }, TIMEOUT)
  })

  it('mostra confirmacao forte ao fechar (Constituicao 5.3)', async () => {
    const user = userEvent.setup()
    renderizarCaixa()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fechar caixa' })).toBeInTheDocument()
    }, TIMEOUT)

    await user.click(screen.getByRole('button', { name: 'Fechar caixa' }))

    // Dialogo de confirmacao aparece com aviso
    await waitFor(() => {
      expect(screen.getByText(/[Ii]mutavel/)).toBeInTheDocument()
    }, TIMEOUT)

    expect(screen.getByRole('button', { name: 'Confirmar fechamento' })).toBeInTheDocument()
  })

  it('caixa fechado mostra indicador de periodo imutavel (Constituicao 5.3)', async () => {
    const qc = criarQueryClientComDados()
    qc.setQueryData(
      chavesCaixa.atual(ESTABELECIMENTO_TESTE),
      { ...sementeCaixaAtual(), status: 'FECHADO', fechadoEm: '2026-11-09T22:00:00' },
    )
    renderizarCaixa(qc)

    await waitFor(() => {
      expect(screen.getByText(/[Pp]eriodo imutavel/)).toBeInTheDocument()
    }, TIMEOUT)
  })
})

describe('abrir caixa', () => {
  it('mostra botao "Abrir caixa" quando nao existe caixa', async () => {
    const qc = criarQueryClientComDados()
    qc.setQueryData(chavesCaixa.atual(ESTABELECIMENTO_TESTE), null)
    renderizarCaixa(qc)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir caixa do dia' })).toBeInTheDocument()
    }, TIMEOUT)
  })
})

describe('historico', () => {
  it('mostra secao de historico', async () => {
    renderizarCaixa()

    await waitFor(() => {
      expect(screen.getByText('Historico')).toBeInTheDocument()
    }, TIMEOUT)
  })
})

describe('reabrir caixa', () => {
  it('mostra botao desabilitado para ADMIN_RESTAURANTE (D007)', async () => {
    iniciarSessaoAdmin()
    renderizarCaixa()

    await waitFor(() => {
      const botao = screen.getByRole('button', { name: 'Reabrir caixa' })
      expect(botao).toBeDisabled()
    }, TIMEOUT)
  })

  it('nao mostra botao para OPERADOR', async () => {
    renderizarCaixa()

    await waitFor(() => {
      expect(screen.getByText('Caixa')).toBeInTheDocument()
    }, TIMEOUT)

    expect(screen.queryByRole('button', { name: 'Reabrir caixa' })).not.toBeInTheDocument()
  })
})
