/**
 * Sessao do usuario -- SOMENTE EM MEMORIA (Constituicao, Artigo 6.1): nada aqui e gravado em
 * localStorage, sessionStorage, cookie ou URL. Recarregar a pagina encerra a sessao.
 *
 * F7: login real via JWT (UC07). O token de acesso e o refreshToken ficam ambos em memoria.
 */
import { create } from 'zustand'
import type { UsuarioAutenticadoResponse } from '@/shared/api/schemas'
import { perfilAcessaBackoffice } from '@/shared/dominio'

export const MENSAGEM_PERFIL_SEM_ACESSO =
  'Este acesso é exclusivo do painel administrativo. Use o aplicativo do entregador.'
export const MENSAGEM_SEM_ESTABELECIMENTO =
  'Usuário sem estabelecimento vinculado. Não é possível acessar o Backoffice.'

export type DadosInicioSessao = {
  usuario: UsuarioAutenticadoResponse
  token: string
  refreshToken: string
}

export type ResultadoInicioSessao =
  | { ok: true }
  | { ok: false; motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE' | 'SEM_ESTABELECIMENTO'; mensagem: string }

type EstadoSessao = {
  usuario: UsuarioAutenticadoResponse | null
  token: string | null
  refreshToken: string | null
  estabelecimentoId: string | null
  iniciarSessao: (dados: DadosInicioSessao) => ResultadoInicioSessao
  atualizarTokens: (token: string, refreshToken: string) => void
  encerrarSessao: () => void
}

const estadoVazio = { usuario: null, token: null, refreshToken: null, estabelecimentoId: null } as const

/**
 * Limpeza do cache do TanStack Query no encerramento (Constituicao, Artigo 6.2). Registrada
 * pelos `Providers`, que sao os donos do `QueryClient`.
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

  iniciarSessao: ({ usuario, token, refreshToken }) => {
    // UC07, E4 -- e o padrao restritivo (Artigo 1.3) para dados incoerentes.
    if (!perfilAcessaBackoffice(usuario.perfil)) {
      return { ok: false, motivo: 'PERFIL_SEM_ACESSO_BACKOFFICE', mensagem: MENSAGEM_PERFIL_SEM_ACESSO }
    }
    const estabelecimentoId = usuario.estabelecimentoId ?? null
    if (usuario.perfil !== 'ADMIN_GERAL' && estabelecimentoId === null) {
      return { ok: false, motivo: 'SEM_ESTABELECIMENTO', mensagem: MENSAGEM_SEM_ESTABELECIMENTO }
    }
    // Troca de usuario tambem limpa o cache (Artigo 6.2).
    limparCache()
    set({
      usuario,
      token,
      refreshToken,
      estabelecimentoId: usuario.perfil === 'ADMIN_GERAL' ? null : estabelecimentoId,
    })
    return { ok: true }
  },

  /** Atualiza os tokens apos refresh automatico (sem re-validar perfil). */
  atualizarTokens: (token: string, refreshToken: string) => {
    set({ token, refreshToken })
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

/** Leitura do refresh token fora do React (para o interceptor de refresh). */
export function obterRefreshTokenDaSessao(): string | null {
  return useSessaoStore.getState().refreshToken
}

/**
 * Chama `limpar` quando o dono da sessão muda: saída, entrada de outro usuário ou outra loja
 * (Constituição, Artigo 6.2; T010). Usado pelos estados de tela guardados em memória entre abas,
 * para um filtro de uma sessão nunca aparecer na seguinte.
 */
export function aoTrocarDeSessao(limpar: () => void): () => void {
  return useSessaoStore.subscribe((atual, anterior) => {
    if (
      atual.usuario?.usuarioId !== anterior.usuario?.usuarioId ||
      atual.estabelecimentoId !== anterior.estabelecimentoId
    ) {
      limpar()
    }
  })
}
