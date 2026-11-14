import { QueryClient } from '@tanstack/react-query'
import { redefinirSessao, usuarioDeTeste } from '@/test/sessao'
import {
  MENSAGEM_PERFIL_SEM_ACESSO,
  registrarLimpezaDeCache,
  useSessaoStore,
} from './sessaoStore'

/** Helper: monta DadosInicioSessao com token e refreshToken padrao. */
function dadosSessao(perfil: Parameters<typeof usuarioDeTeste>[0], token = 'jwt-teste') {
  return { usuario: usuarioDeTeste(perfil), token, refreshToken: 'refresh-teste' }
}

describe('store de sessao', () => {
  let queryClient: QueryClient
  let desregistrar: () => void

  beforeEach(() => {
    redefinirSessao()
    queryClient = new QueryClient()
    desregistrar = registrarLimpezaDeCache(() => queryClient.clear())
  })
  afterEach(() => desregistrar())

  it('inicia a sessao com usuario, token, refreshToken e estabelecimento', () => {
    const usuario = usuarioDeTeste('OPERADOR')
    const r = useSessaoStore.getState().iniciarSessao({ usuario, token: 'jwt-teste', refreshToken: 'refresh-teste' })
    expect(r).toEqual({ ok: true })
    const s = useSessaoStore.getState()
    expect(s.usuario).toEqual(usuario)
    expect(s.token).toBe('jwt-teste')
    expect(s.refreshToken).toBe('refresh-teste')
    expect(s.estabelecimentoId).toBe(usuario.estabelecimentoId)
  })

  it('ADMIN_GERAL fica sem estabelecimento', () => {
    useSessaoStore.getState().iniciarSessao(dadosSessao('ADMIN_GERAL'))
    expect(useSessaoStore.getState().estabelecimentoId).toBeNull()
  })

  it('recusa o ENTREGADOR com a mensagem propria (UC07, E4) e nao guarda nada', () => {
    const r = useSessaoStore.getState().iniciarSessao(dadosSessao('ENTREGADOR'))
    expect(r).toEqual({
      ok: false,
      motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE',
      mensagem: MENSAGEM_PERFIL_SEM_ACESSO,
    })
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('recusa perfil de loja sem estabelecimento (padrao restritivo)', () => {
    const usuario = { ...usuarioDeTeste('OPERADOR'), estabelecimentoId: null }
    const r = useSessaoStore.getState().iniciarSessao({ usuario, token: 'jwt', refreshToken: 'rt' })
    expect(r.ok).toBe(false)
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('encerrarSessao limpa a store e o cache do TanStack Query', () => {
    useSessaoStore.getState().iniciarSessao(dadosSessao('OPERADOR', 'x'))
    queryClient.setQueryData(['entregas'], [{ id: 1 }])
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)

    useSessaoStore.getState().encerrarSessao()

    const s = useSessaoStore.getState()
    expect(s.usuario).toBeNull()
    expect(s.token).toBeNull()
    expect(s.refreshToken).toBeNull()
    expect(s.estabelecimentoId).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('troca de usuario tambem limpa o cache', () => {
    useSessaoStore.getState().iniciarSessao(dadosSessao('OPERADOR'))
    queryClient.setQueryData(['caixa'], { id: 1 })
    useSessaoStore.getState().iniciarSessao(dadosSessao('ADMIN_RESTAURANTE'))
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('atualizarTokens muda os tokens sem re-validar perfil', () => {
    useSessaoStore.getState().iniciarSessao(dadosSessao('OPERADOR'))
    useSessaoStore.getState().atualizarTokens('novo-jwt', 'novo-refresh')
    const s = useSessaoStore.getState()
    expect(s.token).toBe('novo-jwt')
    expect(s.refreshToken).toBe('novo-refresh')
    expect(s.usuario?.perfil).toBe('OPERADOR')
  })

  it('nao grava nada em localStorage nem sessionStorage (Artigo 6.1)', () => {
    window.sessionStorage.clear()
    useSessaoStore.getState().iniciarSessao(dadosSessao('OPERADOR'))
    expect(window.sessionStorage.length).toBe(0)
    // eslint-disable-next-line no-restricted-properties -- so leitura, para provar que esta vazio
    expect(window.localStorage.length).toBe(0)
  })
})
