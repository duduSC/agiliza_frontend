/**
 * Chamadas de rede dos entregadores para o despacho (UC01 E1).
 * PROVISORIO: o backend ainda nao tem controller de motoboys.
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { motoboyResponseSchema, type MotoboyResponse } from '@/shared/api/schemas'

const listaMotoboysSchema = z.array(motoboyResponseSchema)

/**
 * Entregadores disponiveis para despacho: ONLINE + ATIVO (Constituicao 5.6).
 * O filtro e feito no servidor; aqui tambem filtramos por defesa.
 */
export async function listarEntregadoresDisponiveis(signal?: AbortSignal): Promise<MotoboyResponse[]> {
  const motoboys = await requisitar({
    caminho: ENDPOINTS.motoboys.listar,
    query: { statusDisponibilidade: 'ONLINE' },
    schema: listaMotoboysSchema,
    signal,
  })
  return motoboys.filter(
    (m) => m.statusDisponibilidade === 'ONLINE' && m.statusCadastro === 'ATIVO',
  )
}
