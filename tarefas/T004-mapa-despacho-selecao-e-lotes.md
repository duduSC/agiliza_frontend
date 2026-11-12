# T004 — Mapa de despacho, seleção múltipla e lotes

**Status:** EM_ANDAMENTO
**Fase:** F3
**Depende de:** T003
**Referências no DVP:** UC01 (fluxo principal, A1–A5, E1–E2), HU01, HU02, HU03, 1.4.4 (máquina de estados), 1.5.4 (LOTE_ENTREGA, MOTOBOY), RNF06 (tempo real)
**Skills indicadas:** react-ui-patterns, tanstack-query-expert, frontend-api-integration-patterns, ui-states, zod-validation-expert, vitest-skill

## Objetivo
Completar a tela `/despacho` com o mapa Leaflet, a seleção múltipla de entregas, o despacho para um entregador, a devolução de lotes e a conexão STOMP para tempo real — tudo o que a T003 deixou de fora.

## Escopo
- [ ] **Mapa Leaflet** (react-leaflet 4 + OpenStreetMap, sem chave de API): pino da loja no centro, um pino para cada entrega `AGUARDANDO_DESPACHO` com coordenada. Entrega sem coordenada (revisão `SEM_COORDENADA`) **não** aparece no mapa (HU01), só na lista de revisão (já feita na T003). Clicar no pino seleciona a entrega; popup com resumo (cliente, bairro, distância, repasse ou "—").
- [ ] **Arrastar/definir pino** para entregas em revisão `SEM_COORDENADA`: o resultado só atualiza após resposta do servidor (`PATCH /api/entregas/{id}/coordenada`, já existe na T003). Substituir o campo de lat/lng da T003 por essa interação no mapa.
- [ ] **Seleção múltipla:** clicar no pino ou na lista (T003) alterna a seleção. Limite de `maxPedidosPorLote` do estabelecimento (padrão 5). Ao estourar o limite, bloquear e exibir mensagem (UC01 E2). Estado de seleção em Zustand (store local da feature, não global).
- [ ] **Diálogo de despacho:** abre ao clicar "Despachar" com entregas selecionadas. Lista os entregadores `ONLINE` + `ATIVO` (hook de `GET /api/motoboys?statusDisponibilidade=ONLINE`). Sem entregador disponível, botão desabilitado com aviso "Nenhum entregador online" (UC01 E1). Ao confirmar, `POST /api/lotes` com `{ motoboyId, entregaIds }`. Sem atualização otimista (Constituição 5.8): estado de envio + bloqueio de duplo clique + invalidar cache após resposta.
- [ ] **Lotes despachados:** lista de lotes `DESPACHADO` com "Devolver lote" (`POST /api/lotes/{id}/devolver`). Só lotes `DESPACHADO` oferecem a ação (A4).
- [ ] **WebSocket/STOMP:** conectar em `/ws` com JWT no header `Authorization`. Tópicos: `/topic/estabelecimento/{id}/entregas` e `/topic/estabelecimento/{id}/frota`. Ao receber evento, invalidar o cache TanStack Query correspondente. Reconexão automática com backoff. Indicador "tempo real offline" quando desconectado. Polling de 15 s como fallback.
- [ ] **Alerta de integração degradada** (UC01 A3, RNF04): banner quando houver falhas `PENDENTE` em `GET /api/falhas-integracao?status=PENDENTE`. Pode ser uma contagem simples com link para a futura tela de integração.
- [ ] Hooks de dados em `features/despacho/api/`: listar lotes, despachar, devolver, listar entregadores disponíveis. Adicionar aos hooks existentes da T003. Hooks STOMP em `shared/realtime/`.
- [ ] Estados carregando, vazio, erro e sucesso em todas as interações novas (Constituição 7.3).
- [ ] Handlers MSW para: `GET /api/motoboys`, `POST /api/lotes`, `POST /api/lotes/{id}/devolver`, `GET /api/falhas-integracao`, conexão STOMP (se viável com MSW; senão, documentar no relatório).
- [ ] Testes: mapa renderiza pinos, seleção respeita limite, despacho com/sem entregador, devolução só de lote DESPACHADO, indicador de tempo real offline.

## Antes de começar
Ler as sugestões do backend em `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/`:
- **S006** (formato do login/JWT): adaptar `shared/api/client.ts` se necessário para o refresh token e os novos códigos de erro (`NAO_AUTENTICADO`). Se a sessão de dev (PROVISÓRIA) não usa JWT, registre o que falta para a F7.
- **S007** (endpoints reais de entregas): substituir os caminhos PROVISÓRIOS de entregas em `endpoints.ts` pelos confirmados na S007. Remover a marca PROVISÓRIO dos que forem confirmados. Responder S006 e S007 (campos `Status`/`Resposta` — Constituição 3.3).

## Fora do escopo
- Tela de login real (F7).
- Monitoramento da frota em tempo real — tela separada (F4).
- Acerto, recibo, caixa (F5).
- Loja, restaurantes, integração (F6).
- Otimização/sugestão de rota (fora do MVP).

## Regras de negócio envolvidas
- Constituição 5.1 (sem cálculo de dinheiro no cliente), 5.5 (máquina de estados), 5.6 (despacho: ONLINE + ATIVO, limite maxPedidosPorLote), 5.8 (sem otimismo em escritas de dinheiro), 7.2, 7.3, 9.2 (`PROVISÓRIO`).

## Critérios de aceite
- Dado entregas com coordenada no MSW, quando abro `/despacho`, os pinos aparecem no mapa e a lista (T003) continua funcionando.
- Dado seleção de N+1 entregas (N = maxPedidosPorLote), a seleção da N+1 é bloqueada com mensagem.
- Dado nenhum entregador ONLINE, o botão "Despachar" está desabilitado e mostra aviso.
- Dado despacho com sucesso, as entregas saem da lista de pendentes e o lote aparece na lista de despachados.
- Dado lote DESPACHADO, "Devolver lote" está disponível; dado lote em outro status, não está.
- Dado STOMP desconectado, o indicador "tempo real offline" aparece e o polling de 15 s funciona.
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
Os endpoints de lotes (`/api/lotes`) e entregadores (`/api/motoboys`) são PROVISÓRIOS — o backend ainda vai implementá-los na T006. Use os caminhos propostos no AGENT.md 6.7 com MSW. Quando o backend publicar a sugestão com os caminhos reais (S0xx em `sugestoes-frontend/`), alinhe `endpoints.ts`. Os endpoints de entregas agora têm implementação real (S007) — atualize os caminhos.

## Ao terminar
Escreva `../relatorios/T004-mapa-despacho-selecao-e-lotes.md`, faça o merge para `develop` e pare. Sem `git push`. Siga D006: não pare esperando aval do Eduardo; use o padrão restritivo, marque PROVISÓRIO e liste em "Dúvidas / bloqueios".
