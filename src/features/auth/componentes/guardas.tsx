/**
 * Guardas de rota. São CONVENIÊNCIA DE INTERFACE, não segurança (Constituição, Artigo 6.3):
 * quem barra de fato é o backend.
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
import { TelaSemSessao } from '../paginas/TelaSemSessao'

export const CAMINHO_ACESSO_NEGADO = '/acesso-negado'

/** Sem sessão → "Sem sessão" (não há tela de login até a F7). */
export function ExigirSessao({ children }: { children: ReactNode }) {
  const usuario = useSessaoStore((s) => s.usuario)
  if (!usuario) return <TelaSemSessao />
  // Defensivo: a store já recusa o ENTREGADOR (UC07, E4), mas nunca renderizamos o app para ele.
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
