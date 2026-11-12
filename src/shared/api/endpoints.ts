/**
 * TODOS os caminhos da API REST (AGENT.md 6.7).
 *
 * Endpoints de entregas confirmados pelo backend (S007, T005 do backend).
 * Endpoints de auth confirmados pelo backend (S006, T004 do backend).
 * Os demais continuam PROVISORIOS ate o backend publicar os controllers.
 */

type Id = string

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login', // Confirmado (S006)
    refresh: '/api/auth/refresh', // Confirmado (S006)
  },
  entregas: {
    // Confirmado (S007) — filtros ?status=AGUARDANDO_DESPACHO e ?pendenteRevisao=true
    listar: '/api/entregas',
    detalhe: (id: Id) => `/api/entregas/${encodeURIComponent(id)}`,
    criarAvulsa: '/api/entregas', // Confirmado (S007) — POST, corpo CriarEntregaAvulsaRequest
    marcarPronto: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/pronto`, // Confirmado (S007) — POST sem corpo
    ajustarCoordenada: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/coordenada`, // Confirmado (S007) — PATCH, corpo { latitude, longitude }
    cancelar: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/cancelar`, // Confirmado (S007) — POST, corpo { motivo }
    resolverRevisao: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/revisao/resolver`, // Confirmado (S007) — POST, corpo { valorRepasse?, motivo }
    ajustarRepasse: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/ajustes`, // PROVISORIO
  },
  lotes: {
    listar: '/api/lotes', // PROVISORIO — GET, ?status=DESPACHADO
    despachar: '/api/lotes', // PROVISORIO — POST, corpo DespacharLoteRequest
    devolver: (id: Id) => `/api/lotes/${encodeURIComponent(id)}/devolver`, // PROVISORIO
  },
  motoboys: {
    listar: '/api/motoboys', // PROVISORIO
    criar: '/api/motoboys', // PROVISORIO
    bloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/bloquear`, // PROVISORIO
    desbloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/desbloquear`, // PROVISORIO
  },
  acertos: {
    extrato: '/api/acertos', // PROVISORIO — ?motoboyId=&inicio=&fim=
  },
  recibos: {
    gerar: '/api/recibos', // PROVISORIO
    pagar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/pagar`, // PROVISORIO
    cancelar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/cancelar`, // PROVISORIO
  },
  caixas: {
    atual: '/api/caixas/atual', // PROVISORIO
    abrir: '/api/caixas', // PROVISORIO
    fechar: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/fechar`, // PROVISORIO
    reabrir: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/reabrir`, // PROVISORIO
  },
  faixasPreco: {
    listar: '/api/faixas-preco', // PROVISORIO
    salvarTabela: '/api/faixas-preco', // PROVISORIO — PUT da tabela inteira (DVP 1.5.4)
  },
  estabelecimento: {
    atual: '/api/estabelecimento', // PROVISORIO — GET/PATCH da loja do token
  },
  integracoes: {
    configuracao: '/api/integracoes', // PROVISORIO — GET/PUT
    falhas: '/api/falhas-integracao', // PROVISORIO — ?status=PENDENTE
  },
  estabelecimentos: {
    listar: '/api/estabelecimentos', // PROVISORIO — ADMIN_GERAL
    criar: '/api/estabelecimentos', // PROVISORIO — ADMIN_GERAL
    alterarStatus: (id: Id) => `/api/estabelecimentos/${encodeURIComponent(id)}/status`, // PROVISORIO
  },
} as const
