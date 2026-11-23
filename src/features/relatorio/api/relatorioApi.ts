/** Chamada de rede do relatório do dia (T010). Caminho e DTO PROVISÓRIOS (D013). */
import { ENDPOINTS, relatorioDoDiaResponseSchema, requisitar, type RelatorioDoDiaResponse } from '@/shared/api'

export function buscarRelatorioDoDia(data: string, signal?: AbortSignal): Promise<RelatorioDoDiaResponse> {
  return requisitar({
    caminho: ENDPOINTS.relatorios.dia,
    query: { data },
    schema: relatorioDoDiaResponseSchema,
    signal,
  })
}
