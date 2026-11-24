/**
 * Pagina inicial (T008): dados da sessao, estabelecimento (com carregando/erro) e atalhos so
 * para as telas que o perfil acessa (mesma configuracao do menu).
 */
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { criarQueryClient } from '@/app/queryClient'
import { buscarEstabelecimentoAtual, chavesEstabelecimento } from '@/features/loja'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { PerfilUsuario } from '@/shared/dominio'
import { ID_ESTABELECIMENTO_MOCK } from '@/test/msw/handlersEstabelecimento'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

/**
 * Busca a loja pelo caminho real (cliente HTTP + Zod, via MSW) e entrega ao cache. Sem
 * `AbortSignal`: no jsdom o `fetch` do Node recusa o `AbortSignal` do jsdom (mesmo motivo de
 * `despacho.test.tsx` pre-popular o cache).
 */
async function queryClientComLoja() {
  const qc = criarQueryClient()
  const chave = chavesEstabelecimento.atual(ID_ESTABELECIMENTO_MOCK)
  try {
    qc.setQueryData(chave, await buscarEstabelecimentoAtual())
  } catch (erro) {
    // Sem isto a query em erro e refeita na montagem (e volta a `pending`, sem dado).
    qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, retryOnMount: false } })
    qc.getQueryCache()
      .build(qc, { queryKey: chave, retry: false })
      .setState({ status: 'error', error: erro instanceof Error ? erro : new Error('falha') })
  }
  return qc
}

function atalhos(): string[] {
  const lista = screen.getByRole('list', { name: 'Atalhos' })
  return within(lista)
    .getAllByRole('link')
    .map((l) => l.querySelector('span')?.textContent ?? '')
}

beforeEach(() => redefinirSessao())

describe('pagina inicial - atalhos por perfil', () => {
  it.each<[PerfilUsuario, string[]]>([
    ['OPERADOR', ['Despacho', 'Monitoramento', 'Acerto', 'Caixa', 'Relatório do dia']],
    [
      'ADMIN_RESTAURANTE',
      [
        'Entregadores',
        'Faixas de preço',
        'Parâmetros da loja',
        'Integração',
        'Despacho',
        'Monitoramento',
        'Acerto',
        'Caixa',
        'Relatório do dia',
      ],
    ],
    ['ADMIN_GERAL', ['Restaurantes']],
  ])('%s ve so os atalhos das telas que acessa', async (perfil, esperado) => {
    entrarComo(perfil)
    renderizarApp('/inicio')
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(atalhos()).toEqual(esperado)
  })

  it('o atalho leva para a tela', async () => {
    const user = userEvent.setup()
    entrarComo('OPERADOR')
    const { local } = renderizarApp('/inicio')
    const lista = await screen.findByRole('list', { name: 'Atalhos' })
    await user.click(within(lista).getByRole('link', { name: /Despacho/ }))
    await waitFor(() => expect(local.pathname).toBe('/despacho'))
  })

  it('"Inicio" e o primeiro item do menu', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/inicio')
    const menu = await screen.findByRole('navigation', { name: 'Menu principal' })
    expect(within(menu).getAllByRole('link')[0]).toHaveTextContent('Início')
  })
})

describe('pagina inicial - dados da sessao', () => {
  it('mostra nome, perfil e o estabelecimento vindo do backend', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/inicio', { queryClient: await queryClientComLoja() })
    expect(await screen.findByTestId('inicio-nome')).toHaveTextContent('Operador (teste)')
    expect(screen.getByTestId('inicio-perfil')).toHaveTextContent('Operador de logística')
    await waitFor(() =>
      expect(screen.getByTestId('inicio-estabelecimento')).toHaveTextContent('Pizzaria Demo'),
    )
  })

  it('ADMIN_GERAL nao tem estabelecimento e nao consulta a loja', async () => {
    let consultou = false
    server.use(
      http.get(`*${ENDPOINTS.estabelecimento.atual}`, () => {
        consultou = true
        return HttpResponse.json({})
      }),
    )
    entrarComo('ADMIN_GERAL')
    renderizarApp('/inicio')
    expect(await screen.findByTestId('inicio-perfil')).toHaveTextContent('Administrador geral')
    expect(screen.queryByTestId('inicio-estabelecimento')).not.toBeInTheDocument()
    expect(consultou).toBe(false)
  })

  it('erro ao buscar o estabelecimento aparece com opcao de tentar de novo', async () => {
    server.use(
      http.get(`*${ENDPOINTS.estabelecimento.atual}`, () =>
        HttpResponse.json(
          {
            timestamp: '2026-11-17T19:00:00',
            status: 404,
            error: 'Not Found',
            codigo: 'ESTABELECIMENTO_NAO_ENCONTRADO',
            message: 'Estabelecimento nao encontrado',
            path: '/api/estabelecimento',
          },
          { status: 404 },
        ),
      ),
    )
    entrarComo('OPERADOR')
    renderizarApp('/inicio', { queryClient: await queryClientComLoja() })
    const campo = await screen.findByTestId('inicio-estabelecimento')
    expect(await within(campo).findByRole('alert')).toBeInTheDocument()
    expect(within(campo).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    // Os atalhos continuam disponiveis.
    expect(atalhos()).toContain('Despacho')
  })
})

describe('login -> /inicio (T008)', () => {
  async function fazerLogin() {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/e-mail/i), 'operador@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
  }

  it('sem destino guardado, o login leva para /inicio', async () => {
    const { local } = renderizarApp('/')
    await waitFor(() => expect(local.pathname).toBe('/login'))
    await fazerLogin()
    await waitFor(() => expect(local.pathname).toBe('/inicio'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
  })

  it('vindo de uma rota protegida, o login volta para ela', async () => {
    const { local } = renderizarApp('/acerto')
    await waitFor(() => expect(local.pathname).toBe('/login'))
    await fazerLogin()
    await waitFor(() => expect(local.pathname).toBe('/acerto'))
  })
})
