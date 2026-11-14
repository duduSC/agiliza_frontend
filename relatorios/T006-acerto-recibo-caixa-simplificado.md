# Relatorio -- T006 Acerto financeiro, recibo e caixa (F5 simplificado)

**Status final:** CONCLUIDA
**Data:** 2026-11-14

## O que foi feito

### Camada de rede (api/)
- `acertoApi.ts`: buscarExtrato, ajustarRepasse, listarAjustes
- `recibosApi.ts`: listarRecibos, gerarRecibo, marcarReciboPago (tipo GerarReciboRequest)
- `caixaApi.ts`: buscarCaixaAtual (retorna null em 404), listarCaixas, abrirCaixa, fecharCaixa

### Hooks TanStack Query (api/hooks.ts)
- `chavesAcerto` / `chavesRecibos` / `chavesCaixa`: fabricas de query keys escopadas por estabelecimentoId
- `useExtrato`, `useAjustes`, `useRecibos` (queries habilitadas condicionalmente)
- `useAjustarRepasse`, `useGerarRecibo`, `useMarcarReciboPago` (mutations, invalidam acerto+recibos)
- `useCaixaAtual`, `useHistoricoCaixas`, `useAbrirCaixa`, `useFecharCaixa` (invalidam caixa+acerto+recibos)
- Nenhuma escrita financeira usa atualizacao otimista (Constituicao 5.8)

### Componentes (componentes/)
- `FiltroAcerto`: formulario com select de entregador + data inicio/fim
- `TabelaExtrato`: tabela com entregas, destaque visual+textual para EM_REVISAO (badge + aria-label), botao "Ajustar" so para A_ACERTAR sem recibo, "Recibo vinculado" quando tem recibo
- `TotaisExtrato`: cards totalDevido/totalConsolidado/totalEmRevisao + alerta possuiValorIndefinido
- `DialogoAjusteRepasse`: dialogo com formulario valorNovo+motivo(obrigatorio) + historico de ajustes; bloqueado quando reciboId presente
- `DialogoGerarRecibo`: preview das entregas elegiveis (A_ACERTAR sem recibo), total do backend, aviso de valores indefinidos
- `TabelaRecibos`: tabela de recibos com "Marcar pago" (so GERADO + caixa aberto), "Caixa fechado" quando caixa fechado
- `HistoricoCaixas`: tabela historica com status/datas

### Paginas (paginas/)
- `AcertoPagina`: orquestra filtro, extrato, totais, recibos, dialogos; indicador de caixa fechado no header; desabilita acoes quando caixa fechado
- `CaixaPagina`: caixa do dia com status, abrir/fechar (confirmacao forte mencionando imutabilidade), reabrir (visivel mas desabilitado para ADMIN_RESTAURANTE, escopo D007), historico

### Testes (MSW + Vitest)
- `dadosAcerto.ts`: banco em memoria com extrato (3 linhas: A_ACERTAR, CONSOLIDADA, EM_REVISAO), recibos (GERADO, PAGO), caixa, ajustes, funcoes CRUD, redefinirAcerto()
- `handlersAcerto.ts`: handlers para todos os endpoints S009 com validacao de regras de negocio (ajuste bloqueado com recibo, caixa fechado, motivo obrigatorio, transicao de status)
- `acerto.test.tsx`: 18 testes cobrindo totais do backend (5.1), null exibe "--" (5.1), destaque EM_REVISAO (7.6), ajuste bloqueado com recibo (5.2), caixa fechado desabilita acoes (5.3), estados vazio/carregando (7.3), filtro unitario, integracao com dados
- `caixa.test.tsx`: 10 testes cobrindo historico, caixa aberto/fechado, confirmacao forte, periodo imutavel, abrir caixa, reabrir (desabilitado para ADMIN_RESTAURANTE, ausente para OPERADOR)

