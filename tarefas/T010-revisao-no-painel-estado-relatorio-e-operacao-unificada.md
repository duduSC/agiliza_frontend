# T010 — Revisão no painel, estado entre abas, relatório do dia e tela de operação unificada

**Status:** EM_ANDAMENTO
**Fase:** pós-apresentação (ajustes do teste de 23/11)
**Depende de:** T009 (CONCLUIDA). Do backend: `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/tarefas/T015-recibos-do-entregador-relatorio-moto-e-enderecos.md`, só no item 3, e não bloqueia: use MSW no contrato da D013.
**Referências no DVP:** UC01, UC04, UC08 A1, HU14, 1.5.5 passo 8, R04. Decisão D013 (`../../decisoes/D013-ajustes-pos-teste-23-11.md`)
**Skills indicadas:** ui-states, react-ui-patterns, tanstack-query-expert, zustand-store-ts, frontend-data-contracts, vitest-skill
**Prazo:** cerca de 2 horas. Faça na ordem: os itens 1 e 2 são os mais urgentes.

## Escopo (nesta ordem)
1. [ ] **Ação na entrega em revisão** (lista de revisão do Despacho; endpoints já existem):
   - **Contestação do entregador** (`CONTESTACAO_ENTREGADOR`): ação **"Analisar contestação"**, que chama `POST /api/entregas/{id}/revisao/resolver`.
     - Duas saídas: **manter o valor** ou **ajustar para um valor novo**. Motivo obrigatório nas duas.
     - Mostra o valor atual e as regras de recusa: caixa fechado, entrega em recibo e `AJUSTE_VALOR_NAO_PERMITIDO`, com mensagem clara.
     - Ao resolver, a entrega sai da revisão e volta a contar no Acerto.
   - **`SEM_DISTANCIA` e `SEM_COORDENADA`:** ação **"Reposicionar pino"** (`PATCH /api/entregas/{id}/coordenada`). O backend recalcula e tira da revisão. Hoje `SEM_DISTANCIA` só oferece cancelar.
   - Testes de cada caminho, inclusive as recusas.
2. [ ] **O estado não se perde ao trocar de aba:**
   - o filtro do Acerto (entregador e período) e o resultado;
   - os filtros e a seleção que façam sentido nas outras telas.
   - Use um store (Zustand) ou a URL (query string). **Nada de dado sensível em storage.** Teste ir ao Caixa e voltar ao Acerto com o filtro mantido.
3. [ ] **Relatório do dia** (`/relatorio`, perfis de operação, item novo no menu e atalho no Início):
   - consome `GET /api/relatorios/dia?data=` (contrato da D013);
   - cartões com total de entregas, entregues, falhas, canceladas, entregadores que trabalharam, valor de repasse, pago e a pagar;
   - tabela por entregador;
   - filtro por data;
   - **nenhuma soma no cliente** (Constituição 5.1), e `null` aparece como "—";
   - estados carregando, vazio, erro e sucesso;
   - MSW no formato do contrato até o backend entregar. Quando o backend da T015 estiver em `develop`, confira o DTO real e remova o PROVISÓRIO.
4. [ ] **Tela de operação unificada** (Despacho + Monitoramento):
   - Na tela de Despacho:
     - **pedidos e entregadores no mesmo mapa**, com ícones e legenda diferentes;
     - a posição dos entregadores atualizando em tempo real (tópico `/frota`, com reserva de polling);
     - **filtros:** "Aguardando despacho", "Saiu para entrega" (DESPACHADA e EM_ROTA) e "Todos";
     - na lista, ao lado, o entregador de cada lote em rota.
   - Mantenha tudo o que o Despacho já faz (seleção, despachar, devolver, pronto, revisão, avulsa).
   - O Monitoramento continua existindo e pode passar a apontar para a mesma tela.
   - **O Eduardo vai mandar uma imagem de referência.** Comece pela estrutura. Quando a imagem chegar, o Orquestrador repassa e você ajusta o layout.

## Fora do escopo
- Telas de Loja e Restaurantes.
- Cancelar recibo e reabrir caixa.
- Qualquer mudança no backend.

## Critérios de aceite
- Uma entrega contestada pode ser resolvida pelo painel, mantendo ou ajustando o valor. Uma entrega `SEM_DISTANCIA` pode ter o pino reposicionado.
- Trocar de aba e voltar mantém o filtro do Acerto.
- O relatório mostra os totais vindos do servidor.
- O mapa do Despacho mostra pedidos e entregadores, com os filtros.
- `typecheck`, `lint`, `test` e `build` passam.

## Ambiente
- O backend do Eduardo está na 8080 (perfil h2). **Só leituras** contra ele.
- O Vite do Eduardo pode estar na 5173, com HMR desta pasta. Use o seu na 5174, só com MSW.
- RAM curta e outros dois agentes ao mesmo tempo:
  - Vitest com `--maxWorkers=2`, e durante o trabalho só os arquivos que você tocar;
  - a suíte inteira e o build, uma vez no fim;
  - sem `playwright install`. O E2E é opcional nesta tarefa.
- Não leia `.env`. Sem push e sem tocar em `main`. Comite a cada item.

## Ao terminar
Escreva `../relatorios/T010-revisao-no-painel-estado-relatorio-e-operacao-unificada.md`, faça o merge em `develop` e pare.

## Atualização (23/11/2026, Orquestrador, por decisão do Eduardo)
- **Sem o prazo de 2 horas:** faça com calma e bem feito, na mesma ordem dos itens.
- O trabalho começado (análise da contestação) está **sem commit** na branch `feature/T010-...`: continue a partir dele.
- O backend **só pode ser lido**; nada nele é editado por você (Constituição 3.2).

## Referência visual da operação unificada (enviada pelo Eduardo, 23/11/2026)
Imagem: `anexos/T010-referencia-operacao-unificada.jpg`, uma foto de tela de outro sistema que ele gostou.

O que aproveitar:
- **O mapa ocupa quase a tela toda.** O fundo é **claro e discreto**, quase sem cor, e destaca os nomes dos bairros e das avenidas principais. Os pinos ficam em evidência.
- **Loja:** pino verde com ícone de casa.
- **Entregador:** um círculo branco com ícone de moto, posicionado na última posição.
- **Pedidos:** círculos brancos de borda verde com um **número**. O mesmo número aparece na **lista lateral à direita**, de modo que o círculo 1 no mapa corresponde ao card 1 na lista.
- **Botão de reenquadrar** no canto inferior direito do mapa.
- **Coluna estreita à direita** com os cards dos pedidos.

Restrições:
- O mapa da foto é o Google Maps, mas a Constituição do front (6.6) proíbe chave do Google no front. **Continue com Leaflet.** Para chegar no visual claro, use um estilo de tiles claro com base OpenStreetMap, sem chave e com a atribuição exibida, por exemplo CARTO "light/positron", ou um filtro CSS que dessature o OSM. Registre a escolha no relatório.
- Cor nunca é o único indicador: o número e a legenda continuam valendo.
- Os filtros da D013 continuam: Aguardando despacho, Saiu para entrega e Todos.
