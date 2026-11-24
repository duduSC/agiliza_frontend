/**
 * Chamadas de rede dos entregadores para o monitoramento (UC04, HU08).
 * Endpoints confirmados pelo backend (S008, T006 do backend).
 *
 * Diferente do despacho (que filtra ONLINE + ATIVO para selecao), aqui
 * listamos ONLINE e EM_ROTA para mostrar no mapa da frota.
 */
import { z } from 'zod'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { motoboyResponseSchema, type MotoboyResponse } from '@/shared/api/schemas'

const listaMotoboysSchema = z.array(motoboyResponseSchema)

/**
 * Entregadores visiveis no monitoramento: ONLINE ou EM_ROTA (UC04).
 * Uma leitura so, filtrada aqui: com uma por status, quem trocasse de status entre as duas
 * aparecia duas vezes ou sumia. Cadastro bloqueado nao faz parte da frota.
 */
export async function listarEntregadoresNoMapa(signal?: AbortSignal): Promise<MotoboyResponse[]> {
  const motoboys = await requisitar({
    caminho: ENDPOINTS.motoboys.listar,
    schema: listaMotoboysSchema,
    signal,
  })
  return motoboys.filter(
    (m) => m.statusCadastro === 'ATIVO' && m.statusDisponibilidade !== 'OFFLINE',
  )
}
