import { Link } from 'react-router-dom'
import { primeiraTelaDoPerfil } from '@/shared/dominio'
import { useSessaoStore } from '../sessaoStore'

/** Rota sem permissão ou resposta 403 da API (Constituição, Artigo 6.3). */
export function AcessoNegadoPagina() {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  const inicio = perfil ? primeiraTelaDoPerfil(perfil) : null

  return (
    <section className="flex flex-col items-start gap-3" aria-labelledby="titulo-acesso-negado">
      <h1 id="titulo-acesso-negado" className="text-xl font-semibold">
        Acesso negado
      </h1>
      <p className="text-sm text-muted-foreground">
        Seu perfil não tem permissão para acessar esta tela.
      </p>
      {inicio && (
        <Link to={inicio} className="text-sm font-medium text-primary underline underline-offset-4">
          Voltar para o início
        </Link>
      )}
    </section>
  )
}
