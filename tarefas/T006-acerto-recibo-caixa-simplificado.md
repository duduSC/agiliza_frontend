# T006 — Acerto financeiro, recibo e caixa (F5 simplificado)

**Status:** PARCIAL
**Fase:** F5
**Depende de:** T005
**Referências no DVP:** UC03 (1.4.2.3, HU06, HU07), 1.4.4 (máquina de estados RECIBO e CAIXA), RNF05
**Skills indicadas:** react-ui-patterns, tanstack-query-expert, frontend-api-integration-patterns, ui-states, zod-validation-expert, frontend-data-contracts, vitest-skill

## Objetivo
Implementar as telas `/acerto` e `/caixa` com o fluxo simplificado: extrato do acerto por entregador, ajuste de repasse, geração e pagamento de recibo, abertura e fechamento de caixa. Sem reabrir caixa nem cancelar recibo na UI (D007).

## Antes de começar
Ler a sugestão do backend **S009** em `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S009-endpoints-acerto-recibo-caixa.md`:
- Contém os endpoints REAIS de acerto, recibos e caixa
- Atualizar `endpoints.ts` com os caminhos confirmados
- Responder S009 (campos `Status`/`Resposta` — Constituição 3.3)

## Escopo

### Tela `/acerto`
- [ ] **Filtro** por entregador (select com motoboys do estabelecimento) e período (data início/fim). Ao selecionar, buscar extrato via `GET /api/acertos?motoboyId=&inicio=&fim=`.
- [ ] **Tabela do extrato**: cada linha = uma entrega em estado final. Colunas: cliente, data, distância, faixa, valor repasse, situação (`A_ACERTAR`, `CONSOLIDADA`, `EM_REVISAO`). Entregas `EM_REVISAO` destacadas visualmente (cor **não** é único indicador — Constituição 7.6).
- [ ] **Totais do backend** (ExtratoAcertoResponse): `totalDevido`, `totalConsolidado`, `totalEmRevisao`, `possuiValorIndefinido`. **Nunca** somar no cliente (Constituição 5.1). Se `possuiValorIndefinido`, exibir aviso "Há entregas sem valor calculado".
- [ ] **Ajustar repasse** (`POST /api/entregas/{id}/ajustes`): disponível só se `reciboId === null`. Diálogo com valor novo + motivo (obrigatório). Mostrar histórico de ajustes (`GET /api/entregas/{id}/ajustes`). Se entrega tem recibo: mostrar "Esta entrega está no recibo — o recibo precisa ser cancelado antes" (sem ação de cancelar, por D007).
- [ ] **Gerar recibo** (`POST /api/recibos`): botão que abre diálogo com `motoboyId` + período. Antes de confirmar, mostrar preview usando o extrato (quais entregas entrarão e total). Sem atualização otimista (Constituição 5.8).
- [ ] **Listar recibos** (`GET /api/recibos?motoboyId=`): tabela com status, período, total, qtd entregas.
- [ ] **Marcar como pago** (`POST /api/recibos/{id}/pagar`): ação no recibo `GERADO`. Sem atualização otimista.
- [ ] Recibo `PAGO` ou `CANCELADO`: só visualização, sem ações.

### Tela `/caixa`
- [ ] **Caixa do dia** (`GET /api/caixas/atual`): mostra status, data, totais.
- [ ] **Abrir caixa** (`POST /api/caixas`): se não existe caixa para o dia. `AbrirCaixaRequest: { dataReferencia }`.
- [ ] **Fechar caixa** (`POST /api/caixas/{id}/fechar`): confirmação forte ("Esta ação torna o período imutável. Deseja continuar?"). Sem atualização otimista.
- [ ] **Histórico** (`GET /api/caixas?dataInicio=&dataFim=`): tabela com caixas anteriores.
- [ ] **Indicador global**: quando caixa está `FECHADO`, as ações de ajuste e geração de recibo ficam desabilitadas nas duas telas com mensagem "Caixa fechado — período imutável".

### Geral
- [ ] Hooks de dados em `features/acerto/api/` e `features/caixa/api/`.
- [ ] Estados carregando, vazio, erro em todas as interações (Constituição 7.3).
- [ ] Handlers MSW para todos os endpoints de acerto, recibos e caixa.
- [ ] Testes: extrato exibe totais do backend, ajuste bloqueado com recibo, gerar recibo mostra preview, caixa fechado bloqueia ações, marcar pago muda status.

## Fora do escopo
- **Reabrir caixa** (cortado por D007 — ação rara, factível via API).
- **Cancelar recibo** (cortado por D007 — ação rara, factível via API).
- Loja, restaurantes, integração (cortados por D007).
- Login real (T007).

## Regras de negócio envolvidas
- Constituição 5.1 (sem cálculo de dinheiro no cliente), 5.2 (ajuste só sem recibo), 5.3 (caixa fechado imutável), 5.8 (sem otimismo em escritas de dinheiro), 7.3, 7.6, 9.2 (`PROVISÓRIO`).

## Critérios de aceite
- Dado um entregador com entregas finalizadas no MSW, quando filtro o extrato, os totais vêm do backend (não somados no cliente).
- Dado entrega com `reciboId` preenchido, a ação de ajustar repasse não aparece.
- Dado caixa `FECHADO`, as ações de ajuste e gerar recibo estão desabilitadas.
- Dado recibo `GERADO`, a ação "Marcar como pago" está disponível.
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
Os endpoints de acerto, recibos e caixa têm implementação real (T007 backend, S009). Atualize `endpoints.ts` com os caminhos confirmados. Os handlers MSW continuam necessários para os testes.

## Ao terminar
Escreva `../relatorios/T006-acerto-recibo-caixa-simplificado.md`, faça o merge para `develop` e **siga para a T007** (login). Sem `git push`. Siga D006.
