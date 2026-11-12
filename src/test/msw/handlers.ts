/**
 * Handlers MSW compartilhados entre os testes (Node) e o modo dev (`VITE_USE_MOCKS=true`).
 *
 * Endpoints de entregas confirmados (S007). Os demais sao PROVISORIOS.
 * O prefixo `*` casa com qualquer origem, entao funciona com ou sem `VITE_API_URL`.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { criarCaixaResponse } from '@/test/fabricas'
import { handlersEntregas } from './handlersEntregas'
import { handlersLotes } from './handlersLotes'

export const handlers = [
  // PROVISORIO — caixa
  http.get(`*${ENDPOINTS.caixas.atual}`, () => HttpResponse.json(criarCaixaResponse())),

  // T003 — entregas (pendentes, revisao, avulsa, marcar pronto, cancelar, ajustar coordenada)
  ...handlersEntregas,

  // T004 — lotes, motoboys, falhas de integracao
  ...handlersLotes,
]
