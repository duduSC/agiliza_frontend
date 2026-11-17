/**
 * Pagina inicial (T008, decisao do Eduardo de 17/11/2026): destino depois do login e de `/`.
 *
 * Mostra quem esta logado (nome, perfil e, quando houver, o estabelecimento) e um atalho para
 * cada tela que AQUELE perfil acessa, pela mesma configuracao do menu (`telasDoPerfil`) -- menu,
 * guarda e atalhos nunca divergem. Sem metricas: nenhum numero aqui e inventado ou calculado.
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSessaoStore } from '@/features/auth'
import { useEstabelecimentoAtual } from '@/features/loja'
import { ehErroApi } from '@/shared/api'
import { LABEL_PERFIL_USUARIO, telasDoPerfil, type Tela } from '@/shared/dominio'
import { EstadoErro, EstadoVazio } from '@/shared/ui/estados'

export function InicioPagina() {
  const usuario = useSessaoStore((s) => s.usuario)
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)

  // ExigirSessao garante a sessao; isto so satisfaz o tipo.
  if (!usuario) return null
  const telas = telasDoPerfil(usuario.perfil)

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 id="titulo-pagina" className="text-xl font-semibold">
          Início
        </h1>
        <p className="text-sm text-muted-foreground">Bem-vindo ao Agiliza Delivery.</p>
      </header>

      <dl
        aria-label="Dados da sessão"
        className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-3"
      >
        <div>
          <dt className="text-xs text-muted-foreground">Usuário</dt>
          <dd className="font-medium" data-testid="inicio-nome">
            {usuario.nome}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Perfil</dt>
          <dd className="font-medium" data-testid="inicio-perfil">
            {LABEL_PERFIL_USUARIO[usuario.perfil]}
          </dd>
        </div>
        {estabelecimentoId !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">Estabelecimento</dt>
            <dd className="font-medium" data-testid="inicio-estabelecimento">
              <NomeEstabelecimento />
            </dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="titulo-atalhos" className="flex flex-col gap-3">
        <h2 id="titulo-atalhos" className="text-lg font-semibold">
          Atalhos
        </h2>
        {telas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma tela disponível"
            descricao="Este perfil não tem telas no painel administrativo."
          />
        ) : (
          <ul aria-label="Atalhos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {telas.map((tela) => (
              <li key={tela.chave}>
                <CartaoAtalho tela={tela} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

function CartaoAtalho({ tela }: { tela: Tela }) {
  return (
    <Link
      to={tela.caminho}
      className="group flex h-full flex-col gap-1 rounded-lg border bg-white p-4 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
    >
      <span className="flex items-center justify-between font-medium">
        {tela.titulo}
        <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="text-sm text-muted-foreground">{tela.descricao}</span>
    </Link>
  )
}

/** Nome do estabelecimento do token, com os estados de carregando e de erro. */
function NomeEstabelecimento() {
  const consulta = useEstabelecimentoAtual()

  if (consulta.isPending) {
    return (
      <span role="status" className="text-muted-foreground">
        Carregando…
      </span>
    )
  }
  if (consulta.isError) {
    const mensagem = ehErroApi(consulta.error)
      ? consulta.error.mensagem
      : 'Não foi possível carregar o estabelecimento.'
    return <EstadoErro mensagem={mensagem} aoTentarNovamente={() => void consulta.refetch()} />
  }
  return <>{consulta.data.nomeFantasia}</>
}
