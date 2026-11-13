# Relatorio T006 — Acerto financeiro, recibo e caixa (F5 simplificado)

**Status:** PARCIAL
**Branch:** `feature/T006-acerto-recibo-caixa-simplificado`
**Data:** 2026-11-13

## O que foi feito

1. **Leitura completa do contexto:** Constitution.md, AGENT.md, S009 (endpoints confirmados), S006 (login/JWT confirmado), DVP e DTOs do backend.

2. **Branch criada:** `feature/T006-acerto-recibo-caixa-simplificado` a partir de `develop`.

3. **`endpoints.ts` atualizado** com os caminhos confirmados pelo backend (S009):
   - Acerto: `GET /api/acertos` (confirmado)
   - Ajustes de repasse: `POST/GET /api/entregas/{id}/ajustes` (confirmado)
   - Recibos: `GET/POST /api/recibos`, `GET /api/recibos/{id}`, `POST .../pagar`, `POST .../cancelar` (confirmados)
   - Caixa: `GET /api/caixas/atual`, `GET /api/caixas`, `POST /api/caixas`, `POST .../fechar`, `POST .../reabrir` (confirmados)
   - Todos os marcadores `PROVISORIO` removidos e substituidos por `Confirmado (S009)`.

4. **Schemas Zod criados** em `src/shared/api/schemas/acerto.ts`:
   - `linhaExtratoResponseSchema` / `LinhaExtratoResponse`
   - `extratoAcertoResponseSchema` / `ExtratoAcertoResponse`
   - `entregaAjusteValorResponseSchema` / `EntregaAjusteValorResponse`
   - `listaAjustesResponseSchema`
   - Exportados via `schemas/index.ts`.

## O que falta

- [ ] Criar `features/acerto/api/` com funcoes de rede e hooks TanStack Query
- [ ] Criar `features/caixa/api/` com funcoes de rede e hooks TanStack Query
- [ ] Implementar `AcertoPagina` (filtro, tabela extrato, totais, ajuste, gerar recibo, listar recibos, marcar pago)
- [ ] Implementar `CaixaPagina` (caixa do dia, abrir, fechar, historico, indicador global de caixa fechado)
- [ ] Handlers MSW para acerto, recibos e caixa
- [ ] Testes (extrato exibe totais do backend, ajuste bloqueado com recibo, gerar recibo mostra preview, caixa fechado bloqueia acoes, marcar pago)
- [ ] Atualizar fabricas.ts com fabricas de acerto/recibo
- [ ] Responder S009 (campos Status/Resposta)
- [ ] `typecheck`, `lint`, `test` devem passar
- [ ] Merge para develop (so ao concluir)

## Sugestoes/pendencias registradas

Nenhuma ate o momento. A resposta ao S009 ainda nao foi escrita.

## Proposta de mudanca no DVP

Nenhuma.
