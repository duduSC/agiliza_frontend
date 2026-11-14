/**
 * Chamadas de rede do acerto financeiro (UC03, T006).
 * Endpoints confirmados pelo backend (S009).
 */
import {
  ENDPOINTS,
  extratoAcertoResponseSchema,
  listaAjustesResponseSchema,
  requisitar,
  type ExtratoAcertoResponse,
  type EntregaAjusteValorResponse,
} from '@/shared/api'

/** Extrato do acerto por entregador e periodo (GET /api/acertos). */
export function buscarExtrato(
  motoboyId: string,
  inicio: string,
  fim: string,
  signal?: AbortSignal,
): Promise<ExtratoAcertoResponse> {
  return requisitar({
    caminho: ENDPOINTS.acertos.extrato,
    query: { motoboyId, inicio, fim },
    schema: extratoAcertoResponseSchema,
    signal,
  })
}

/** Ajustar repasse de uma entrega (POST /api/entregas/{id}/ajustes). */
export function ajustarRepasse(
  entregaId: string,
  valorNovo: number,
  motivo: string,
): Promise<EntregaAjusteValorResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.entregas.ajustarRepasse(entregaId),
    corpo: { valorNovo, motivo },
    schema: listaAjustesResponseSchema.element,
  })
}

/** Historico de ajustes de uma entrega (GET /api/entregas/{id}/ajustes). */
export function listarAjustes(
  entregaId: string,
  signal?: AbortSignal,
): Promise<EntregaAjusteValorResponse[]> {
  return requisitar({
    caminho: ENDPOINTS.entregas.historicoAjustes(entregaId),
    schema: listaAjustesResponseSchema,
    signal,
  })
}
