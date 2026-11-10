/**
 * Enums oficiais do domínio (AGENT.md, seção 6.1; conferidos contra
 * `entity/model/enums/*.java` e `dto/response/SituacaoAcerto.java` do backend em 10/11/2026).
 * Nenhum outro valor é admitido (Constituição, Artigo 2.3).
 *
 * Padrão: tupla `as const` (usada pelos schemas Zod) + tipo derivado + labels pt-BR.
 */

export const PERFIS_USUARIO = ['ADMIN_GERAL', 'ADMIN_RESTAURANTE', 'OPERADOR', 'ENTREGADOR'] as const
export type PerfilUsuario = (typeof PERFIS_USUARIO)[number]
export const LABEL_PERFIL_USUARIO: Record<PerfilUsuario, string> = {
  ADMIN_GERAL: 'Administrador geral',
  ADMIN_RESTAURANTE: 'Administrador do restaurante',
  OPERADOR: 'Operador de logística',
  ENTREGADOR: 'Entregador',
}

export const STATUS_ENTREGA = [
  'AGUARDANDO_DESPACHO',
  'DESPACHADA',
  'EM_ROTA',
  'ENTREGUE',
  'FALHA',
  'CANCELADA',
] as const
export type StatusEntrega = (typeof STATUS_ENTREGA)[number]
export const LABEL_STATUS_ENTREGA: Record<StatusEntrega, string> = {
  AGUARDANDO_DESPACHO: 'Aguardando despacho',
  DESPACHADA: 'Despachada',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  FALHA: 'Falha',
  CANCELADA: 'Cancelada',
}

export const STATUS_LOTE = ['DESPACHADO', 'EM_ROTA', 'CONCLUIDO', 'CANCELADO'] as const
export type StatusLote = (typeof STATUS_LOTE)[number]
export const LABEL_STATUS_LOTE: Record<StatusLote, string> = {
  DESPACHADO: 'Despachado',
  EM_ROTA: 'Em rota',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

export const STATUS_RECIBO = ['GERADO', 'PAGO', 'CANCELADO'] as const
export type StatusRecibo = (typeof STATUS_RECIBO)[number]
export const LABEL_STATUS_RECIBO: Record<StatusRecibo, string> = {
  GERADO: 'Gerado',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
}

export const STATUS_CAIXA = ['ABERTO', 'FECHADO', 'REABERTO'] as const
export type StatusCaixa = (typeof STATUS_CAIXA)[number]
export const LABEL_STATUS_CAIXA: Record<StatusCaixa, string> = {
  ABERTO: 'Aberto',
  FECHADO: 'Fechado',
  REABERTO: 'Reaberto',
}

export const STATUS_DISPONIBILIDADE_MOTOBOY = ['OFFLINE', 'ONLINE', 'EM_ROTA'] as const
export type StatusDisponibilidadeMotoboy = (typeof STATUS_DISPONIBILIDADE_MOTOBOY)[number]
export const LABEL_STATUS_DISPONIBILIDADE_MOTOBOY: Record<StatusDisponibilidadeMotoboy, string> = {
  OFFLINE: 'Offline',
  ONLINE: 'Online',
  EM_ROTA: 'Em rota',
}

export const STATUS_CADASTRO_MOTOBOY = ['ATIVO', 'BLOQUEADO'] as const
export type StatusCadastroMotoboy = (typeof STATUS_CADASTRO_MOTOBOY)[number]
export const LABEL_STATUS_CADASTRO_MOTOBOY: Record<StatusCadastroMotoboy, string> = {
  ATIVO: 'Ativo',
  BLOQUEADO: 'Bloqueado',
}

export const STATUS_ESTABELECIMENTO = ['ATIVO', 'INATIVO'] as const
export type StatusEstabelecimento = (typeof STATUS_ESTABELECIMENTO)[number]
export const LABEL_STATUS_ESTABELECIMENTO: Record<StatusEstabelecimento, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
}

/** Só três motivos (Constituição, Artigo 5.4; DVP v2.9). */
export const MOTIVOS_REVISAO = ['SEM_COORDENADA', 'SEM_DISTANCIA', 'CONTESTACAO_ENTREGADOR'] as const
export type MotivoRevisao = (typeof MOTIVOS_REVISAO)[number]
export const LABEL_MOTIVO_REVISAO: Record<MotivoRevisao, string> = {
  SEM_COORDENADA: 'Endereço sem coordenada',
  SEM_DISTANCIA: 'Distância não calculada',
  CONTESTACAO_ENTREGADOR: 'Contestação do entregador',
}

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'CREDITO', 'DEBITO', 'PIX', 'VALE'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]
export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  CREDITO: 'Cartão de crédito',
  DEBITO: 'Cartão de débito',
  PIX: 'PIX',
  VALE: 'Vale-refeição',
}

export const PROVEDORES = ['IFOOD', 'SIMULADOR'] as const
export type Provedor = (typeof PROVEDORES)[number]
export const LABEL_PROVEDOR: Record<Provedor, string> = {
  IFOOD: 'iFood',
  SIMULADOR: 'Simulador',
}

export const STATUS_FALHA_INTEGRACAO = ['PENDENTE', 'REPROCESSADA', 'DESCARTADA'] as const
export type StatusFalhaIntegracao = (typeof STATUS_FALHA_INTEGRACAO)[number]
export const LABEL_STATUS_FALHA_INTEGRACAO: Record<StatusFalhaIntegracao, string> = {
  PENDENTE: 'Pendente',
  REPROCESSADA: 'Reprocessada',
  DESCARTADA: 'Descartada',
}

export const ETAPAS_FALHA_INTEGRACAO = [
  'AUTENTICACAO',
  'CONSULTA',
  'CONFIRMACAO',
  'GEOCODIFICACAO',
  'PERSISTENCIA',
] as const
export type EtapaFalhaIntegracao = (typeof ETAPAS_FALHA_INTEGRACAO)[number]
export const LABEL_ETAPA_FALHA_INTEGRACAO: Record<EtapaFalhaIntegracao, string> = {
  AUTENTICACAO: 'Autenticação',
  CONSULTA: 'Consulta de pedidos',
  CONFIRMACAO: 'Confirmação do pedido',
  GEOCODIFICACAO: 'Geocodificação',
  PERSISTENCIA: 'Gravação no sistema',
}

export const SITUACOES_ACERTO = ['A_ACERTAR', 'CONSOLIDADA', 'EM_REVISAO'] as const
export type SituacaoAcerto = (typeof SITUACOES_ACERTO)[number]
export const LABEL_SITUACAO_ACERTO: Record<SituacaoAcerto, string> = {
  A_ACERTAR: 'A acertar',
  CONSOLIDADA: 'Consolidada',
  EM_REVISAO: 'Em revisão',
}
