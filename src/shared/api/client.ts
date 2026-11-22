/**
 * ÚNICO ponto de `fetch` da aplicação (AGENT.md, seção 5; skill frontend-data-contracts).
 *
 * - base `VITE_API_URL`;
 * - injeta `Authorization: Bearer <jwt>` a partir de um provedor de token em memória
 *   (o token NUNCA é lido de localStorage/cookie — Constituição, Artigo 6.1);
 * - valida toda resposta com Zod antes de devolver (Artigo 7.2);
 * - normaliza erros em `ErroApi`; 401 → `aoNaoAutenticado`, 403 → `aoAcessoNegado` (Artigo 6.3);
 * - tempo limite por requisição, para servidor travado não deixar a tela em "Carregando" para sempre;
 * - repassa `AbortSignal` (cancelamento pelo TanStack Query).
 *
 * Nunca registra em log o corpo das requisições/respostas (Artigo 6.5).
 */
import type { z } from 'zod'
import {
  erroDeRede,
  erroDeTempoEsgotado,
  erroRespostaInvalida,
  parseErroApi,
  type ErroApi,
} from './erros'

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ValorQuery = string | number | boolean | null | undefined

/** Maior que os 10 s que o backend pode esperar pela trava da loja (S013). */
export const TEMPO_LIMITE_MS = 20_000

type ConfiguracaoCliente = {
  obterToken: () => string | null
  /**
   * Quem está logado. Se mudar durante a requisição, a resposta 401/403 dela não age sobre a
   * sessão nova e a escrita não é repetida com o token de outra pessoa.
   */
  obterSessao: () => string | null
  /** Tenta renovar o token de acesso. Retorna o novo token ou null se a sessão não vale mais. */
  tentarRefresh: () => Promise<string | null>
  aoNaoAutenticado: (erro: ErroApi) => void
  aoAcessoNegado: (erro: ErroApi) => void
}

const configuracaoPadrao: ConfiguracaoCliente = {
  obterToken: () => null,
  obterSessao: () => null,
  tentarRefresh: () => Promise.resolve(null),
  aoNaoAutenticado: () => {},
  aoAcessoNegado: () => {},
}

let configuracao: ConfiguracaoCliente = { ...configuracaoPadrao }

/** Chamado no bootstrap (T002) para ligar a sessão em memória e o redirecionamento. */
export function configurarCliente(parcial: Partial<ConfiguracaoCliente>): void {
  configuracao = { ...configuracao, ...parcial }
}

/** Restaura a configuração padrão (uso em testes e no logout). */
export function redefinirCliente(): void {
  configuracao = { ...configuracaoPadrao }
}

export type OpcoesRequisicao = {
  metodo?: MetodoHttp
  caminho: string
  query?: Record<string, ValorQuery>
  corpo?: unknown
  signal?: AbortSignal
  /**
   * `false` desliga os callbacks globais de 401/403 — para a própria tela de login,
   * onde 401 (`CREDENCIAIS_INVALIDAS`) é erro de formulário, não sessão expirada.
   */
  tratarAutenticacaoGlobal?: boolean
}

function baseUrl(): string {
  const base = import.meta.env.VITE_API_URL
  if (base && base.trim() !== '') return base
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
}

export function montarUrl(caminho: string, query?: Record<string, ValorQuery>): string {
  const url = new URL(caminho, baseUrl())
  if (query) {
    for (const [chave, valor] of Object.entries(query)) {
      if (valor === undefined || valor === null || valor === '') continue
      url.searchParams.set(chave, String(valor))
    }
  }
  return url.toString()
}

function interpretarJson(texto: string): unknown {
  if (texto.trim() === '') return null
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return null
  }
}

function ehAbort(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError'
}

type Resposta = { ok: boolean; status: number; dados: unknown }

/** Uma ida ao servidor, com tempo limite que cobre também a leitura do corpo. */
async function enviar(opcoes: OpcoesRequisicao, token: string | null): Promise<Resposta> {
  const { metodo = 'GET', caminho, query, corpo, signal } = opcoes

  const headers = new Headers({ Accept: 'application/json' })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (corpo !== undefined) headers.set('Content-Type', 'application/json')

  const controle = new AbortController()
  const abortar = () => controle.abort()
  if (signal?.aborted) abortar()
  else signal?.addEventListener('abort', abortar, { once: true })

  let estourouPrazo = false
  const prazo = setTimeout(() => {
    estourouPrazo = true
    abortar()
  }, TEMPO_LIMITE_MS)

  try {
    const resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
    })
    return { ok: resposta.ok, status: resposta.status, dados: interpretarJson(await resposta.text()) }
  } catch (erro) {
    if (estourouPrazo) throw erroDeTempoEsgotado(metodo !== 'GET')
    if (ehAbort(erro) || signal?.aborted) throw erro
    throw erroDeRede()
  } finally {
    clearTimeout(prazo)
    signal?.removeEventListener('abort', abortar)
  }
}

export function requisitar<S extends z.ZodType>(
  opcoes: OpcoesRequisicao & { schema: S },
): Promise<z.output<S>>
export function requisitar(opcoes: OpcoesRequisicao & { schema?: undefined }): Promise<void>
export async function requisitar(
  opcoes: OpcoesRequisicao & { schema?: z.ZodType },
): Promise<unknown> {
  const { caminho, schema } = opcoes
  const tratarAuth = opcoes.tratarAutenticacaoGlobal ?? true
  const sessao = configuracao.obterSessao()
  const mesmaSessao = () => configuracao.obterSessao() === sessao
  const tokenEnviado = configuracao.obterToken()

  let resposta = await enviar(opcoes, tokenEnviado)

  // 401 é recusado antes do controller, então repetir a requisição (mesmo escrita) é seguro.
  if (tratarAuth && resposta.status === 401 && mesmaSessao()) {
    const tokenAtual = configuracao.obterToken()
    // Outra requisição já pode ter renovado o token enquanto esta estava no ar.
    const token = tokenAtual !== tokenEnviado ? tokenAtual : await configuracao.tentarRefresh()
    if (token && mesmaSessao()) resposta = await enviar(opcoes, token)
  }

  if (!resposta.ok) {
    const erro = parseErroApi(resposta.status, resposta.dados)
    if (tratarAuth && mesmaSessao()) {
      if (resposta.status === 401) configuracao.aoNaoAutenticado(erro)
      if (resposta.status === 403) configuracao.aoAcessoNegado(erro)
    }
    throw erro
  }

  if (!schema) return undefined

  const resultado = schema.safeParse(resposta.dados)
  if (!resultado.success) throw erroRespostaInvalida(resposta.status, caminho)
  return resultado.data
}
