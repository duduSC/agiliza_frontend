/**
 * Normalização de `ApiErrorResponse` (AGENT.md 6.5; backend
 * `exception/handler/ApiErrorResponse.java` e `CodigoErro.java`, conferidos em 10/11/2026).
 */
import { z } from 'zod'

/**
 * Catálogo de `CodigoErro` do backend. Inclui `CREDENCIAIS_INVALIDAS`, que existe no
 * enum Java (HTTP 401 do login, UC07 E1) e ainda não constava no AGENT.md 6.5
 * (sugestão S002 do backend; Constituição, Artigo 2.2a — segue-se o contrato real).
 */
export const CODIGOS_ERRO = [
  'ERRO_INTERNO_SERVIDOR',
  'DADOS_INVALIDOS',
  'CORPO_REQUISICAO_INVALIDO',
  'PARAMETRO_INVALIDO',
  'RECURSO_NAO_ENCONTRADO',
  'ESTABELECIMENTO_NAO_ENCONTRADO',
  'USUARIO_NAO_ENCONTRADO',
  'MOTOBOY_NAO_ENCONTRADO',
  'ENTREGA_NAO_ENCONTRADA',
  'LOTE_NAO_ENCONTRADO',
  'CAIXA_NAO_ENCONTRADO',
  'RECIBO_NAO_ENCONTRADO',
  'FAIXA_PRECO_NAO_ENCONTRADA',
  'REGRA_NEGOCIO_VIOLADA',
  'TRANSICAO_ESTADO_INVALIDA',
  'CAIXA_FECHADO',
  'LIMITE_LOTE_EXCEDIDO',
  'MOTOBOY_INDISPONIVEL',
  'ENTREGA_INAPTA_LOTE',
  'ENTREGA_INAPTA_RECIBO',
  'RECIBO_INALTERAVEL',
  'FAIXA_PRECO_INVALIDA',
  'AJUSTE_VALOR_NAO_PERMITIDO',
  'DADO_DUPLICADO',
  'CNPJ_JA_CADASTRADO',
  'CPF_JA_CADASTRADO',
  'EMAIL_JA_CADASTRADO',
  'CAIXA_JA_ABERTO',
  'PEDIDO_JA_IMPORTADO',
  'CREDENCIAIS_INVALIDAS',
  'ACESSO_NEGADO',
  'ESTABELECIMENTO_INATIVO',
  'USUARIO_BLOQUEADO',
  'VIOLACAO_MULTITENANT',
  'INTEGRACAO_EXTERNA_ERRO',
] as const
export type CodigoErro = (typeof CODIGOS_ERRO)[number]

export const MENSAGENS_ERRO: Readonly<Record<CodigoErro, string>> = {
  ERRO_INTERNO_SERVIDOR: 'Ocorreu um erro inesperado no servidor. Tente novamente.',
  DADOS_INVALIDOS: 'Há campos com dados inválidos. Revise o formulário.',
  CORPO_REQUISICAO_INVALIDO: 'Não foi possível ler os dados enviados.',
  PARAMETRO_INVALIDO: 'Parâmetro inválido na requisição.',
  RECURSO_NAO_ENCONTRADO: 'Registro não encontrado.',
  ESTABELECIMENTO_NAO_ENCONTRADO: 'Estabelecimento não encontrado.',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado.',
  MOTOBOY_NAO_ENCONTRADO: 'Entregador não encontrado.',
  ENTREGA_NAO_ENCONTRADA: 'Entrega não encontrada.',
  LOTE_NAO_ENCONTRADO: 'Lote não encontrado.',
  CAIXA_NAO_ENCONTRADO: 'Caixa não encontrado.',
  RECIBO_NAO_ENCONTRADO: 'Recibo não encontrado.',
  FAIXA_PRECO_NAO_ENCONTRADA: 'Faixa de preço não encontrada.',
  REGRA_NEGOCIO_VIOLADA: 'A operação não é permitida pelas regras do sistema.',
  TRANSICAO_ESTADO_INVALIDA: 'Esta ação não é permitida no status atual.',
  CAIXA_FECHADO: 'O caixa deste período está fechado; não é possível alterar.',
  LIMITE_LOTE_EXCEDIDO: 'O lote ultrapassa o máximo de pedidos permitido pela loja.',
  MOTOBOY_INDISPONIVEL: 'O entregador não está disponível (precisa estar online e ativo).',
  ENTREGA_INAPTA_LOTE: 'Uma ou mais entregas não podem entrar neste lote.',
  ENTREGA_INAPTA_RECIBO: 'Uma ou mais entregas não podem entrar no recibo.',
  RECIBO_INALTERAVEL: 'Este recibo não pode mais ser alterado.',
  FAIXA_PRECO_INVALIDA:
    'As faixas de preço são inválidas (devem começar em 0 km, sem lacunas nem sobreposição).',
  AJUSTE_VALOR_NAO_PERMITIDO: 'O ajuste de repasse não é permitido para esta entrega.',
  DADO_DUPLICADO: 'Já existe um registro com estes dados.',
  CNPJ_JA_CADASTRADO: 'Este CNPJ já está cadastrado.',
  CPF_JA_CADASTRADO: 'Este CPF já está cadastrado.',
  EMAIL_JA_CADASTRADO: 'Este e-mail já está cadastrado.',
  CAIXA_JA_ABERTO: 'Já existe um caixa aberto para esta data.',
  PEDIDO_JA_IMPORTADO: 'Este pedido já foi importado.',
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha inválidos.',
  ACESSO_NEGADO: 'Você não tem permissão para esta ação.',
  ESTABELECIMENTO_INATIVO: 'O acesso desta loja está suspenso.',
  USUARIO_BLOQUEADO: 'Usuário sem acesso.',
  VIOLACAO_MULTITENANT: 'Você não tem permissão para acessar este registro.',
  INTEGRACAO_EXTERNA_ERRO: 'Falha na comunicação com um serviço externo. Tente novamente.',
}

