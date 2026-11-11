// API pública do módulo `auth` (AGENT.md, seção 5).
export {
  useSessaoStore,
  obterTokenDaSessao,
  registrarLimpezaDeCache,
  MENSAGEM_PERFIL_SEM_ACESSO,
  type DadosInicioSessao,
  type ResultadoInicioSessao,
} from './sessaoStore'
export { SESSAO_DEV_HABILITADA, calcularSessaoDevHabilitada } from './sessaoDevHabilitada'
export {
  ExigirSessao,
  ExigirPerfil,
  RedirecionarParaInicio,
  CAMINHO_ACESSO_NEGADO,
} from './componentes/guardas'
export { TelaSemSessao } from './paginas/TelaSemSessao'
export { AcessoNegadoPagina } from './paginas/AcessoNegadoPagina'
