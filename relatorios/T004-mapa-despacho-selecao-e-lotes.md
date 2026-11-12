# Relatorio -- T004 Mapa de despacho, selecao multipla e lotes

**Status final:** CONCLUIDA
**Data:** 2026-11-11

## O que foi feito
- Mapa Leaflet (react-leaflet 4 + OpenStreetMap, sem chave de API) com pino da loja e pinos das entregas AGUARDANDO_DESPACHO com coordenada. Entrega sem coordenada nao aparece no mapa (HU01).
- Pinos arrastaveis para entregas em revisao SEM_COORDENADA com coordenada ja ajustada. O resultado so atualiza apos resposta do servidor (PATCH /api/entregas/{id}/coordenada).
- Selecao multipla: checkbox na lista e clique no pino do mapa. Limite maxPedidosPorLote (padrao 5). Ao estourar, bloqueia com mensagem (UC01 E2). Estado em Zustand (store local da feature, nao global).
- Dialogo de despacho: lista entregadores ONLINE + ATIVO. Sem entregador, botao desabilitado com aviso (UC01 E1). POST /api/lotes sem atualizacao otimista (Constituicao 5.8).
- Lista de lotes DESPACHADO com "Devolver lote" (POST /api/lotes/{id}/devolver). So lotes DESPACHADO oferecem a acao (A4).
- Cliente STOMP em shared/realtime/: conecta em /ws com JWT, reconexao automatica com backoff, indicador "tempo real offline/conectando/ativo". Polling 15s como fallback quando desconectado. Ao receber evento, invalida cache TanStack Query.
- Alerta de integracao degradada: banner com contagem de falhas PENDENTE (UC01 A3, RNF04).
- Barra de selecao com contagem, limite e acoes (despachar / limpar).
- Endpoints de entregas atualizados conforme S007 (confirmados, marca PROVISORIO removida).
- Endpoint /api/auth/refresh adicionado conforme S006.
- Codigo de erro NAO_AUTENTICADO adicionado ao catalogo (S006).
- Handlers MSW para: GET /api/motoboys, GET /api/lotes, POST /api/lotes, POST /api/lotes/{id}/devolver, GET /api/falhas-integracao.
- Mocks de Leaflet e STOMP no setup de testes (jsdom nao suporta canvas nem WebSocket).
- 37 testes novos/atualizados no despacho + 5 testes unitarios do store de selecao.

## O que NAO foi feito (e por que)
- Mock de conexao STOMP nos testes: jsdom nao suporta WebSocket. O mock do @stomp/stompjs nao ativa a conexao. O indicador de tempo real e testado apenas pela presenca do role=status. Cobertura completa fica para E2E com Playwright.
- Coordenada da loja no mapa: o endpoint GET /api/estabelecimento ainda e PROVISORIO e nao ha dados da sessao com a coordenada do estabelecimento. O mapa abre centralizado em Sao Paulo (-23.55, -46.63) por padrao. PROVISORIO ate a F6 ou endpoint confirmado.
- Login real e refresh token automatico: fora do escopo (F7). A S006 foi aceita e o endpoint registrado, mas o fluxo de renovacao automatica sera implementado na F7.

## Arquivos criados/alterados
### Criados
- `src/features/despacho/api/lotesApi.ts` -- chamadas de rede dos lotes
- `src/features/despacho/api/motoboysApi.ts` -- entregadores disponiveis
- `src/features/despacho/api/falhasApi.ts` -- contagem de falhas de integracao
- `src/features/despacho/selecaoStore.ts` -- Zustand store de selecao
- `src/features/despacho/selecao.test.ts` -- testes unitarios do store
- `src/features/despacho/componentes/MapaDespacho.tsx` -- mapa Leaflet
- `src/features/despacho/componentes/DialogoDespacho.tsx` -- dialogo de despacho
- `src/features/despacho/componentes/ListaLotesDespachados.tsx` -- lista de lotes
- `src/features/despacho/componentes/BarraSelecao.tsx` -- barra de selecao
- `src/features/despacho/componentes/AlertaIntegracao.tsx` -- alerta de integracao
- `src/features/despacho/componentes/IndicadorTempoReal.tsx` -- indicador STOMP
- `src/test/msw/dadosMotoboys.ts` -- semente de entregadores
- `src/test/msw/dadosLotes.ts` -- semente de lotes
- `src/test/msw/handlersLotes.ts` -- handlers MSW de lotes, motoboys e falhas

