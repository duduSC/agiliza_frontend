/**
 * Contagem de falhas de integracao pendentes (UC01 A3, RNF04).
 * PROVISORIO: o backend ainda nao tem controller de falhas.
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { STATUS_FALHA_INTEGRACAO, ETAPAS_FALHA_INTEGRACAO } from '@/shared/dominio'
import { localDateTime, opcional, uuid } from '@/shared/api/schemas'

const falhaIntegracaoResponseSchema = z.object({
  id: z.number(),
  configuracaoIntegracaoId: uuid,
  idExterno: opcional(z.string()),
  etapa: z.enum(ETAPAS_FALHA_INTEGRACAO),
  tentativas: z.number(),
  status: z.enum(STATUS_FALHA_INTEGRACAO),
  ocorridoEm: localDateTime,
  resolvidoEm: opcional(localDateTime),
})

const listaFalhasSchema = z.array(falhaIntegracaoResponseSchema)

export type FalhaIntegracaoResponse = z.infer<typeof falhaIntegracaoResponseSchema>

export async function contarFalhasPendentes(signal?: AbortSignal): Promise<number> {
  const falhas = await requisitar({
    caminho: ENDPOINTS.integracoes.falhas,
    query: { status: 'PENDENTE' },
    schema: listaFalhasSchema,
    signal,
  })
  return falhas.length
}
