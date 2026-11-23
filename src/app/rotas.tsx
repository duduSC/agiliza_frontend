/**
 * Rotas do Backoffice (AGENT.md, secao 7). Cada tela fica atras de `ExigirPerfil` com a mesma
 * chave usada no menu (`shared/dominio/permissoes.ts`), para menu e guarda nunca divergirem.
 *
 * T007: /login fora do ExigirSessao; rotas protegidas redirecionam para /login sem sessao.
 * T008: /inicio e o destino de / e de rotas desconhecidas.
 */
import { lazy, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import {
  AcessoNegadoPagina,
  CAMINHO_ACESSO_NEGADO,
  CAMINHO_LOGIN,
  ExigirPerfil,
  ExigirSessao,
  LoginPagina,
  RedirecionarParaInicio,
} from '@/features/auth'
import { InicioPagina } from '@/features/inicio'
import {
  EntregadoresPagina,
  FaixasPrecoPagina,
  IntegracaoPagina,
  ParametrosLojaPagina,
} from '@/features/loja'
import { RestaurantesPagina } from '@/features/restaurantes'
import { CAMINHO_INICIO, obterTela, type ChaveTela } from '@/shared/dominio'
import { LimiteDeErro } from '@/shared/ui/LimiteDeErro'
import { LayoutApp } from './LayoutApp'

// Telas pesadas (mapas, acerto) carregam por rota; o `Suspense` fica no LayoutApp.
const DespachoPagina = lazy(() =>
  import('@/features/despacho').then((m) => ({ default: m.DespachoPagina })),
)
const MonitoramentoPagina = lazy(() =>
  import('@/features/monitoramento').then((m) => ({ default: m.MonitoramentoPagina })),
)
const AcertoPagina = lazy(() => import('@/features/acerto').then((m) => ({ default: m.AcertoPagina })))
const CaixaPagina = lazy(() => import('@/features/caixa').then((m) => ({ default: m.CaixaPagina })))
const RelatorioPagina = lazy(() =>
  import('@/features/relatorio').then((m) => ({ default: m.RelatorioPagina })),
)

const PAGINAS: Record<ChaveTela, ReactNode> = {
  restaurantes: <RestaurantesPagina />,
  lojaEntregadores: <EntregadoresPagina />,
  lojaFaixasPreco: <FaixasPrecoPagina />,
  lojaParametros: <ParametrosLojaPagina />,
  lojaIntegracao: <IntegracaoPagina />,
  despacho: <DespachoPagina />,
  monitoramento: <MonitoramentoPagina />,
  acerto: <AcertoPagina />,
  caixa: <CaixaPagina />,
  relatorio: <RelatorioPagina />,
}

export function criarRotas(): RouteObject[] {
  const telas = (Object.keys(PAGINAS) as ChaveTela[]).map<RouteObject>((chave) => ({
    path: obterTela(chave).caminho,
    element: <ExigirPerfil tela={chave}>{PAGINAS[chave]}</ExigirPerfil>,
  }))

  return [
    // Login fica FORA do ExigirSessao (T007)
    {
      path: CAMINHO_LOGIN,
      element: (
        <LimiteDeErro mensagem="Não foi possível exibir esta tela.">
          <LoginPagina />
        </LimiteDeErro>
      ),
    },
    {
      path: '/',
      element: (
        <ExigirSessao>
          <LayoutApp />
        </ExigirSessao>
      ),
      children: [
        { index: true, element: <RedirecionarParaInicio /> },
        // T008: pagina inicial, para todo perfil do Backoffice (ExigirSessao ja barra o ENTREGADOR)
        { path: CAMINHO_INICIO, element: <InicioPagina /> },
        ...telas,
        { path: CAMINHO_ACESSO_NEGADO, element: <AcessoNegadoPagina /> },
        { path: '*', element: <RedirecionarParaInicio /> },
      ],
    },
  ]
}
