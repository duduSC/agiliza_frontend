import { z } from 'zod'
import { STATUS_ESTABELECIMENTO } from '@/shared/dominio/enums'
import { decimal, inteiro, localDateTime, opcional, uuid } from './comuns'
import { coordenadaSchema } from './coordenada'

/** `dto/response/EstabelecimentoResponse.java` */
export const estabelecimentoResponseSchema = z.object({
  id: uuid,
  razaoSocial: z.string(),
  nomeFantasia: z.string(),
  cnpj: z.string(),
  telefone: opcional(z.string()),
  enderecoCompleto: z.string(),
  coordenada: coordenadaSchema,
  status: z.enum(STATUS_ESTABELECIMENTO),
  maxPedidosPorLote: inteiro,
  valorRepasseForaDeArea: opcional(decimal),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type EstabelecimentoResponse = z.infer<typeof estabelecimentoResponseSchema>
