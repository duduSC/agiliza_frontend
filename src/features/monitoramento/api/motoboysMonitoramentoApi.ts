/**
 * Chamadas de rede dos entregadores para o monitoramento (UC04, HU08).
 * Endpoints confirmados pelo backend (S008, T006 do backend).
 *
 * Diferente do despacho (que filtra ONLINE + ATIVO para selecao), aqui
 * listamos ONLINE e EM_ROTA para mostrar no mapa da frota.
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { motoboyResponseSchema, type MotoboyResponse } from '@/shared/api/schemas'

const listaMotoboysSchema = z.array(motoboyResponseSchema)

/**
 * Entregadores visiveis no monitoramento: ONLINE ou EM_ROTA (UC04).
 * Faz duas chamadas (uma por status) e junta os resultados, pois
 * o endpoint aceita um unico `statusDisponibilidade` por vez (S008).
 */
export async function listarEntregadoresNoMapa(signal?: AbortSignal): Promise<MotoboyResponse[]> {
  const [online, emRota] = await Promise.all([
    requisitar({
      caminho: ENDPOINTS.motoboys.listar,
      query: { statusDisponibilidade: 'ONLINE' },
      schema: listaMotoboysSchema,
      signal,
    }),
    requisitar({
      caminho: ENDPOINTS.motoboys.listar,
      query: { statusDisponibilidade: 'EM_ROTA' },
      schema: listaMotoboysSchema,
      signal,
    }),
  ])
  return [...online, ...emRota]
}
