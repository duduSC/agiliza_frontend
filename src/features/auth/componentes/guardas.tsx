/**
 * Guardas de rota. Sao CONVENIENCIA DE INTERFACE, nao seguranca (Constituicao, Artigo 6.3):
 * quem barra de fato e o backend.
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  perfilAcessaBackoffice,
  podeAcessarTela,
  primeiraTelaDoPerfil,
  type ChaveTela,
} from '@/shared/dominio'
import { MENSAGEM_PERFIL_SEM_ACESSO, useSessaoStore } from '../sessaoStore'

export const CAMINHO_ACESSO_NEGADO = '/acesso-negado'
export const CAMINHO_LOGIN = '/login'

/** Sem sessao -> redireciona para /login (F7). */
export function ExigirSessao({ children }: { children: ReactNode }) {
  const usuario = useSessaoStore((s) => s.usuario)
  if (!usuario) return <Navigate to={CAMINHO_LOGIN} replace />
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

/** `/` e rotas desconhecidas → primeira tela do perfil. */
export function RedirecionarParaInicio() {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  const destino = perfil ? primeiraTelaDoPerfil(perfil) : null
  return <Navigate to={destino ?? CAMINHO_ACESSO_NEGADO} replace />
}
