# Relatório — T003 Entregas pendentes, fila de revisão e entrega avulsa

**Status final:** CONCLUIDA
**Data:** 2026-11-11

## O que foi feito

- **Lista de pendentes** (`ListaPendentes.tsx`): tabela com entregas `AGUARDANDO_DESPACHO` sem `pendenteRevisao`. Exibe nome do cliente, bairro, distancia, repasse (ou "---" quando `null`, Constituicao 5.1), forma de pagamento, cobranca (pago online / troco), e tempo de espera desde `prontoParaDespachoEm`. Acoes: "Marcar pronto" (so se a maquina de estados permite e ainda nao tem `prontoParaDespachoEm`) e "Cancelar" (so se a maquina de estados permite).
- **Lista de revisao** (`ListaRevisao.tsx`): cards para entregas com `pendenteRevisao = true`, com os tres motivos em portugues. `SEM_COORDENADA` mostra formulario de coordenada; `SEM_DISTANCIA` nao oferece acao (padrao restritivo); `CONTESTACAO_ENTREGADOR` mostra nota sobre a tela de acerto.
- **Entrega avulsa** (`FormularioEntregaAvulsa.tsx`): dialogo completo com todos os campos de `CriarEntregaAvulsaRequest`, validacao Zod no cliente (campos obrigatorios, formato CEP, formato monetario, coordenada parcial), erros de campo do servidor mapeados para o formulario, prevencao de duplo clique.
- **Cancelar entrega** (`DialogoCancelarEntrega.tsx`): dialogo de confirmacao com motivo obrigatorio (max 100 caracteres), validacao Zod.
- **Ajustar coordenada** (dentro de `ListaRevisao.tsx`): formulario inline com latitude e longitude, validacao Zod, toast de sucesso.
- **Regras de negocio** (`regras.ts`): `podeMarcarPronto`, `podeCancelar`, `podeAjustarCoordenada`, `minutosDeEspera`, `descreverEspera`, `descreverFormaPagamento`, `descreverCobranca`. Todas seguem a maquina de estados do DVP 1.4.4.
- **Formularios e schemas** (`formularios.ts`): schemas Zod para entrega avulsa, coordenada e cancelamento, funcoes de conversao form-to-request, mapeamento de campos do servidor.
- **API** (`entregasApi.ts`, `hooks.ts`): funcoes de chamada de rede e hooks TanStack Query com polling de 15s, invalidacao de cache nas mutacoes, chaves escopadas por `estabelecimentoId`. Filtro defensivo no cliente para `pendenteRevisao` (Constituicao 5.4).
- **MSW** (`handlersEntregas.ts`, `dadosEntregas.ts`): handlers para todos os endpoints de entrega, banco em memoria com 7 entradas de teste, funcao de redefinicao.
- **Pagina** (`DespachoPagina.tsx`): composicao de `ListaPendentes`, `ListaRevisao` e `BotaoNovaEntregaAvulsa` em layout responsivo.
- **Testes**: 73 testes (28 integracao, 22 regras, 23 formularios), todos passam.

## O que NAO foi feito (e por que)

- **Mapa**: fora do escopo desta tarefa (F3).
- **Selecao multipla e despacho**: fora do escopo (F3).
- **Devolucao de lote**: fora do escopo (F3).
- **WebSocket**: fora do escopo (F3).
- **Alerta de integracao degradada**: fora do escopo (F3).
- **Acao para SEM_DISTANCIA**: padrao restritivo (D006). O DVP nao especifica o que o operador faz com `SEM_DISTANCIA`; a tela apenas sinaliza o problema.

## Arquivos criados/alterados

**Novos:**
- `src/features/despacho/api/entregasApi.ts`
- `src/features/despacho/api/hooks.ts`
- `src/features/despacho/componentes/campos.tsx`
- `src/features/despacho/componentes/DialogoCancelarEntrega.tsx`
- `src/features/despacho/componentes/FormularioEntregaAvulsa.tsx`
- `src/features/despacho/componentes/ListaPendentes.tsx`
- `src/features/despacho/componentes/ListaRevisao.tsx`
- `src/features/despacho/formularios.ts`
- `src/features/despacho/regras.ts`
- `src/features/despacho/util.ts`
- `src/features/despacho/despacho.test.tsx`
- `src/features/despacho/formularios.test.ts`
- `src/features/despacho/regras.test.ts`
- `src/test/msw/dadosEntregas.ts`
- `src/test/msw/handlersEntregas.ts`

