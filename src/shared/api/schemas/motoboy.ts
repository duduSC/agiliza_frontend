import { z } from 'zod'
import { STATUS_CADASTRO_MOTOBOY, STATUS_DISPONIBILIDADE_MOTOBOY } from '@/shared/dominio/enums'
import { localDateTime, opcional, uuid } from './comuns'
import { coordenadaSchema } from './coordenada'

/** `dto/response/MotoboyResponse.java` — o CPF não vem (RNF02; Constituição 6.4). */
export const motoboyResponseSchema = z.object({
  id: uuid,
  usuarioId: uuid,
  nome: z.string(),
  telefone: z.string(),
  placaVeiculo: opcional(z.string()),
  statusCadastro: z.enum(STATUS_CADASTRO_MOTOBOY),
  statusDisponibilidade: z.enum(STATUS_DISPONIBILIDADE_MOTOBOY),
  ultimaPosicao: opcional(coordenadaSchema),
  ultimaPosicaoEm: opcional(localDateTime),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type MotoboyResponse = z.infer<typeof motoboyResponseSchema>
