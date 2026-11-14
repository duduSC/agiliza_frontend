/**
 * Chamadas de rede dos recibos (UC03, T006).
 * Endpoints confirmados pelo backend (S009).
 */
import { z } from 'zod'
import {
  ENDPOINTS,
  reciboResponseSchema,
  requisitar,
  type ReciboResponse,
} from '@/shared/api'

const listaRecibosSchema = z.array(reciboResponseSchema)

/** Listar recibos por entregador (GET /api/recibos?motoboyId=). */
export function listarRecibos(motoboyId: string, signal?: AbortSignal): Promise<ReciboResponse[]> {
  return requisitar({
    caminho: ENDPOINTS.recibos.listar,
    query: { motoboyId },
    schema: listaRecibosSchema,
    signal,
  })
}

export type GerarReciboRequest = {
  motoboyId: string
  periodoInicio: string
  periodoFim: string
}

/** Gerar recibo (POST /api/recibos). Sem atualizacao otimista (Constituicao 5.8). */
export function gerarRecibo(corpo: GerarReciboRequest): Promise<ReciboResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.recibos.gerar,
    corpo,
    schema: reciboResponseSchema,
  })
}

/** Marcar recibo como pago (POST /api/recibos/{id}/pagar). Sem atualizacao otimista. */
export function marcarReciboPago(id: string): Promise<ReciboResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.recibos.pagar(id),
    schema: reciboResponseSchema,
  })
}
