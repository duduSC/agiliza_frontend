import { z } from 'zod'
import { STATUS_LOTE } from '@/shared/dominio/enums'
import { decimal, inteiro, localDateTime, opcional, uuid } from './comuns'

/**
 * `dto/response/LoteEntregaResponse.java` (conferido em 10/11/2026).
 * O AGENT.md 6.3 cita `distanciaRotaKm`, que NÃO existe no DTO atual — não incluído.
 */
export const loteEntregaResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: uuid,
  motoboyId: uuid,
  usuarioDespachanteId: uuid,
  status: z.enum(STATUS_LOTE),
  qtdEntregas: inteiro,
  valorTotalRepasse: opcional(decimal),
  despachadoEm: opcional(localDateTime),
  concluidoEm: opcional(localDateTime),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type LoteEntregaResponse = z.infer<typeof loteEntregaResponseSchema>
