import { z } from 'zod'
import { STATUS_RECIBO } from '@/shared/dominio/enums'
import { decimal, inteiro, localDate, localDateTime, opcional, uuid } from './comuns'

/** `dto/response/ReciboResponse.java` */
export const reciboResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: uuid,
  caixaId: uuid,
  motoboyId: uuid,
  usuarioGeradorId: uuid,
  dataReferencia: localDate,
  periodoInicio: localDateTime,
  periodoFim: localDateTime,
  qtdEntregas: inteiro,
  valorTotal: decimal,
  status: z.enum(STATUS_RECIBO),
  pagoEm: opcional(localDateTime),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type ReciboResponse = z.infer<typeof reciboResponseSchema>
