// API publica do modulo `auth` (AGENT.md, secao 5).
export {
  useSessaoStore,
  obterTokenDaSessao,
  obterRefreshTokenDaSessao,
  registrarLimpezaDeCache,
  aoTrocarDeSessao,
  MENSAGEM_PERFIL_SEM_ACESSO,
  MENSAGEM_SEM_ESTABELECIMENTO,
  type DadosInicioSessao,
  type ResultadoInicioSessao,
} from './sessaoStore'
export {
  ExigirSessao,
  ExigirPerfil,
  RedirecionarParaInicio,
  CAMINHO_ACESSO_NEGADO,
  CAMINHO_LOGIN,
  type EstadoIdaAoLogin,
} from './componentes/guardas'
export { renovarToken } from './api/authApi'
export { AcessoNegadoPagina } from './paginas/AcessoNegadoPagina'
export { LoginPagina } from './paginas/LoginPagina'
