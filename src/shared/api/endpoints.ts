/**
 * TODOS os caminhos da API REST (AGENT.md 6.7).
 *
 * Endpoints de entregas confirmados pelo backend (S007, T005 do backend).
 * Endpoints de auth confirmados pelo backend (S006, T004 do backend).
 * Endpoints de lotes confirmados pelo backend (S008, T006 do backend).
 * Endpoints de motoboys confirmados pelo backend (S008, T006 do backend).
 * Endpoints de acerto/recibos/caixa confirmados pelo backend (S009, T007 do backend).
 * Loja, integracao e restaurantes confirmados pelo backend (S010, T008 do backend).
 * Todos conferidos contra os controllers da develop 8c02b47 (T009, 22/11/2026): as listagens
 * devolvem lista simples, sem paginacao.
 */

type Id = string

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login', // Confirmado (S006)
    refresh: '/api/auth/refresh', // Confirmado (S006); a regra do refresh esta fora do DVP 3.1 (D002)
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
    listar: '/api/faixas-preco', // Confirmado (S010) — GET, so ADMIN_RESTAURANTE
    salvarTabela: '/api/faixas-preco', // Confirmado (S010) — PUT da tabela inteira (DVP 1.5.4)
  },
  estabelecimento: {
    atual: '/api/estabelecimento', // Confirmado (S010) — GET (OPERACAO) / PATCH (LOJA)
  },
  integracoes: {
    configuracao: '/api/integracoes', // Confirmado (S010) — GET devolve lista / PUT
    falhas: '/api/falhas-integracao', // Confirmado (S010) — GET ?status= (padrao PENDENTE)
  },
  relatorios: {
    // PROVISÓRIO (T010): contrato da D013. DTO conferido no worktree .t015 do backend (099c91a,
    // RelatorioDoDiaResponse): bate campo a campo. Ainda não está em develop do backend.
    dia: '/api/relatorios/dia', // GET ?data=AAAA-MM-DD (sem data, hoje em Sao Paulo)
  },
  estabelecimentos: {
    listar: '/api/estabelecimentos', // Confirmado (S010) — ADMIN_GERAL
    criar: '/api/estabelecimentos', // Confirmado (S010) — POST 201, com administrador aninhado
    alterarStatus: (id: Id) => `/api/estabelecimentos/${encodeURIComponent(id)}/status`, // Confirmado (S010) — PATCH
  },
} as const
