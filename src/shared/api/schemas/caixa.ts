import { z } from 'zod'
import { STATUS_CAIXA } from '@/shared/dominio/enums'
import { decimal, inteiro, localDate, localDateTime, opcional, uuid } from './comuns'

/** `dto/response/CaixaResponse.java` */
export const caixaResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: uuid,
  dataReferencia: localDate,
  abertoEm: localDateTime,
  fechadoEm: opcional(localDateTime),
  usuarioFechamentoId: opcional(uuid),
  status: z.enum(STATUS_CAIXA),
  qtdRecibos: opcional(inteiro),
  valorTotal: opcional(decimal),
  reabertoEm: opcional(localDateTime),
  usuarioReaberturaId: opcional(uuid),
  motivoReabertura: opcional(z.string()),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type CaixaResponse = z.infer<typeof caixaResponseSchema>
