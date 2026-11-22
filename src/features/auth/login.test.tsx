/**
 * Testes da tela de login (T007, UC07, HU13).
 * - Login com sucesso vai para /inicio, ou para o destino guardado pelo ExigirSessao (T008).
 * - Login com credenciais invalidas mostra mensagem generica (Constituicao 6.7).
 * - ENTREGADOR recebe mensagem especifica (UC07 E4).
 * - Validacao local de campos.
 */
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useSessaoStore, MENSAGEM_PERFIL_SEM_ACESSO } from '@/features/auth'
import { LoginPagina } from './paginas/LoginPagina'
import { MENSAGENS_ERRO } from '@/shared/api/erros'
import { server } from '@/test/msw/server'
import { ENDPOINTS } from '@/shared/api'

function erroApi(status: number, codigo: string, message: string) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      error: 'Unauthorized',
      codigo,
      message,
      path: '/api/auth/login',
    },
    { status },
  )
}

/** Captura a localidade atual do roteador. */
function EspiaoDeLocal({ local }: { local: { pathname: string } }) {
  local.pathname = useLocation().pathname
  return null
}

function renderizarLogin(estado?: { de?: string }) {
  const local = { pathname: '/login' }
  const resultado = render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: estado }]}>
      <LoginPagina />
      <EspiaoDeLocal local={local} />
    </MemoryRouter>,
  )
  return { ...resultado, local }
}

beforeEach(() => {
  useSessaoStore.setState({ usuario: null, token: null, refreshToken: null, estabelecimentoId: null })
})

describe('tela de login - destino guardado (T008)', () => {
  async function entrarComoOperador() {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/e-mail/i), 'operador@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
  }

  it('volta para a rota protegida que mandou ao login', async () => {
    const { local } = renderizarLogin({ de: '/acerto' })
    await entrarComoOperador()
    await waitFor(() => expect(local.pathname).toBe('/acerto'))
  })

  it('destino que o perfil nao acessa vai para /inicio', async () => {
    const { local } = renderizarLogin({ de: '/loja/parametros' })
    await entrarComoOperador()
    await waitFor(() => expect(local.pathname).toBe('/inicio'))
  })

  it('destino externo nunca e seguido', async () => {
    const { local } = renderizarLogin({ de: 'https://exemplo.com/despacho' })
    await entrarComoOperador()
    await waitFor(() => expect(local.pathname).toBe('/inicio'))
  })
})

describe('tela de login', () => {
  it('renderiza o formulario de login', () => {
    renderizarLogin()
    expect(screen.getByRole('heading', { level: 1, name: 'Agiliza Delivery' })).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('valida campos vazios antes de enviar', async () => {
    const user = userEvent.setup()
    renderizarLogin()
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    // O formulario nao envia com campos vazios
    expect(screen.getByText(/informe um e-mail/i)).toBeInTheDocument()
    expect(screen.getByText(/informe a senha/i)).toBeInTheDocument()
  })

  it('valida e-mail invalido', async () => {
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'nao-e-email')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument()
  })

  it('login com sucesso como OPERADOR redireciona para /inicio (T008)', async () => {
    const user = userEvent.setup()
    const { local } = renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'operador@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(local.pathname).toBe('/inicio'))
    expect(useSessaoStore.getState().usuario).not.toBeNull()
    expect(useSessaoStore.getState().usuario?.perfil).toBe('OPERADOR')
    expect(useSessaoStore.getState().token).toBe('jwt-operador-mock')
    expect(useSessaoStore.getState().refreshToken).toBe('refresh-token-valido')
  })

  it('login com sucesso como ADMIN_GERAL redireciona para /inicio (T008)', async () => {
    const user = userEvent.setup()
    const { local } = renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'admin@agiliza.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(local.pathname).toBe('/inicio'))
    expect(useSessaoStore.getState().usuario?.perfil).toBe('ADMIN_GERAL')
  })

  it('credenciais invalidas mostra mensagem generica (Constituicao 6.7)', async () => {
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'errado@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senhaerrada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGENS_ERRO.CREDENCIAIS_INVALIDAS)
  })

  it('ESTABELECIMENTO_INATIVO mostra mensagem propria', async () => {
    server.use(
      http.post(`*${ENDPOINTS.auth.login}`, () =>
        erroApi(403, 'ESTABELECIMENTO_INATIVO', 'Loja inativa'),
      ),
    )
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'qualquer@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGENS_ERRO.ESTABELECIMENTO_INATIVO)
  })

  it('USUARIO_BLOQUEADO mostra mensagem propria', async () => {
    server.use(
      http.post(`*${ENDPOINTS.auth.login}`, () =>
        erroApi(403, 'USUARIO_BLOQUEADO', 'Bloqueado'),
      ),
    )
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'qualquer@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGENS_ERRO.USUARIO_BLOQUEADO)
  })

  it('ENTREGADOR recebe mensagem especifica (UC07 E4)', async () => {
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'motoboy@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_PERFIL_SEM_ACESSO)
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('mostra "Entrando..." durante a requisicao', async () => {
    // Atrasa a resposta para capturar o estado intermediario
    server.use(
      http.post(`*${ENDPOINTS.auth.login}`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return erroApi(401, 'CREDENCIAIS_INVALIDAS', 'Invalido')
      }),
    )
    const user = userEvent.setup()
    renderizarLogin()
    await user.type(screen.getByLabelText(/e-mail/i), 'qualquer@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()
    // Espera a resposta voltar
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled()
  })
})
