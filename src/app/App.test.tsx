import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MENSAGEM_PERFIL_SEM_ACESSO, useSessaoStore } from '@/features/auth'
import type { PerfilUsuario } from '@/shared/dominio'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const OPERACAO = ['Despacho', 'Monitoramento', 'Acerto', 'Caixa']
const LOJA = ['Entregadores', 'Faixas de preço', 'Parâmetros da loja', 'Integração']

function itensDoMenu(): string[] {
  const menu = screen.getByRole('navigation', { name: 'Menu principal' })
  return within(menu)
    .getAllByRole('link')
    .map((l) => l.textContent ?? '')
}

async function esperarTitulo(titulo: string) {
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
}

beforeEach(() => redefinirSessao())

describe('casca do app - sem sessao', () => {
  it('rota protegida sem sessao redireciona para /login', async () => {
    const { local } = renderizarApp('/despacho')
    await waitFor(() => expect(local.pathname).toBe('/login'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Agiliza Delivery' })).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('rota / sem sessao redireciona para /login', async () => {
    const { local } = renderizarApp('/')
    await waitFor(() => expect(local.pathname).toBe('/login'))
  })
})

describe('casca do app - guardas e menu por perfil', () => {
  it('OPERADOR em /despacho ve a pagina e o menu so com as telas de operacao', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/despacho')
    await esperarTitulo('Despacho')
    expect(itensDoMenu()).toEqual(OPERACAO)
    expect(screen.getByTestId('nome-usuario')).toHaveTextContent('Operador (teste)')
  })

  it.each(['/loja/entregadores', '/loja/faixas-preco', '/loja/parametros', '/loja/integracao', '/restaurantes'])(
    'OPERADOR e barrado em %s',
    async (rota) => {
      entrarComo('OPERADOR')
      const { local } = renderizarApp(rota)
      await esperarTitulo('Acesso negado')
      expect(local.pathname).toBe('/acesso-negado')
    },
  )

  it.each(['/despacho', '/loja/parametros'])(
    'ADMIN_RESTAURANTE abre %s e ve no menu as telas da loja e as do operador',
    async (rota) => {
      entrarComo('ADMIN_RESTAURANTE')
      renderizarApp(rota)
      await esperarTitulo(rota === '/despacho' ? 'Despacho' : 'Parâmetros da loja')
      expect(itensDoMenu()).toEqual([...LOJA, ...OPERACAO])
    },
  )

  it('ADMIN_RESTAURANTE e barrado em /restaurantes', async () => {
    entrarComo('ADMIN_RESTAURANTE')
    renderizarApp('/restaurantes')
    await esperarTitulo('Acesso negado')
  })

  it.each(['/despacho', '/monitoramento', '/acerto', '/caixa', '/loja/entregadores'])(
    'ADMIN_GERAL e barrado em %s e so tem Restaurantes no menu',
    async (rota) => {
      entrarComo('ADMIN_GERAL')
      renderizarApp(rota)
      await esperarTitulo('Acesso negado')
      expect(itensDoMenu()).toEqual(['Restaurantes'])
    },
  )

  it.each<[PerfilUsuario, string]>([
    ['ADMIN_GERAL', '/restaurantes'],
    ['ADMIN_RESTAURANTE', '/loja/entregadores'],
    ['OPERADOR', '/despacho'],
  ])('%s em "/" vai para a primeira tela do perfil (%s)', async (perfil, destino) => {
    entrarComo(perfil)
    const { local } = renderizarApp('/')
    await waitFor(() => expect(local.pathname).toBe(destino))
  })

  it('rota desconhecida volta para a primeira tela do perfil', async () => {
    entrarComo('OPERADOR')
    const { local } = renderizarApp('/nao-existe')
    await waitFor(() => expect(local.pathname).toBe('/despacho'))
  })
})

describe('casca do app - "Reabrir caixa"', () => {
  it('aparece so para ADMIN_RESTAURANTE', async () => {
    entrarComo('ADMIN_RESTAURANTE')
    renderizarApp('/caixa')
    await esperarTitulo('Caixa')
    expect(screen.getByRole('button', { name: 'Reabrir caixa' })).toBeInTheDocument()
  })

  it('nao aparece para OPERADOR', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/caixa')
    await esperarTitulo('Caixa')
    expect(screen.queryByRole('button', { name: 'Reabrir caixa' })).not.toBeInTheDocument()
  })
})

describe('casca do app - Sair', () => {
  it('"Sair" esvazia a store e o cache do TanStack Query e vai para /login', async () => {
    const user = userEvent.setup()
    entrarComo('OPERADOR', 'jwt-teste')
    const { queryClient, local } = renderizarApp('/acerto')
    await esperarTitulo('Acerto')
    queryClient.setQueryData(['extrato', 'x'], { totalDevido: 10 })
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThanOrEqual(1)

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(local.pathname).toBe('/login'))
    const s = useSessaoStore.getState()
    expect(s.usuario).toBeNull()
    expect(s.token).toBeNull()
    expect(s.refreshToken).toBeNull()
    expect(s.estabelecimentoId).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})

describe('casca do app - ENTREGADOR', () => {
  it('ENTREGADOR e recusado com a mensagem propria do UC07 E4', async () => {
    // Tenta logar como ENTREGADOR via store diretamente
    const resultado = useSessaoStore.getState().iniciarSessao({
      usuario: {
        usuarioId: 'b1b2c3d4-0004-4b00-8b00-00000000e004',
        estabelecimentoId: 'a1b2c3d4-0001-4a00-8a00-00000000d001',
        motoboyId: 'c1b2c3d4-0001-4c00-8c00-00000000f001',
        nome: 'Entregador (teste)',
        perfil: 'ENTREGADOR',
      },
      token: 'jwt-entregador',
      refreshToken: 'refresh-entregador',
    })
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.motivo).toBe('PERFIL_SEM_ACESSO_BACKOFFICE')
      expect(resultado.mensagem).toBe(MENSAGEM_PERFIL_SEM_ACESSO)
    }
    expect(useSessaoStore.getState().usuario).toBeNull()
  })
})
