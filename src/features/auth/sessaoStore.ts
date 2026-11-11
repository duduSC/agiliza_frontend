/**
 * Sessão do usuário — SOMENTE EM MEMÓRIA (Constituição, Artigo 6.1): nada aqui é gravado em
 * localStorage, sessionStorage, cookie ou URL. Recarregar a página encerra a sessão.
 *
 * Até a F7 a sessão é preenchida pelo seletor de desenvolvimento (PROVISÓRIO); na F7 o login
 * real (UC07) passa a chamar `iniciarSessao` com o token e o `UsuarioAutenticadoResponse`.
 */
import { create } from 'zustand'
import type { UsuarioAutenticadoResponse } from '@/shared/api/schemas'
import { perfilAcessaBackoffice } from '@/shared/dominio'

export const MENSAGEM_PERFIL_SEM_ACESSO =
  'O perfil Entregador não acessa o Backoffice. Use o aplicativo do entregador no celular.'
export const MENSAGEM_SEM_ESTABELECIMENTO =
  'Usuário sem estabelecimento vinculado. Não é possível acessar o Backoffice.'

export type DadosInicioSessao = {
  usuario: UsuarioAutenticadoResponse
  /** Opcional até a F7: a sessão de desenvolvimento não tem JWT. */
  token?: string | null
}

export type ResultadoInicioSessao =
  | { ok: true }
  | { ok: false; motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE' | 'SEM_ESTABELECIMENTO'; mensagem: string }

type EstadoSessao = {
  usuario: UsuarioAutenticadoResponse | null
  token: string | null
  estabelecimentoId: string | null
  iniciarSessao: (dados: DadosInicioSessao) => ResultadoInicioSessao
  encerrarSessao: () => void
}

const estadoVazio = { usuario: null, token: null, estabelecimentoId: null } as const

/**
 * Limpeza do cache do TanStack Query no encerramento (Constituição, Artigo 6.2). Registrada
 * pelos `Providers`, que são os donos do `QueryClient`.
 */
let limparCache: () => void = () => {}

export function registrarLimpezaDeCache(fn: () => void): () => void {
  limparCache = fn
  return () => {
    if (limparCache === fn) limparCache = () => {}
  }
}

export const useSessaoStore = create<EstadoSessao>()((set) => ({
  ...estadoVazio,

  iniciarSessao: ({ usuario, token = null }) => {
    // UC07, E4 — e o padrão restritivo (Artigo 1.3) para dados incoerentes.
    if (!perfilAcessaBackoffice(usuario.perfil)) {
      return { ok: false, motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE', mensagem: MENSAGEM_PERFIL_SEM_ACESSO }
    }
    const estabelecimentoId = usuario.estabelecimentoId ?? null
    if (usuario.perfil !== 'ADMIN_GERAL' && estabelecimentoId === null) {
      return { ok: false, motivo: 'SEM_ESTABELECIMENTO', mensagem: MENSAGEM_SEM_ESTABELECIMENTO }
    }
    // Troca de usuário também limpa o cache (Artigo 6.2).
    limparCache()
    set({
      usuario,
      token,
      estabelecimentoId: usuario.perfil === 'ADMIN_GERAL' ? null : estabelecimentoId,
    })
    return { ok: true }
  },

  encerrarSessao: () => {
    set({ ...estadoVazio })
    limparCache()
  },
}))

/** Leitura fora do React (cliente HTTP). */
export function obterTokenDaSessao(): string | null {
  return useSessaoStore.getState().token
}
