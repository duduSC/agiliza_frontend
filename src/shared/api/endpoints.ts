/**
 * TODOS os caminhos da API REST (AGENT.md 6.7).
 *
 * Endpoints de entregas confirmados pelo backend (S007, T005 do backend).
 * Endpoints de auth confirmados pelo backend (S006, T004 do backend).
 * Endpoints de lotes confirmados pelo backend (S008, T006 do backend).
 * Endpoints de motoboys confirmados pelo backend (S008, T006 do backend).
 * Endpoints de acerto/recibos/caixa confirmados pelo backend (S009, T007 do backend).
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
    ajustarRepasse: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/ajustes`, // Confirmado (S009) — POST ajuste / GET historico
    historicoAjustes: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/ajustes`, // Confirmado (S009) — GET
  },
  lotes: {
    listar: '/api/lotes', // Confirmado (S008) — GET, params: ?status (default DESPACHADO)
    despachar: '/api/lotes', // Confirmado (S008) — POST 201, corpo DespacharLoteRequest
    detalhe: (id: Id) => `/api/lotes/${encodeURIComponent(id)}`, // Confirmado (S008) — GET
    devolver: (id: Id) => `/api/lotes/${encodeURIComponent(id)}/devolver`, // Confirmado (S008) — POST
    rota: (id: Id) => `/api/lotes/${encodeURIComponent(id)}/rota`, // Confirmado (S008) — GET (fora do escopo MVP)
  },
  motoboys: {
    listar: '/api/motoboys', // Confirmado (S008) — GET, params: ?statusCadastro, ?statusDisponibilidade
    detalhe: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}`, // Confirmado (S008) — GET
    criar: '/api/motoboys', // Confirmado (S008) — POST 201
    editar: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}`, // Confirmado (S008) — PUT
    bloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/bloquear`, // Confirmado (S008) — POST
    desbloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/desbloquear`, // Confirmado (S008) — POST
  },
  acertos: {
    extrato: '/api/acertos', // Confirmado (S009) — GET ?motoboyId=&inicio=&fim=
  },
  recibos: {
    listar: '/api/recibos', // Confirmado (S009) — GET ?motoboyId=&caixaId=
    gerar: '/api/recibos', // Confirmado (S009) — POST 201
    detalhe: (id: Id) => `/api/recibos/${encodeURIComponent(id)}`, // Confirmado (S009) — GET
    pagar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/pagar`, // Confirmado (S009) — POST
    cancelar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/cancelar`, // Confirmado (S009) — POST
  },
  caixas: {
    atual: '/api/caixas/atual', // Confirmado (S009) — GET
    listar: '/api/caixas', // Confirmado (S009) — GET ?dataInicio=&dataFim=
    abrir: '/api/caixas', // Confirmado (S009) — POST 201
    fechar: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/fechar`, // Confirmado (S009) — POST
    reabrir: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/reabrir`, // Confirmado (S009) — POST (so ADMIN_RESTAURANTE)
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
