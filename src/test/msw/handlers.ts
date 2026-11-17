/**
 * Handlers MSW compartilhados entre os testes (Node) e o modo dev (`VITE_USE_MOCKS=true`).
 *
 * Endpoints de entregas confirmados (S007). Os demais sao PROVISORIOS.
 * Endpoints de acerto/recibos/caixa confirmados (S009).
 * O prefixo `*` casa com qualquer origem, entao funciona com ou sem `VITE_API_URL`.
 */
import { handlersAuth } from './handlersAuth'
import { handlersEntregas } from './handlersEntregas'
import { handlersLotes } from './handlersLotes'
import { handlersAcerto } from './handlersAcerto'
import { handlersEstabelecimento } from './handlersEstabelecimento'

export const handlers = [
  // T007 — autenticacao (login, refresh)
  ...handlersAuth,

  // T003 — entregas (pendentes, revisao, avulsa, marcar pronto, cancelar, ajustar coordenada)
  ...handlersEntregas,

  // T004 — lotes, motoboys, falhas de integracao
  ...handlersLotes,

  // T006 — acerto, recibos e caixa (S009)
  ...handlersAcerto,

  // T008 — estabelecimento do token (centro do mapa, maxPedidosPorLote, pagina inicial)
  ...handlersEstabelecimento,
]
