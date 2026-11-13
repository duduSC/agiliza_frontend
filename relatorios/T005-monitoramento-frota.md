# Relatorio — T005 Monitoramento da frota em tempo real

**Status final:** CONCLUIDA
**Data:** 2026-11-13

## O que foi feito

- **Mapa Leaflet** em `/monitoramento` exibindo cada entregador ONLINE ou EM_ROTA na `ultimaPosicao`, identificado pelo nome. Indicador visual de disponibilidade (icones diferentes por status) com legenda textual (cor nao e o unico indicador -- Constituicao 7.6).
- **Alerta de posicao desatualizada** (UC04 A1): entregador sem transmitir ha mais de 3 minutos exibe icone de alerta e texto "Desatualizada" na lista, com o horario da ultima posicao.
- **Somente consulta**: nenhuma acao altera estado nesta tela.
- **Tempo real via STOMP**: hook `useTempoRealFrota` reutiliza o cliente STOMP de `shared/realtime/` (T004), inscrevendo-se no topico `/topic/estabelecimento/{id}/frota`. Ao receber evento, invalida o cache de motoboys do monitoramento. Indicador "tempo real offline" reutilizado do despacho.
- **Hook de dados** em `features/monitoramento/api/`: lista motoboys ONLINE e EM_ROTA via duas chamadas paralelas ao `GET /api/motoboys?statusDisponibilidade=...`. Polling 15s como fallback.
- **Popup** no marcador do entregador: nome, status, placa, hora da ultima posicao.
- **Lista textual** de entregadores ao lado do mapa com badge de status e alerta de desatualizacao.
- **Legenda do mapa** com tres itens (Online, Em rota, Posicao desatualizada), cada um com texto descritivo.
- **Estados** carregando, vazio ("Nenhum entregador online"), erro com "Tentar novamente" (Constituicao 7.3).
- **Handlers MSW** atualizados: `dadosMotoboys.ts` agora inclui entregadores com posicao (ONLINE com posicao, EM_ROTA com posicao recente, EM_ROTA com posicao desatualizada).
- **Endpoints** de lotes e motoboys atualizados em `endpoints.ts` com os caminhos confirmados pelo backend (S008): marcacao PROVISORIO removida, novos endpoints adicionados (`detalhe`, `editar`, `rota`).
- **Resposta a S008**: status mudado para ACEITA, resposta preenchida.
- **17 testes** cobrindo: mapa exibe entregadores corretos, OFFLINE nao aparece, BLOQUEADO nao aparece, alerta de posicao desatualizada, funcao `posicaoDesatualizada` (5 testes unitarios incluindo limites), estado vazio, estado erro, legenda com textos, somente consulta (sem botoes de escrita), titulo e descricao da pagina.
- **Tipo exportado** `EstadoConexao` em `shared/realtime/index.ts` para reutilizacao.

## O que NAO foi feito (e por que)

- Nada ficou pendente dentro do escopo da tarefa.

## Arquivos criados/alterados

- `src/features/monitoramento/api/hooks.ts` (novo)
- `src/features/monitoramento/api/motoboysMonitoramentoApi.ts` (novo)
- `src/features/monitoramento/api/useTempoRealFrota.ts` (novo)
- `src/features/monitoramento/componentes/MapaFrota.tsx` (novo)
- `src/features/monitoramento/componentes/LegendaFrota.tsx` (novo)
- `src/features/monitoramento/componentes/ListaEntregadores.tsx` (novo)
- `src/features/monitoramento/util.ts` (novo)
- `src/features/monitoramento/monitoramento.test.tsx` (novo)
- `src/features/monitoramento/paginas/MonitoramentoPagina.tsx` (reescrito)
- `src/features/monitoramento/index.ts` (mantido)
- `src/shared/api/endpoints.ts` (alterado -- lotes e motoboys confirmados S008)
- `src/shared/realtime/index.ts` (alterado -- export do tipo EstadoConexao)
- `src/test/msw/dadosMotoboys.ts` (alterado -- entregadores com posicao)
- `tarefas/T005-monitoramento-frota.md` (status EM_ANDAMENTO -> CONCLUIDA)

## Verificacao

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Passa sem erros |
| `npm run lint` | Passa sem erros ou warnings |
| `npm run test` | 212 testes, 212 passaram (16 arquivos) |

## Decisoes tomadas (dentro do escopo)

- A API de motoboys aceita um unico `statusDisponibilidade` por chamada (S008). Para listar ONLINE e EM_ROTA, fiz duas chamadas paralelas via `Promise.all`. Alternativa seria um unico GET sem filtro e filtrar no cliente, mas isso traria OFFLINE e BLOQUEADO desnecessariamente.
- O hook `useAgoraReativo` atualiza o "agora" a cada 30s para que o alerta de 3 min seja reativo sem excesso de re-renders.
- Reutilizei o `IndicadorTempoReal` do modulo despacho por importacao direta (o componente ja importa de `@/shared/realtime` -- e generico). Se no futuro isso violar a regra de "nao importar internos de outro modulo", pode ser movido para `shared/ui/`.
- Testes usam `vi.useFakeTimers` com `vi.setSystemTime` fixado em `2026-11-13T14:01:00` para que os dados de mock (posicao recente em 14:00, desatualizada em 13:50) produzam resultados deterministicos.

## Sugestoes/pendencias registradas para o backend

- Nenhuma nova. A S008 foi respondida como ACEITA.

## Proposta de mudanca no DVP (Constituicao, Artigo 2.4)

- Nenhuma.

## Duvidas / bloqueios

- Nenhum.

## Sugestoes (nao implementadas, fora do que o backend decide)

- O `IndicadorTempoReal` e importado diretamente de `features/despacho/componentes/`. Se a regra de fronteira entre modulos for aplicada com rigor (um modulo nao importa internos de outro), esse componente deveria ser movido para `shared/ui/` em uma tarefa futura.
- O topico `/topic/estabelecimento/{id}/integracao` existe na infra STOMP mas nao e inscrito no monitoramento (so no despacho). Se for necessario alertar degradacao de integracao no monitoramento, basta adicionar uma inscricao no `useTempoRealFrota`.
