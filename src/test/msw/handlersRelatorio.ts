/**
 * Handler MSW do relatório do dia (T010), no contrato da D013. PROVISÓRIO até o DTO da T015 do
 * backend chegar a `develop`. Os totais são dados prontos, como o servidor os mandaria: o
 * frontend nunca os soma (Constituição, Artigo 5.1).
 */
import { http, HttpResponse } from 'msw'
import { formatInTimeZone } from 'date-fns-tz'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { RelatorioDoDiaResponse } from '@/shared/api/schemas'
import { erroApi } from './respostas'

export function relatorioDoDiaMock(sobrescrever: Partial<RelatorioDoDiaResponse> = {}): RelatorioDoDiaResponse {
  return {
    data: '2026-11-09',
    totalEntregas: 7,
    entregues: 5,
    falhas: 1,
    canceladas: 1,
    entregadoresQueTrabalharam: 2,
    valorTotalRepasse: 52.5,
    valorPago: 20,
    valorAPagar: 32.5,
    porEntregador: [
      {
        motoboyId: '3d4e5f6a-7b8c-4d9e-bf0a-1b2c3d4e5f6a',
        nome: 'Ricardo Silva',
        entregas: 4,
        entregues: 3,
        falhas: 1,
        valorRepasse: 30,
        valorPago: 20,
        valorAPagar: 10,
      },
      {
        motoboyId: '4e5f6a7b-8c9d-4e0f-a1b2-2c3d4e5f6a7b',
        nome: 'Marcos Pereira',
        entregas: 3,
        entregues: 2,
        falhas: 0,
        valorRepasse: 22.5,
        valorPago: 0,
        valorAPagar: 22.5,
      },
    ],
    ...sobrescrever,
  }
}

export const handlersRelatorio = [
  http.get(`*${ENDPOINTS.relatorios.dia}`, ({ request }) => {
    const data = new URL(request.url).searchParams.get('data')
    if (data !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return erroApi(request, 400, 'PARAMETRO_INVALIDO', 'Parâmetro inválido: data.')
    }
    return HttpResponse.json(
      relatorioDoDiaMock({ data: data ?? formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd') }),
    )
  }),
]