### Ajustes em arquivos existentes
- `endpoints.ts`: endpoints de acerto/recibos/caixa/ajuste confirmados (S009, sem PROVISORIO)
- `handlers.ts`: integra handlersAcerto
- `setup.ts`: integra redefinirAcerto no afterEach
- `fabricas.ts`: fabricas criarReciboResponse, criarLinhaExtrato, criarExtratoAcerto, criarAjusteResponse
- `acerto/index.ts` e `caixa/index.ts`: exportam paginas e chaves
- `App.test.tsx`: ajuste no teste "Sair" (cache agora tem mais queries por causa de AcertoPagina)

### Resposta a sugestao do backend
- `S009-endpoints-acerto-recibo-caixa.md`: Status alterado para ACEITA, resposta preenchida

## O que NAO foi feito (e por que)
- Cancelar recibo: handler MSW existe mas a UI nao tem botao/dialogo dedicado (fora do escopo simplificado da tarefa; pode ser adicionado em tarefa futura)
- Reabrir caixa: botao visivel e desabilitado para ADMIN_RESTAURANTE (D007 limita o escopo) e oculto para OPERADOR
- A contestacao de entregador (UC03, acao "analisar contestacao") nao foi implementada -- esta fora do MVP (trilha completa de contestacao, Constituicao 4.2)

## Arquivos criados/alterados

**Criados (16):**
- `src/features/acerto/api/acertoApi.ts`
- `src/features/acerto/api/hooks.ts`
- `src/features/acerto/api/recibosApi.ts`
- `src/features/acerto/componentes/FiltroAcerto.tsx`
- `src/features/acerto/componentes/TabelaExtrato.tsx`
- `src/features/acerto/componentes/TotaisExtrato.tsx`
- `src/features/acerto/componentes/DialogoAjusteRepasse.tsx`
- `src/features/acerto/componentes/DialogoGerarRecibo.tsx`
- `src/features/acerto/componentes/TabelaRecibos.tsx`
- `src/features/acerto/acerto.test.tsx`
- `src/features/caixa/api/caixaApi.ts`
- `src/features/caixa/api/hooks.ts`
- `src/features/caixa/componentes/HistoricoCaixas.tsx`
- `src/features/caixa/caixa.test.tsx`
- `src/test/msw/dadosAcerto.ts`
- `src/test/msw/handlersAcerto.ts`

**Alterados (8):**
- `src/features/acerto/paginas/AcertoPagina.tsx`
- `src/features/acerto/index.ts`
- `src/features/caixa/paginas/CaixaPagina.tsx`
- `src/features/caixa/index.ts`
- `src/test/fabricas.ts`
- `src/test/msw/handlers.ts`
- `src/test/setup.ts`
- `src/app/App.test.tsx`

## Verificacao

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Passa sem erros |
| `npm run lint` | Passa sem erros/warnings |
| `npm run test` | 240 testes, 240 passaram (18 arquivos) |

## Decisoes tomadas (dentro do escopo)
- Filtro por entregador e periodo usa inputs nativos (select + date) em vez de componentes shadcn complexos; pragmatico e funcional
- Integracao test da AcertoPagina usa dados pre-populados no QueryClient em vez de MSW fetch (jsdom tem limitacoes com inputs type="date" em formularios controlados React; o filtro unitario cobre a interacao separadamente)
- TabelaExtrato usa bg-yellow-50 + badge "destructive" + aria-label para EM_REVISAO (cor nao e unico indicador, Constituicao 7.6)
- CaixaPagina mostra "Reabrir caixa" desabilitado para ADMIN_RESTAURANTE (D007 limita o escopo) e oculto para OPERADOR
- Fechamento de caixa tem dialogo de confirmacao forte mencionando que o periodo ficara imutavel

## Sugestoes/pendencias registradas para o backend
- Respondida `S009-endpoints-acerto-recibo-caixa.md` do backend (Status: ACEITA)

## Proposta de mudanca no DVP (Constituicao, Artigo 2.4)
Nenhuma.

## Duvidas / bloqueios
Nenhum.

## Sugestoes (nao implementadas, fora do que o backend decide)
- Adicionar botao/dialogo de "Cancelar recibo" na tela de acerto (handler MSW ja preparado)
- Implementar acao real de "Reabrir caixa" quando D007 for expandido
