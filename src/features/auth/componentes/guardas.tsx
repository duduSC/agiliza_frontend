/**
 * Guardas de rota. Sao CONVENIENCIA DE INTERFACE, nao seguranca (Constituicao, Artigo 6.3):
 * quem barra de fato e o backend.
 */
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  CAMINHO_INICIO,
  perfilAcessaBackoffice,
  podeAcessarTela,
  type ChaveTela,
} from '@/shared/dominio'
import { MENSAGEM_PERFIL_SEM_ACESSO, useSessaoStore } from '../sessaoStore'

export const CAMINHO_ACESSO_NEGADO = '/acesso-negado'
export const CAMINHO_LOGIN = '/login'

/**
 * Estado de navegacao levado ao /login: a rota protegida de onde o usuario veio (T008).
 * Fica no estado do historico do roteador, nunca em storage nem na URL.
 */
export type EstadoIdaAoLogin = { de?: string }

/** Sem sessao -> redireciona para /login (F7), guardando o destino para depois do login (T008). */
export function ExigirSessao({ children }: { children: ReactNode }) {
  const usuario = useSessaoStore((s) => s.usuario)
  const local = useLocation()
  if (!usuario) {
    const de = local.pathname === '/' ? undefined : `${local.pathname}${local.search}`
    const estado: EstadoIdaAoLogin = { de }
    return <Navigate to={CAMINHO_LOGIN} replace state={estado} />
  }
  // Defensivo: a store ja recusa o ENTREGADOR (UC07, E4), mas nunca renderizamos o app para ele.
  if (!perfilAcessaBackoffice(usuario.perfil)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="alert">{MENSAGEM_PERFIL_SEM_ACESSO}</p>
      </main>
    )
  }
  return <>{children}</>
}

/** Perfil sem permissão para a tela → `/acesso-negado`. */
export function ExigirPerfil({ tela, children }: { tela: ChaveTela; children: ReactNode }) {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  if (!perfil || !podeAcessarTela(perfil, tela)) {
    return <Navigate to={CAMINHO_ACESSO_NEGADO} replace />
  }
  return <>{children}</>
}

/** `/` e rotas desconhecidas → pagina inicial (T008; antes ia para a primeira tela do perfil). */
export function RedirecionarParaInicio() {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  const destino = perfil && perfilAcessaBackoffice(perfil) ? CAMINHO_INICIO : CAMINHO_ACESSO_NEGADO
  return <Navigate to={destino} replace />
}
