# T003 — Entregas pendentes, fila de revisão e entrega avulsa

**Status:** PENDENTE
**Fase:** F2
**Depende de:** T002 (CONCLUIDA)
**Referências no DVP:** UC01 (fluxo principal, A1, A2, A5), HU01, HU02, HU03, 1.4.4 (máquina de estados), 1.5.4 (ENTREGA)
**Skills indicadas:** frontend-api-integration-patterns, tanstack-query-expert, react-ui-patterns, ui-states, zod-validation-expert, frontend-data-contracts, vitest-skill

## Objetivo
Entregar, dentro da tela `/despacho` (sem o mapa, que é a F3), a lista de entregas pendentes de despacho, a lista de revisão com o motivo legível e o formulário de entrega avulsa, tudo com dados reais da API quando existirem e MSW enquanto não.

## Escopo
- [ ] **Lista de entregas `AGUARDANDO_DESPACHO`** (sem revisão pendente) com os campos do `AGENT.md` 8.2: cliente, bairro, distância, repasse (ou "—" quando `valorRepasse` é `null`, Constituição 5.1), forma de pagamento, pago online/troco, tempo de espera desde `prontoParaDespachoEm`.
- [ ] **Lista de revisão** (`pendenteRevisao = true`) com o motivo em português: `SEM_COORDENADA`, `SEM_DISTANCIA`, `CONTESTACAO_ENTREGADOR`. Entrega em revisão **não** aparece como pendente de despacho (HU01).
- [ ] Ação **"Marcar pronto"** (grava `prontoParaDespachoEm`), só nas entregas em que a máquina de estados permitir (`acoesPermitidas` de `shared/dominio/transicoes.ts`).
- [ ] Ação **"Cancelar"** com motivo obrigatório e confirmação, só quando permitido.
- [ ] **Entrega avulsa:** formulário de `CriarEntregaAvulsaRequest` com validação Zod, erros de campo vindos de `ApiErrorResponse.campos[]`, estados de envio e bloqueio de duplo clique (UC01 A2).
- [ ] Para `SEM_COORDENADA`: campo de latitude/longitude para ajustar (sem mapa; o arrastar do pino é da F3). Resultado só atualiza após resposta do servidor.
- [ ] Hooks de dados em `features/despacho/api/` com TanStack Query: listar por status, listar revisão, criar avulsa, marcar pronto, cancelar, ajustar coordenada. Invalidar o cache após cada escrita. Polling de 15 s como fallback (o tempo real é F3).
- [ ] Estados carregando, vazio, erro e sucesso em todas as listas e formulários (Constituição 7.3). Acessibilidade básica: rótulos, teclado, status não só por cor.
- [ ] Handlers MSW para todos os endpoints acima, com casos de erro (400 com `campos[]`, 404, 409/transição inválida).
- [ ] Testes: renderização das listas por estado, "—" para repasse nulo, ações só quando permitidas, formulário avulso (válido/inválido/erro do servidor), revisão fora da lista de pendentes.

## Fora do escopo
- Mapa Leaflet, seleção múltipla, despacho, devolver lote, WebSocket (F3).
- Ajuste de repasse (`/ajustes`), acerto, recibo e caixa (F5).
- Alerta de integração degradada (depende da integração; F3/F6).
- Tela de login (F7).

## Regras de negócio envolvidas
- Constituição 5.1 (sem cálculo de dinheiro no cliente), 5.4 (`pendenteRevisao` só três motivos; revisão fora do despacho), 5.5 (ações só as permitidas, sem mudar status localmente sem confirmação do servidor), 7.2, 7.3, 9.2 (`PROVISÓRIO`).

## Critérios de aceite
- Dado entregas mistas no MSW, quando abro `/despacho`, então as pendentes e as de revisão aparecem em listas separadas e nenhuma entrega em revisão aparece como pendente.
- Dado `valorRepasse = null`, então a interface mostra "—", nunca "R$ 0,00".
- Dado um erro 400 com `campos[]`, então cada erro aparece no campo correspondente.
- Dado uma entrega que não pode ser cancelada pela máquina de estados, então a ação não é oferecida.
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
Os endpoints reais da T005 do backend (entregas) ainda não existem no momento desta tarefa. Use os caminhos de `endpoints.ts` (PROVISÓRIO) com MSW. Quando o backend publicar a sugestão com os caminhos reais (ver `ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/`), alinhe `endpoints.ts` e remova a marca PROVISÓRIO dos que forem confirmados. Divergências vão para `../sugestoes-backend/` sem bloquear.

## Ao terminar
Escreva `../relatorios/T003-entregas-pendentes-revisao-e-avulsa.md`, faça o merge para `develop` e pare. Sem `git push`. Siga D006: não pare esperando aval do Eduardo; use o padrão restritivo, marque PROVISÓRIO e liste em "Dúvidas / bloqueios".
