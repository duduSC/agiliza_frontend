/**
 * TODOS os caminhos da API REST (AGENT.md 6.7).
 *
 * Nenhum controller REST existe ainda no backend: todos os caminhos abaixo são
 * proposta e estão marcados `// PROVISÓRIO` (Constituição, Artigo 9.2). Quando o
 * backend confirmar um caminho, remover a marca daquela linha.
 */

type Id = string

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login', // PROVISÓRIO
  },
  entregas: {
    // PROVISÓRIO — filtros ?status=AGUARDANDO_DESPACHO (pendentes) e ?pendenteRevisao=true
    // (fila de revisão; ainda sem método de serviço no backend, S004 do backend).
    listar: '/api/entregas',
    criarAvulsa: '/api/entregas', // PROVISÓRIO — POST, corpo CriarEntregaAvulsaRequest
    marcarPronto: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/pronto`, // PROVISÓRIO — POST sem corpo
    ajustarCoordenada: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/coordenada`, // PROVISÓRIO — PATCH, corpo CoordenadaDto
    cancelar: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/cancelar`, // PROVISÓRIO — POST, corpo { motivo }
    ajustarRepasse: (id: Id) => `/api/entregas/${encodeURIComponent(id)}/ajustes`, // PROVISÓRIO
  },
  lotes: {
    despachar: '/api/lotes', // PROVISÓRIO
    devolver: (id: Id) => `/api/lotes/${encodeURIComponent(id)}/devolver`, // PROVISÓRIO
  },
  motoboys: {
    listar: '/api/motoboys', // PROVISÓRIO
    criar: '/api/motoboys', // PROVISÓRIO
    bloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/bloquear`, // PROVISÓRIO
    desbloquear: (id: Id) => `/api/motoboys/${encodeURIComponent(id)}/desbloquear`, // PROVISÓRIO
  },
  acertos: {
    extrato: '/api/acertos', // PROVISÓRIO — ?motoboyId=&inicio=&fim=
  },
  recibos: {
    gerar: '/api/recibos', // PROVISÓRIO
    pagar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/pagar`, // PROVISÓRIO
    cancelar: (id: Id) => `/api/recibos/${encodeURIComponent(id)}/cancelar`, // PROVISÓRIO
  },
  caixas: {
    atual: '/api/caixas/atual', // PROVISÓRIO
    abrir: '/api/caixas', // PROVISÓRIO
    fechar: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/fechar`, // PROVISÓRIO
    reabrir: (id: Id) => `/api/caixas/${encodeURIComponent(id)}/reabrir`, // PROVISÓRIO
  },
  faixasPreco: {
    listar: '/api/faixas-preco', // PROVISÓRIO
    salvarTabela: '/api/faixas-preco', // PROVISÓRIO — PUT da tabela inteira (DVP 1.5.4)
  },
  estabelecimento: {
    atual: '/api/estabelecimento', // PROVISÓRIO — GET/PATCH da loja do token
  },
  integracoes: {
    configuracao: '/api/integracoes', // PROVISÓRIO — GET/PUT
    falhas: '/api/falhas-integracao', // PROVISÓRIO — ?status=PENDENTE
  },
  estabelecimentos: {
    listar: '/api/estabelecimentos', // PROVISÓRIO — ADMIN_GERAL
    criar: '/api/estabelecimentos', // PROVISÓRIO — ADMIN_GERAL
    alterarStatus: (id: Id) => `/api/estabelecimentos/${encodeURIComponent(id)}/status`, // PROVISÓRIO
  },
} as const
