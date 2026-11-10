import { z } from 'zod'
import { decimal, localDate, localDateTime, opcional, uuid } from './comuns'

/** `dto/response/DistanciaPrecoResponse.java` */
export const distanciaPrecoResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: uuid,
  deKm: decimal,
  ateKm: decimal,
  valorPago: decimal,
  ativo: z.boolean(),
  vigenteDesde: localDate,
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type DistanciaPrecoResponse = z.infer<typeof distanciaPrecoResponseSchema>
