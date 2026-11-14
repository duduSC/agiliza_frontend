import { z } from 'zod'
import { SITUACOES_ACERTO, STATUS_ENTREGA } from '@/shared/dominio/enums'
import { decimal, localDateTime, opcional, uuid } from './comuns'

/** `dto/response/LinhaExtratoResponse.java` (AGENT.md 6.3) */
export const linhaExtratoResponseSchema = z.object({
  entregaId: uuid,
  nomeCliente: z.string(),
  finalizadaEm: opcional(localDateTime),
  status: z.enum(STATUS_ENTREGA),
  distanciaKm: opcional(decimal),
  faixaDeKm: opcional(decimal),
  faixaAteKm: opcional(decimal),
  foraDeArea: z.boolean(),
  valorRepasse: opcional(decimal),
  situacao: z.enum(SITUACOES_ACERTO),
  reciboId: opcional(uuid),
})
export type LinhaExtratoResponse = z.infer<typeof linhaExtratoResponseSchema>

/** `dto/response/ExtratoAcertoResponse.java` (AGENT.md 6.3, S009) */
export const extratoAcertoResponseSchema = z.object({
  motoboyId: uuid,
  nomeEntregador: z.string(),
  periodoInicio: localDateTime,
  periodoFim: localDateTime,
  linhas: z.array(linhaExtratoResponseSchema),
  totalDevido: decimal,
  totalConsolidado: decimal,
  totalEmRevisao: decimal,
  possuiValorIndefinido: z.boolean(),
})
export type ExtratoAcertoResponse = z.infer<typeof extratoAcertoResponseSchema>

/** `dto/response/EntregaAjusteValorResponse.java` (AGENT.md 6.3) */
export const entregaAjusteValorResponseSchema = z.object({
  id: z.number().int(),
  entregaId: uuid,
  usuarioId: uuid,
  valorAnterior: decimal,
  valorNovo: decimal,
  motivo: z.string(),
  ajustadoEm: localDateTime,
})
export type EntregaAjusteValorResponse = z.infer<typeof entregaAjusteValorResponseSchema>

export const listaAjustesResponseSchema = z.array(entregaAjusteValorResponseSchema)