### Alterados
- `src/shared/api/endpoints.ts` -- endpoints de entregas confirmados (S007), auth/refresh (S006), lotes.listar adicionado
- `src/shared/api/erros.ts` -- NAO_AUTENTICADO adicionado (S006)
- `src/shared/realtime/index.ts` -- cliente STOMP completo (era stub vazio)
- `src/features/despacho/api/hooks.ts` -- hooks de lotes, motoboys, falhas; polling condicional STOMP
- `src/features/despacho/componentes/ListaPendentes.tsx` -- checkbox de selecao adicionado
- `src/features/despacho/paginas/DespachoPagina.tsx` -- composicao completa com mapa, selecao, lotes, tempo real
- `src/features/despacho/despacho.test.tsx` -- 37 testes (era ~25, agora cobre selecao, despacho, devolucao, alerta, indicador)
- `src/test/fabricas.ts` -- fabricas de LoteEntregaResponse e MotoboyResponse
- `src/test/msw/handlers.ts` -- inclui handlersLotes
- `src/test/setup.ts` -- mocks de Leaflet, STOMP, reset de lotes/motoboys

## Verificacao
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Passou (0 erros) |
| `npm run lint` | Passou (0 erros, 0 avisos) |
| `npm run test` | 195 testes, 195 passaram (15 arquivos) |

## Decisoes tomadas (dentro do escopo)
- Mapa centralizado em Sao Paulo quando coordenada da loja nao disponivel (PROVISORIO).
- Icones de marcador Leaflet com hue-rotate CSS para diferenciar: loja (azul), selecionado (verde/grande), revisao (amarelo). Cor nao e unico indicador (texto no popup identifica o estado).
- Polling condicional: 15s quando STOMP desconectado, desligado quando conectado (evita duplicacao de consultas).
- Store de selecao e local da feature (nao global) conforme tarefa.
- Falhas de integracao: polling de 60s (menos frequente que entregas, pois e apenas alerta).

## Sugestoes/pendencias registradas para o backend
- Nenhuma nova sugestao criada nesta tarefa. S006 e S007 foram lidas e respondidas (Status: ACEITA).

## Sugestoes respondidas do backend
- `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S006-formato-login-jwt.md` -- Status: ACEITA. Endpoints e codigo de erro atualizados; refresh automatico fica para F7.
- `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S007-endpoints-entregas.md` -- Status: ACEITA. Endpoints de entregas substituidos pelos confirmados; marca PROVISORIO removida.

## Proposta de mudanca no DVP (Constituicao, Artigo 2.4)
Nenhuma.

## Duvidas / bloqueios
- A coordenada do estabelecimento nao esta disponivel na sessao nem em endpoint confirmado. O mapa usa um centro padrao. Quando GET /api/estabelecimento for confirmado (F6), o centro sera atualizado.
- O endpoint de lotes (GET /api/lotes, POST /api/lotes, POST /api/lotes/{id}/devolver) continua PROVISORIO -- aguarda T006 do backend.
- O endpoint de motoboys (GET /api/motoboys) continua PROVISORIO.

## Sugestoes (nao implementadas, fora do que o backend decide)
- Na F7, ao implementar o login real, adicionar o fluxo de refresh automatico (interceptor 401 -> /api/auth/refresh -> retry) conforme S006.
- Considerar adicionar a coordenada do estabelecimento ao UsuarioAutenticadoResponse ou a um endpoint dedicado, para o mapa centralizar corretamente sem uma segunda consulta.
