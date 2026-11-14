/**
 * Chamadas de rede do caixa (UC03 A3, T006).
 * Endpoints confirmados pelo backend (S009).
 */
import { z } from 'zod'
import {
  ENDPOINTS,
  caixaResponseSchema,
  requisitar,
  type CaixaResponse,
} from '@/shared/api'

const listaCaixasSchema = z.array(caixaResponseSchema)

/** Caixa do dia atual (GET /api/caixas/atual). Pode retornar null se nao existe. */
export async function buscarCaixaAtual(signal?: AbortSignal): Promise<CaixaResponse | null> {
  try {
    return await requisitar({
      caminho: ENDPOINTS.caixas.atual,
      schema: caixaResponseSchema,
      signal,
    })
  } catch (erro: unknown) {
    // 404 = nao ha caixa para hoje
    if (erro && typeof erro === 'object' && 'status' in erro && (erro as { status: number }).status === 404) {
      return null
    }
    throw erro
  }
}

/** Historico de caixas por periodo (GET /api/caixas?dataInicio=&dataFim=). */
export function listarCaixas(
  dataInicio?: string,
  dataFim?: string,
  signal?: AbortSignal,
): Promise<CaixaResponse[]> {
  return requisitar({
    caminho: ENDPOINTS.caixas.listar,
    query: { dataInicio, dataFim },
    schema: listaCaixasSchema,
    signal,
  })
}

export type AbrirCaixaRequest = { dataReferencia: string }

/** Abrir caixa do dia (POST /api/caixas). Sem atualizacao otimista (Constituicao 5.8). */
export function abrirCaixa(corpo: AbrirCaixaRequest): Promise<CaixaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.caixas.abrir,
    corpo,
    schema: caixaResponseSchema,
  })
}

/** Fechar caixa (POST /api/caixas/{id}/fechar). Sem atualizacao otimista. */
export function fecharCaixa(id: string): Promise<CaixaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.caixas.fechar(id),
    schema: caixaResponseSchema,
  })
}
