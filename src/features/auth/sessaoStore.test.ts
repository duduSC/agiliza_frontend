import { QueryClient } from '@tanstack/react-query'
import { redefinirSessao, usuarioDeTeste } from '@/test/sessao'
import {
  MENSAGEM_PERFIL_SEM_ACESSO,
  registrarLimpezaDeCache,
  useSessaoStore,
} from './sessaoStore'

describe('store de sessão', () => {
  let queryClient: QueryClient
  let desregistrar: () => void

  beforeEach(() => {
    redefinirSessao()
    queryClient = new QueryClient()
    desregistrar = registrarLimpezaDeCache(() => queryClient.clear())
  })
  afterEach(() => desregistrar())

  it('inicia a sessão com usuário, token e estabelecimento', () => {
    const usuario = usuarioDeTeste('OPERADOR')
    const r = useSessaoStore.getState().iniciarSessao({ usuario, token: 'jwt-teste' })
    expect(r).toEqual({ ok: true })
    const s = useSessaoStore.getState()
    expect(s.usuario).toEqual(usuario)
    expect(s.token).toBe('jwt-teste')
    expect(s.estabelecimentoId).toBe(usuario.estabelecimentoId)
  })

  it('token é opcional (sessão de desenvolvimento)', () => {
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('OPERADOR') })
    expect(useSessaoStore.getState().token).toBeNull()
  })

  it('ADMIN_GERAL fica sem estabelecimento', () => {
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('ADMIN_GERAL') })
    expect(useSessaoStore.getState().estabelecimentoId).toBeNull()
  })

  it('recusa o ENTREGADOR com a mensagem própria (UC07, E4) e não guarda nada', () => {
    const r = useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('ENTREGADOR') })
    expect(r).toEqual({
      ok: false,
      motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE',
      mensagem: MENSAGEM_PERFIL_SEM_ACESSO,
    })
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('recusa perfil de loja sem estabelecimento (padrão restritivo)', () => {
    const usuario = { ...usuarioDeTeste('OPERADOR'), estabelecimentoId: null }
    const r = useSessaoStore.getState().iniciarSessao({ usuario })
    expect(r.ok).toBe(false)
    expect(useSessaoStore.getState().usuario).toBeNull()
  })

  it('encerrarSessao limpa a store e o cache do TanStack Query', () => {
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('OPERADOR'), token: 'x' })
    queryClient.setQueryData(['entregas'], [{ id: 1 }])
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1)

    useSessaoStore.getState().encerrarSessao()

    const s = useSessaoStore.getState()
    expect(s.usuario).toBeNull()
    expect(s.token).toBeNull()
    expect(s.estabelecimentoId).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('troca de usuário também limpa o cache', () => {
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('OPERADOR') })
    queryClient.setQueryData(['caixa'], { id: 1 })
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('ADMIN_RESTAURANTE') })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('não grava nada em localStorage nem sessionStorage (Artigo 6.1)', () => {
    window.sessionStorage.clear()
    useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste('OPERADOR'), token: 'jwt' })
    expect(window.sessionStorage.length).toBe(0)
    // eslint-disable-next-line no-restricted-properties -- só leitura, para provar que está vazio
    expect(window.localStorage.length).toBe(0)
  })
})