**Alterados:**
- `src/features/despacho/paginas/DespachoPagina.tsx` (composicao das listas e botao)
- `src/shared/api/endpoints.ts` (endpoints de entrega PROVISORIOS)
- `src/shared/api/schemas/entrega.ts` (campos adicionais no schema)
- `src/test/msw/handlers.ts` (spread `handlersEntregas`)
- `src/test/setup.ts` (`redefinirEntregas` no `afterEach`)
- `tarefas/T003-entregas-pendentes-revisao-e-avulsa.md` (status EM_ANDAMENTO -> CONCLUIDA)

## Verificacao

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Sem erros |
| `npm run lint` | Sem erros |
| `npm run test` | 181 testes, 180 passaram, 1 falha pre-existente (sessaoDev.test.tsx, da T002) |

A falha em `sessaoDev.test.tsx` (teste "com DEV/mocks, a tela 'Sem sessao' mostra o seletor") ja existia antes da T003 e nao foi alterada por esta tarefa.

## Decisoes tomadas (dentro do escopo)

- **PROVISORIO (D006)**: `podeMarcarPronto` nao permite remarcar (sobrescrever `prontoParaDespachoEm`) porque o DVP nao diz se isso e possivel; o padrao restritivo nao oferece a acao se `prontoParaDespachoEm` ja existe.
- **PROVISORIO (D006)**: `SEM_DISTANCIA` nao oferece nenhuma acao ao operador. Apenas sinaliza o problema. O DVP nao especifica o workflow para esse caso.
- **jsdom + MSW + AbortSignal**: o ambiente `jsdom` nao suporta corretamente `AbortSignal` em `fetch` quando o MSW intercepta. Os testes de integracao pre-populam o cache do TanStack Query com dados da semente em vez de depender do fetch assincrono. Isso nao afeta o codigo de producao — apenas a estrategia de teste.
- **Handlers MSW com path literal**: os handlers de mutacao usam paths literais (`*/api/entregas/:id/pronto`) em vez de `ENDPOINTS.entregas.marcarPronto(':id')` porque `encodeURIComponent(':id')` produz `%3Aid`, que o MSW nao reconhece como path parameter.
- **Botao "Cancelar" nas entregas em revisao**: `podeCancelar` e verificado para cada item de revisao. Entregas em revisao com status `AGUARDANDO_DESPACHO` oferecem cancelar; as que estao em estado final (como `ENTREGUE` com `CONTESTACAO_ENTREGADOR`) nao.

## Sugestoes/pendencias registradas para o backend

Nenhuma sugestao nova. Os endpoints ja estavam marcados como PROVISORIOS desde a T001/T002. Quando o backend criar os controllers, confirmar:
- `GET /api/entregas?status=AGUARDANDO_DESPACHO` e `?pendenteRevisao=true`
- `POST /api/entregas` (entrega avulsa)
- `POST /api/entregas/{id}/pronto`
- `POST /api/entregas/{id}/cancelar`
- `PATCH /api/entregas/{id}/coordenada`

## Proposta de mudanca no DVP (Constituicao, Artigo 2.4)

Nenhuma proposta.

## Duvidas / bloqueios

1. **`podeMarcarPronto` quando ja tem `prontoParaDespachoEm`**: o DVP nao diz se e possivel remarcar pronto (sobrescrever o timestamp). Adotei o padrao restritivo: nao oferece a acao. Se o Eduardo decidir que remarcar e permitido, basta remover o `!entrega.prontoParaDespachoEm` de `podeMarcarPronto` em `regras.ts`.
2. **Acao para `SEM_DISTANCIA`**: o DVP nao especifica o que o operador faz quando a distancia nao foi calculada. Sinalizei o problema na lista de revisao mas nao ofereci nenhuma acao. Se houver uma acao prevista (recalcular, ignorar, etc.), precisa de definicao.
3. **`sessaoDev.test.tsx` falhando**: teste pre-existente da T002. Nao e escopo da T003, mas vale investigar na proxima oportunidade.

## Sugestoes (nao implementadas, fora do que o backend decide)

- Considerar adicionar um `index.ts` em `src/features/despacho/` para exportar a API publica do modulo (paginas, componentes reutilizaveis). Nao feito agora porque a T003 nao pede e outros modulos ainda nao importam nada daqui.
