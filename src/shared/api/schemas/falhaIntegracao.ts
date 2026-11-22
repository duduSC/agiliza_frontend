import { z } from 'zod'
import { ETAPAS_FALHA_INTEGRACAO, STATUS_FALHA_INTEGRACAO } from '@/shared/dominio/enums'
import { inteiro, localDateTime, opcional, uuid } from './comuns'

/** `dto/response/FalhaIntegracaoResponse.java` */
export const falhaIntegracaoResponseSchema = z.object({
  id: inteiro,
  configuracaoIntegracaoId: uuid,
  idExterno: opcional(z.string()),
  etapa: z.enum(ETAPAS_FALHA_INTEGRACAO),
  tentativas: inteiro,
  status: z.enum(STATUS_FALHA_INTEGRACAO),
  ocorridoEm: localDateTime,
  resolvidoEm: opcional(localDateTime),
})
export type FalhaIntegracaoResponse = z.infer<typeof falhaIntegracaoResponseSchema>
