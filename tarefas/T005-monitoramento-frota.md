# T005 — Monitoramento da frota em tempo real

**Status:** CONCLUIDA
**Fase:** F4
**Depende de:** T004
**Referências no DVP:** UC04 (1.4.2.4, HU08, A1), RNF06 (tempo real)
**Skills indicadas:** react-ui-patterns, tanstack-query-expert, frontend-api-integration-patterns, ui-states, vitest-skill

## Objetivo
Implementar a tela `/monitoramento` com o mapa da frota em tempo real: entregadores `ONLINE` e `EM_ROTA` com posição, nome e indicador de disponibilidade, alerta de posição desatualizada, tudo atualizado via STOMP (reutilizando a infraestrutura da T004).

## Antes de começar
Ler a sugestão do backend **S008** em `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S008-endpoints-despacho-entregadores-websocket.md`:
- Contém os endpoints REAIS de motoboys (`/api/motoboys`) e os tópicos/payloads STOMP definitivos
- Substituir os caminhos PROVISÓRIOS de lotes e motoboys em `endpoints.ts` pelos confirmados na S008
- Responder S008 (campos `Status`/`Resposta` — Constituição 3.3)

## Escopo
- [ ] **Mapa Leaflet** (`/monitoramento`): cada entregador `ONLINE` ou `EM_ROTA` mostrado na `ultimaPosicao`, identificado pelo nome. Indicador visual de disponibilidade com legenda (cor **não** pode ser o único indicador — Constituição 7.6).
- [ ] **Alerta de posição desatualizada** (UC04 A1): entregador sem posição há mais de 3 minutos exibe ícone de alerta com o horário da última posição.
- [ ] **Somente consulta:** nenhuma ação altera estado nesta tela.
- [ ] **Tempo real:** reutilizar o cliente STOMP de `shared/realtime/` (T004). O tópico `/topic/estabelecimento/{id}/frota` já está conectado. Ao receber evento de frota, invalidar o cache de motoboys. O indicador "tempo real offline" já existe.
- [ ] Hook de dados em `features/monitoramento/api/`: listar motoboys com posição (`GET /api/motoboys?statusDisponibilidade=ONLINE` e `EM_ROTA`). Polling 15 s como fallback.
- [ ] Popup no marcador do entregador: nome, status, placa, última posição (hora), entregas em rota (se houver info no lote).
- [ ] Estados carregando, vazio ("Nenhum entregador online"), erro (Constituição 7.3).
- [ ] Handlers MSW para entregadores com posição, incluindo caso de posição desatualizada (>3 min).
- [ ] Testes: mapa renderiza entregadores, alerta aparece para posição desatualizada, entregador OFFLINE não aparece, estado vazio.

## Fora do escopo
- Despacho, seleção de entregas, lotes (já na T004).
- Acerto, recibo, caixa (F5).
- Ações sobre entregadores (bloquear, editar — F6/loja).

## Regras de negócio envolvidas
- Constituição 7.3, 7.6 (acessibilidade), 9.2 (`PROVISÓRIO`).

## Critérios de aceite
- Dado entregadores ONLINE e EM_ROTA no MSW, quando abro `/monitoramento`, cada um aparece no mapa na posição correta.
- Dado entregador com `ultimaPosicaoEm` há mais de 3 minutos, o ícone de alerta aparece.
- Dado nenhum entregador online, o estado vazio "Nenhum entregador online" é exibido.
- A tela não oferece nenhuma ação de escrita.
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
Os endpoints de motoboys têm implementação real (T006 backend, S008). Atualize `endpoints.ts` com os caminhos confirmados. Os handlers MSW continuam necessários para os testes.

## Ao terminar
Escreva `../relatorios/T005-monitoramento-frota.md`, faça o merge para `develop` e pare. Sem `git push`. Siga D006.
