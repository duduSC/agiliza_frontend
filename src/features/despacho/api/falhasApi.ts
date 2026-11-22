/**
 * Contagem de falhas de integracao pendentes (UC01 A3, RNF04).
 * Endpoint confirmado pelo backend (S010).
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { falhaIntegracaoResponseSchema } from '@/shared/api/schemas'

const listaFalhasSchema = z.array(falhaIntegracaoResponseSchema)

export async function contarFalhasPendentes(signal?: AbortSignal): Promise<number> {
  const falhas = await requisitar({
    caminho: ENDPOINTS.integracoes.falhas,
    query: { status: 'PENDENTE' },
    schema: listaFalhasSchema,
    signal,
  })
  return falhas.length
}
