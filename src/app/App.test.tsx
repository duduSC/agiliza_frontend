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

describe('casca do app — sem sessão', () => {
  it('rota protegida sem sessão mostra "Sem sessão" com o seletor de dev (não uma tela de login)', async () => {
    renderizarApp('/despacho')
    await esperarTitulo('Sem sessão')
    expect(await screen.findByRole('form', { name: /sessão de desenvolvimento/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
  })

  it('iniciar sessão pelo seletor redireciona para a primeira tela do perfil', async () => {
    const user = userEvent.setup()
    const { local } = renderizarApp('/caixa')
    await user.selectOptions(await screen.findByLabelText('Perfil'), 'ADMIN_GERAL')
    await user.click(screen.getByRole('button', { name: /iniciar sessão/i }))
    await esperarTitulo('Restaurantes')
    expect(local.pathname).toBe('/restaurantes')
  })

  it('ENTREGADOR é recusado com a mensagem própria do UC07 E4', async () => {
    const user = userEvent.setup()
    renderizarApp('/')
    await user.selectOptions(await screen.findByLabelText('Perfil'), 'ENTREGADOR')
    await user.click(screen.getByRole('button', { name: /iniciar sessão/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_PERFIL_SEM_ACESSO)
    expect(useSessaoStore.getState().usuario).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
  })
})

describe('casca do app — guardas e menu por perfil', () => {
  it('OPERADOR em /despacho vê a página e o menu só com as telas de operação', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/despacho')
    await esperarTitulo('Despacho')
    expect(itensDoMenu()).toEqual(OPERACAO)
    expect(screen.getByTestId('nome-usuario')).toHaveTextContent('Operador (dev)')
  })

  it.each(['/loja/entregadores', '/loja/faixas-preco', '/loja/parametros', '/loja/integracao', '/restaurantes'])(
    'OPERADOR é barrado em %s',
    async (rota) => {
      entrarComo('OPERADOR')
      const { local } = renderizarApp(rota)
      await esperarTitulo('Acesso negado')
      expect(local.pathname).toBe('/acesso-negado')
    },
  )

  it.each(['/despacho', '/loja/parametros'])(
    'ADMIN_RESTAURANTE abre %s e vê no menu as telas da loja e as do operador',
    async (rota) => {
      entrarComo('ADMIN_RESTAURANTE')
      renderizarApp(rota)
      await esperarTitulo(rota === '/despacho' ? 'Despacho' : 'Parâmetros da loja')
      expect(itensDoMenu()).toEqual([...LOJA, ...OPERACAO])
    },
  )

  it('ADMIN_RESTAURANTE é barrado em /restaurantes', async () => {
    entrarComo('ADMIN_RESTAURANTE')
    renderizarApp('/restaurantes')
    await esperarTitulo('Acesso negado')
  })

  it.each(['/despacho', '/monitoramento', '/acerto', '/caixa', '/loja/entregadores'])(
    'ADMIN_GERAL é barrado em %s e só tem Restaurantes no menu',
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

describe('casca do app — "Reabrir caixa"', () => {
  it('aparece só para ADMIN_RESTAURANTE', async () => {
    entrarComo('ADMIN_RESTAURANTE')
    renderizarApp('/caixa')
    await esperarTitulo('Caixa')
    expect(screen.getByRole('button', { name: 'Reabrir caixa' })).toBeInTheDocument()
  })

  it('não aparece para OPERADOR', async () => {
    entrarComo('OPERADOR')
    renderizarApp('/caixa')
    await esperarTitulo('Caixa')
    expect(screen.queryByRole('button', { name: 'Reabrir caixa' })).not.toBeInTheDocument()
  })
})

describe('casca do app — Sair', () => {
  it('"Sair" esvazia a store e o cache do TanStack Query e volta para "Sem sessão"', async () => {
    const user = userEvent.setup()
    entrarComo('OPERADOR', 'jwt-teste')
    const { queryClient } = renderizarApp('/acerto')
    await esperarTitulo('Acerto')
    queryClient.setQueryData(['extrato', 'x'], { totalDevido: 10 })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await esperarTitulo('Sem sessão')
    const s = useSessaoStore.getState()
    expect(s.usuario).toBeNull()
    expect(s.token).toBeNull()
    expect(s.estabelecimentoId).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
