/**
 * Handlers MSW compartilhados entre os testes (Node) e o modo dev (`VITE_USE_MOCKS=true`).
 *
 * Todo endpoint aqui e PROVISORIO (ver `shared/api/endpoints.ts`).
 * O prefixo `*` casa com qualquer origem, entao funciona com ou sem `VITE_API_URL`.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { criarCaixaResponse } from '@/test/fabricas'
import { handlersEntregas } from './handlersEntregas'

export const handlers = [
  // PROVISORIO — exemplo
  http.get(`*${ENDPOINTS.caixas.atual}`, () => HttpResponse.json(criarCaixaResponse())),

  // T003 — entregas (pendentes, revisao, avulsa, marcar pronto, cancelar, ajustar coordenada)
  ...handlersEntregas,
]
