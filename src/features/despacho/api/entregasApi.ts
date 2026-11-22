/**
 * Chamadas de rede das entregas do despacho (UC01). Caminhos confirmados pelo
 * backend (S007).
 */
import {
  ENDPOINTS,
  entregaResponseSchema,
  listaEntregasResponseSchema,
  requisitar,
  type AjustarCoordenadaRequest,
  type CriarEntregaAvulsaRequest,
  type EntregaResponse,
} from '@/shared/api'

/**
 * Entregas `AGUARDANDO_DESPACHO` sem revisão pendente (HU01).
 *
 * O filtro `pendenteRevisao === false` também é aplicado aqui, por defesa: o endpoint
 * proposto (`?status=AGUARDANDO_DESPACHO`) pode, conforme o método de serviço usado no
 * backend, devolver também as que estão em revisão (`listarPorEstabelecimentoEStatus`
 * não exclui revisão; `listarPendentesDeDespacho` exclui). Entrega em revisão nunca
 * aparece como pendente de despacho (Constituição, Artigo 5.4).
 */
export async function listarPendentesDeDespacho(signal?: AbortSignal): Promise<EntregaResponse[]> {
  const entregas = await requisitar({
    caminho: ENDPOINTS.entregas.listar,
    query: { status: 'AGUARDANDO_DESPACHO' },
    schema: listaEntregasResponseSchema,
    signal,
  })
  return entregas.filter((e) => e.status === 'AGUARDANDO_DESPACHO' && !e.pendenteRevisao)
}

/** Fila de revisão (`pendenteRevisao = true`). */
export async function listarEmRevisao(signal?: AbortSignal): Promise<EntregaResponse[]> {
  const entregas = await requisitar({
    caminho: ENDPOINTS.entregas.listar,
    query: { pendenteRevisao: true },
    schema: listaEntregasResponseSchema,
    signal,
  })
  return entregas.filter((e) => e.pendenteRevisao)
}

export function criarEntregaAvulsa(corpo: CriarEntregaAvulsaRequest): Promise<EntregaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.entregas.criarAvulsa,
    corpo,
    schema: entregaResponseSchema,
  })
}

/** O servidor grava `prontoParaDespachoEm` (UC01, passo 5). */
export function marcarPronto(id: string): Promise<EntregaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.entregas.marcarPronto(id),
    schema: entregaResponseSchema,
  })
}

export function cancelarEntrega(id: string, motivo: string): Promise<EntregaResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.entregas.cancelar(id),
    corpo: { motivo },
    schema: entregaResponseSchema,
  })
}

export function ajustarCoordenada(
  id: string,
  coordenada: AjustarCoordenadaRequest,
): Promise<EntregaResponse> {
  return requisitar({
    metodo: 'PATCH',
    caminho: ENDPOINTS.entregas.ajustarCoordenada(id),
    corpo: coordenada,
    schema: entregaResponseSchema,
  })
}
