/**
 * ÚNICO ponto de `fetch` da aplicação (AGENT.md, seção 5; skill frontend-data-contracts).
 *
 * - base `VITE_API_URL`;
 * - injeta `Authorization: Bearer <jwt>` a partir de um provedor de token em memória
 *   (o token NUNCA é lido de localStorage/cookie — Constituição, Artigo 6.1);
 * - valida toda resposta com Zod antes de devolver (Artigo 7.2);
 * - normaliza erros em `ErroApi`; 401 → `aoNaoAutenticado`, 403 → `aoAcessoNegado` (Artigo 6.3);
 * - repassa `AbortSignal` (cancelamento pelo TanStack Query).
 *
 * Nunca registra em log o corpo das requisições/respostas (Artigo 6.5).
 */
import type { z } from 'zod'
import { erroDeRede, erroRespostaInvalida, parseErroApi, type ErroApi } from './erros'

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ValorQuery = string | number | boolean | null | undefined

type ConfiguracaoCliente = {
  obterToken: () => string | null
  /** Tenta renovar o token de acesso. Retorna o novo token ou null se falhar. */
  tentarRefresh: () => Promise<string | null>
  aoNaoAutenticado: (erro: ErroApi) => void
  aoAcessoNegado: (erro: ErroApi) => void
}

const configuracaoPadrao: ConfiguracaoCliente = {
  obterToken: () => null,
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

async function lerJson(resposta: Response): Promise<unknown> {
  const texto = await resposta.text()
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

export function requisitar<S extends z.ZodType>(
  opcoes: OpcoesRequisicao & { schema: S },
): Promise<z.output<S>>
export function requisitar(opcoes: OpcoesRequisicao & { schema?: undefined }): Promise<void>
export async function requisitar(
  opcoes: OpcoesRequisicao & { schema?: z.ZodType },
): Promise<unknown> {
  const { metodo = 'GET', caminho, query, corpo, signal, schema } = opcoes
  const tratarAuth = opcoes.tratarAutenticacaoGlobal ?? true

  const headers = new Headers({ Accept: 'application/json' })
  const token = configuracao.obterToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (corpo !== undefined) headers.set('Content-Type', 'application/json')

  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal,
    })
  } catch (erro) {
    if (ehAbort(erro) || signal?.aborted) throw erro
    throw erroDeRede()
  }

  if (!resposta.ok) {
    const erro = parseErroApi(resposta.status, await lerJson(resposta))

    // Refresh automatico: tenta renovar o token antes de encerrar a sessao (T007).
    if (tratarAuth && resposta.status === 401) {
      const novoToken = await configuracao.tentarRefresh()
      if (novoToken) {
        // Retry com o novo token
        const headersRetry = new Headers(headers)
        headersRetry.set('Authorization', `Bearer ${novoToken}`)
        try {
          const retentativa = await fetch(montarUrl(caminho, query), {
            method: metodo,
            headers: headersRetry,
            body: corpo === undefined ? undefined : JSON.stringify(corpo),
            signal,
          })
          if (retentativa.ok) {
            if (!schema) return undefined
            const dadosRetry = await lerJson(retentativa)
            const resultadoRetry = schema.safeParse(dadosRetry)
            if (!resultadoRetry.success) throw erroRespostaInvalida(retentativa.status, caminho)
            return resultadoRetry.data
          }
          // Retry tambem falhou — cai no fluxo normal de encerrar sessao
        } catch (erroRetry) {
          if (ehAbort(erroRetry) || signal?.aborted) throw erroRetry
          // Retry falhou por rede — segue para aoNaoAutenticado
        }
      }
      configuracao.aoNaoAutenticado(erro)
    }
    if (tratarAuth && resposta.status === 403) configuracao.aoAcessoNegado(erro)
    throw erro
  }

  if (!schema) return undefined

  const dados = await lerJson(resposta)
  const resultado = schema.safeParse(dados)
  if (!resultado.success) {
    throw erroRespostaInvalida(resposta.status, caminho)
  }
  return resultado.data
}
