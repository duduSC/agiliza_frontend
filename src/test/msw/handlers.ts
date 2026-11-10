/**
 * Handlers MSW compartilhados entre os testes (Node) e o modo dev (`VITE_USE_MOCKS=true`).
 *
 * T001: só um handler de exemplo. Todo endpoint aqui é PROVISÓRIO (ver `shared/api/endpoints.ts`).
 * O prefixo `*` casa com qualquer origem, então funciona com ou sem `VITE_API_URL`.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { criarCaixaResponse } from '@/test/fabricas'

export const handlers = [
  // PROVISÓRIO — exemplo
  http.get(`*${ENDPOINTS.caixas.atual}`, () => HttpResponse.json(criarCaixaResponse())),
]
