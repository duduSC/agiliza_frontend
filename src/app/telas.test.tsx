/**
 * T009, partes B e critérios de aceite: nenhuma tela fica em branco. Cada página é exercitada com
 * erro de renderização e, onde busca dados, com rede fora, 500, resposta fora do schema e resposta
 * lenta, sempre pelo caminho real (cliente HTTP, MSW e Zod).
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { criarQueryClient } from '@/app/queryClient'
import type { PerfilUsuario } from '@/shared/dominio'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const falha = vi.hoisted(() => {
  const estado = { tela: '' }
  function comFalha<P extends object, R>(tela: string, Real: (props: P) => R) {
    return function Falhavel(props: P) {
      if (estado.tela === tela) throw new Error('falha de renderização forçada pelo teste')
      return Real(props)
    }
  }
  return { estado, comFalha }
})

vi.mock('@/features/auth', async (original) => {
  const m = await original<typeof import('@/features/auth')>()
  return {
    ...m,
    LoginPagina: falha.comFalha('login', m.LoginPagina),
    AcessoNegadoPagina: falha.comFalha('acesso-negado', m.AcessoNegadoPagina),
  }
})
vi.mock('@/features/inicio', async (original) => {
  const m = await original<typeof import('@/features/inicio')>()
  return { InicioPagina: falha.comFalha('inicio', m.InicioPagina) }
})
vi.mock('@/features/despacho', async (original) => {
  const m = await original<typeof import('@/features/despacho')>()
  return { ...m, DespachoPagina: falha.comFalha('despacho', m.DespachoPagina) }
})
vi.mock('@/features/monitoramento', async (original) => {
  const m = await original<typeof import('@/features/monitoramento')>()
  return { ...m, MonitoramentoPagina: falha.comFalha('monitoramento', m.MonitoramentoPagina) }
})
vi.mock('@/features/acerto', async (original) => {
  const m = await original<typeof import('@/features/acerto')>()
  return { ...m, AcertoPagina: falha.comFalha('acerto', m.AcertoPagina) }
})
vi.mock('@/features/caixa', async (original) => {
  const m = await original<typeof import('@/features/caixa')>()
  return { ...m, CaixaPagina: falha.comFalha('caixa', m.CaixaPagina) }
})
vi.mock('@/features/restaurantes', async (original) => {
  const m = await original<typeof import('@/features/restaurantes')>()
  return { RestaurantesPagina: falha.comFalha('restaurantes', m.RestaurantesPagina) }
})
vi.mock('@/features/loja', async (original) => {
  const m = await original<typeof import('@/features/loja')>()
  return {
    ...m,
    EntregadoresPagina: falha.comFalha('entregadores', m.EntregadoresPagina),
    FaixasPrecoPagina: falha.comFalha('faixas', m.FaixasPrecoPagina),
    ParametrosLojaPagina: falha.comFalha('parametros', m.ParametrosLojaPagina),
    IntegracaoPagina: falha.comFalha('integracao', m.IntegracaoPagina),
  }
})

const ESPERA = { timeout: 10_000 }

function semRepeticao() {
  const cliente = criarQueryClient()
  cliente.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  return cliente
}

beforeEach(() => {
  redefinirSessao()
  falha.estado.tela = ''
})

describe('erro de renderização fica contido em cada página', () => {
  it.each<[string, string, PerfilUsuario | null]>([
    ['login', '/login', null],
    ['inicio', '/inicio', 'OPERADOR'],
    ['despacho', '/despacho', 'OPERADOR'],
    ['monitoramento', '/monitoramento', 'OPERADOR'],
    ['acerto', '/acerto', 'OPERADOR'],
    ['caixa', '/caixa', 'OPERADOR'],
    ['entregadores', '/loja/entregadores', 'ADMIN_RESTAURANTE'],
    ['faixas', '/loja/faixas-preco', 'ADMIN_RESTAURANTE'],
    ['parametros', '/loja/parametros', 'ADMIN_RESTAURANTE'],
    ['integracao', '/loja/integracao', 'ADMIN_RESTAURANTE'],
    ['restaurantes', '/restaurantes', 'ADMIN_GERAL'],
    ['acesso-negado', '/acesso-negado', 'OPERADOR'],
  ])('%s', async (tela, rota, perfil) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    if (perfil) entrarComo(perfil)
    falha.estado.tela = tela
    renderizarApp(rota, { queryClient: semRepeticao() })

    expect(await screen.findByText(/não foi possível exibir esta tela/i, undefined, ESPERA)).toBeInTheDocument()
    if (perfil) expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  })

  it('navegar para outra tela sai do erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    entrarComo('OPERADOR')
    falha.estado.tela = 'caixa'
    renderizarApp('/caixa', { queryClient: semRepeticao() })
    await screen.findByText(/não foi possível exibir esta tela/i, undefined, ESPERA)
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Início' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
  })
})

const TELAS_COM_DADOS = ['/inicio', '/despacho', '/monitoramento', '/acerto', '/caixa'] as const

describe.each(TELAS_COM_DADOS)('%s com a API falhando', (rota) => {
  it.each([
    ['rede fora', () => HttpResponse.error(), /não foi possível conectar ao servidor/i],
    ['500', () => new HttpResponse('<html>erro</html>', { status: 500 }), /erro inesperado no servidor/i],
    ['fora do schema', () => HttpResponse.json({ inesperado: true }), /formato inesperado/i],
  ] as const)('%s: mensagem e "Tentar novamente"', async (_caso, responder, mensagem) => {
    server.use(http.get('*/api/*', responder))
    entrarComo('OPERADOR')
    renderizarApp(rota, { queryClient: semRepeticao() })

    expect((await screen.findAllByText(mensagem, undefined, ESPERA)).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Tentar novamente' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('resposta lenta: mostra que está carregando', async () => {
    server.use(http.get('*/api/*', () => delay('infinite')))
    entrarComo('OPERADOR')
    renderizarApp(rota, { queryClient: semRepeticao() })
    await screen.findByRole('heading', { level: 1 }, ESPERA)
    expect((await screen.findAllByText(/^carregando/i, undefined, ESPERA)).length).toBeGreaterThan(0)
  })

  it('"Tentar novamente" recupera a tela quando a API volta', async () => {
    server.use(http.get('*/api/*', () => HttpResponse.error()))
    entrarComo('OPERADOR')
    renderizarApp(rota, { queryClient: semRepeticao() })
    await screen.findAllByRole('button', { name: 'Tentar novamente' }, ESPERA)
    server.resetHandlers()
    await waitFor(() => {
      screen.queryAllByRole('button', { name: 'Tentar novamente' }).forEach((b) => fireEvent.click(b))
      expect(screen.queryByText(/não foi possível conectar ao servidor/i)).not.toBeInTheDocument()
    }, { timeout: 5000, interval: 300 })
  })
})

describe('401, 403 e acesso negado', () => {
  it('401 em consulta da tela leva ao login', async () => {
    server.use(
      http.get('*/api/*', () => HttpResponse.json({ codigo: 'NAO_AUTENTICADO' }, { status: 401 })),
    )
    entrarComo('OPERADOR')
    const { local } = renderizarApp('/despacho', { queryClient: semRepeticao() })
    await waitFor(() => expect(local.pathname).toBe('/login'), ESPERA)
  })

  it('403 em consulta da tela leva a Acesso negado, que volta para /inicio (D011)', async () => {
    server.use(
      http.get('*/api/caixas/*', () => HttpResponse.json({ codigo: 'ACESSO_NEGADO' }, { status: 403 })),
    )
    entrarComo('OPERADOR')
    const { local } = renderizarApp('/caixa', { queryClient: semRepeticao() })
    await waitFor(() => expect(local.pathname).toBe('/acesso-negado'), ESPERA)
    expect(await screen.findByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/inicio')
  })
})

describe('login', () => {
  async function entrar(email: string) {
    renderizarApp('/login')
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: email } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } })
    return screen.getByRole('button', { name: 'Entrar' })
  }

  it('entregador: mensagem própria, em português correto (UC07 E4)', async () => {
    fireEvent.click(await entrar('motoboy@teste.com'))
    expect(await screen.findByText(/este acesso é exclusivo do painel administrativo/i)).toBeInTheDocument()
  })

  it('campos[] do servidor vão para o campo do formulário', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { codigo: 'DADOS_INVALIDOS', campos: [{ campo: 'loginEmail', mensagem: 'e-mail recusado' }] },
          { status: 400 },
        ),
      ),
    )
    fireEvent.click(await entrar('operador@teste.com'))
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('e-mail recusado'))
  })

  it('rede fora: mostra a mensagem', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()))
    fireEvent.click(await entrar('operador@teste.com'))
    expect(await screen.findByText(/não foi possível conectar ao servidor/i)).toBeInTheDocument()
  })
})
