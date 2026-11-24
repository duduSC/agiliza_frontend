/**
 * Chamadas de rede dos lotes (UC01 despacho e devolucao). Endpoints confirmados
 * pelo backend (S008).
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { loteEntregaResponseSchema, type LoteEntregaResponse } from '@/shared/api/schemas'

const listaLotesSchema = z.array(loteEntregaResponseSchema)

export type DespacharLoteRequest = {
  motoboyId: string
  entregaIds: string[]
}

export async function listarLotesDespachados(signal?: AbortSignal): Promise<LoteEntregaResponse[]> {
  return requisitar({
    caminho: ENDPOINTS.lotes.listar,
    query: { status: 'DESPACHADO' },
    schema: listaLotesSchema,
    signal,
  })
}

/** Lotes EM_ROTA (T010): dão o entregador de cada entrega que saiu. */
export async function listarLotesEmRota(signal?: AbortSignal): Promise<LoteEntregaResponse[]> {
  return requisitar({
    caminho: ENDPOINTS.lotes.listar,
    query: { status: 'EM_ROTA' },
    schema: listaLotesSchema,
    signal,
  })
}

export function despacharLote(corpo: DespacharLoteRequest): Promise<LoteEntregaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.lotes.despachar,
    corpo,
    schema: loteEntregaResponseSchema,
  })
}

export function devolverLote(id: string): Promise<LoteEntregaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.lotes.devolver(id),
    schema: loteEntregaResponseSchema,
  })
}
