/**
 * Rotas do Backoffice (AGENT.md, secao 7). Cada tela fica atras de `ExigirPerfil` com a mesma
 * chave usada no menu (`shared/dominio/permissoes.ts`), para menu e guarda nunca divergirem.
 *
 * T007: /login fora do ExigirSessao; rotas protegidas redirecionam para /login sem sessao.
 */
import type { ReactNode } from 'react'
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
import { AcertoPagina } from '@/features/acerto'
import { CaixaPagina } from '@/features/caixa'
import { DespachoPagina } from '@/features/despacho'
import {
  EntregadoresPagina,
  FaixasPrecoPagina,
  IntegracaoPagina,
  ParametrosLojaPagina,
} from '@/features/loja'
import { MonitoramentoPagina } from '@/features/monitoramento'
import { RestaurantesPagina } from '@/features/restaurantes'
import { obterTela, type ChaveTela } from '@/shared/dominio'
import { LayoutApp } from './LayoutApp'

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
}

export function criarRotas(): RouteObject[] {
  const telas = (Object.keys(PAGINAS) as ChaveTela[]).map<RouteObject>((chave) => ({
    path: obterTela(chave).caminho,
    element: <ExigirPerfil tela={chave}>{PAGINAS[chave]}</ExigirPerfil>,
  }))

  return [
    // Login fica FORA do ExigirSessao (T007)
    { path: CAMINHO_LOGIN, element: <LoginPagina /> },
    {
      path: '/',
      element: (
        <ExigirSessao>
          <LayoutApp />
        </ExigirSessao>
      ),
      children: [
        { index: true, element: <RedirecionarParaInicio /> },
        ...telas,
        { path: CAMINHO_ACESSO_NEGADO, element: <AcessoNegadoPagina /> },
        { path: '*', element: <RedirecionarParaInicio /> },
      ],
    },
  ]
}