const conjuntoCodigos: ReadonlySet<string> = new Set(CODIGOS_ERRO)

export function ehCodigoErro(valor: string): valor is CodigoErro {
  return conjuntoCodigos.has(valor)
}

/** Esquema tolerante: o corpo de erro nunca deve derrubar a tela por ter um campo a menos. */
export const apiErrorResponseSchema = z.object({
  timestamp: z.union([z.string(), z.number()]).optional(),
  status: z.number().int().optional(),
  error: z.string().optional(),
  codigo: z.string().optional(),
  message: z.string().optional(),
  path: z.string().optional(),
  campos: z.array(z.object({ campo: z.string(), mensagem: z.string() })).optional(),
})
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>

export type CampoErroApi = { campo: string; mensagem: string }

/** `http`: resposta de erro do servidor; `rede`: sem resposta; `resposta_invalida`: corpo fora do contrato. */
export type TipoErroApi = 'http' | 'rede' | 'resposta_invalida'

export class ErroApi extends Error {
  readonly tipo: TipoErroApi
  /** Status HTTP (0 quando não houve resposta). */
  readonly status: number
  /** Código catalogado, ou `null` se ausente/desconhecido. */
  readonly codigo: CodigoErro | null
  /** Código como veio do servidor (útil para diagnóstico de códigos novos). */
  readonly codigoBruto: string | null
  /** Mensagem pt-BR pronta para exibir. */
  readonly mensagem: string
  /** `message` original do servidor, quando houver. */
  readonly mensagemServidor: string | null
  readonly campos: readonly CampoErroApi[]
  readonly path: string | null

  constructor(dados: {
    tipo: TipoErroApi
    status: number
    codigo: CodigoErro | null
    codigoBruto: string | null
    mensagem: string
    mensagemServidor: string | null
    campos: readonly CampoErroApi[]
    path: string | null
  }) {
    super(dados.mensagem)
    this.name = 'ErroApi'
    this.tipo = dados.tipo
    this.status = dados.status
    this.codigo = dados.codigo
    this.codigoBruto = dados.codigoBruto
    this.mensagem = dados.mensagem
    this.mensagemServidor = dados.mensagemServidor
    this.campos = dados.campos
    this.path = dados.path
  }
}

function mensagemPorStatus(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (status === 403) return MENSAGENS_ERRO.ACESSO_NEGADO
  if (status === 404) return MENSAGENS_ERRO.RECURSO_NAO_ENCONTRADO
  if (status >= 500) return MENSAGENS_ERRO.ERRO_INTERNO_SERVIDOR
  return 'Não foi possível concluir a operação.'
}

/**
 * Converte o corpo de erro (já lido como JSON, ou `null` se não for JSON) num `ErroApi`.
 * Regra de mensagem: código conhecido → mapa pt-BR; código desconhecido ou ausente →
 * `message` do servidor; sem `message` → mensagem genérica pelo status HTTP.
 */
export function parseErroApi(status: number, corpo: unknown): ErroApi {
  const resultado = apiErrorResponseSchema.safeParse(corpo)
  const dados: ApiErrorResponse = resultado.success ? resultado.data : {}
  const codigoBruto = dados.codigo ?? null
  const codigo = codigoBruto !== null && ehCodigoErro(codigoBruto) ? codigoBruto : null
  const mensagemServidor = dados.message?.trim() ? dados.message : null

  const mensagem =
    codigo !== null ? MENSAGENS_ERRO[codigo] : (mensagemServidor ?? mensagemPorStatus(status))

  return new ErroApi({
    tipo: 'http',
    status,
    codigo,
    codigoBruto,
    mensagem,
    mensagemServidor,
    campos: dados.campos ?? [],
    path: dados.path ?? null,
  })
}

export function erroDeRede(): ErroApi {
  return new ErroApi({
    tipo: 'rede',
    status: 0,
    codigo: null,
    codigoBruto: null,
    mensagem: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    mensagemServidor: null,
    campos: [],
    path: null,
  })
}

export function erroRespostaInvalida(status: number, path: string): ErroApi {
  return new ErroApi({
    tipo: 'resposta_invalida',
    status,
    codigo: null,
    codigoBruto: null,
    mensagem: 'O servidor respondeu em um formato inesperado.',
    mensagemServidor: null,
    campos: [],
    path,
  })
}

export function ehErroApi(valor: unknown): valor is ErroApi {
  return valor instanceof ErroApi
}
