# Relatório — T009 Revisão completa do Backoffice

**Status final:** CONCLUIDA
**Data:** 2026-11-22
**Contrato seguido:** backend `develop` 8c02b47 (T014 concluída).
**Evidências:** `arquivo:linha` se refere ao código anterior à tarefa (`develop` b7e5d5a), dentro de `src/`.

## Resumo

| Severidade | Achados | Corrigidos | Abertos |
| --- | --- | --- | --- |
| CRÍTICO | 1 | 1 | 0 |
| ALTO | 14 | 14 | 0 |
| MÉDIO | 34 | 34 | 0 |
| BAIXO | 14 | 7 | 7 |

As lacunas de escopo (telas e ações cortadas pela D007) não entram na contagem. Estão em "O que ficou para depois".

Os cinco mais graves:
1. **C01:** no build de produção, a primeira consulta de cada tela saía sem `Authorization` e só funcionava por causa do refresh automático.
2. **A01:** o Acerto oferecia ajuste, recibo e pagamento sem caixa aberto, ou olhando o caixa do dia errado.
3. **A03:** duplo clique mandava dois POSTs ao gerar recibo, marcar pago e fechar o caixa.
4. **A14:** os mocks não passavam nos schemas, e os testes não viam isso porque pré-populavam o cache.
5. **A10:** o logout deixava o tempo real aberto com o token e a loja de quem saiu.

## 1. Inventário: tela, endpoint, schema e DTO

Os campos de 15 schemas foram comparados por script com os records Java da `develop`: 15 de 15 iguais. Nulabilidade conferida nas entidades, e os 12 enums e os 36 códigos de erro, um a um. Todas as listagens devolvem lista simples, sem página.

| Tela | Endpoint | Schema Zod | DTO real | Estados tratados | Testes |
| --- | --- | --- | --- | --- | --- |
| Login | `POST /api/auth/login` | `loginResponseSchema` | `LoginResponse`, `UsuarioAutenticadoResponse` | enviando, erro geral, erro por campo, sucesso | `login`, `telas`, `contrato`, `duploClique`, E2E |
| (sessão) | `POST /api/auth/refresh` | `refreshResponseSchema` | `LoginResponse` | recusa encerra; rede e 5xx mantêm | `ligarClienteHttp`, `rede` |
| Início, Despacho, Monitoramento | `GET /api/estabelecimento` | `estabelecimentoResponseSchema` | `EstabelecimentoResponse` | carregando, erro, sucesso | `inicio`, `telas`, `contrato` |
| Despacho | `GET /api/entregas?status=` e `?pendenteRevisao=true` | `listaEntregasResponseSchema` | `EntregaResponse`, `CoordenadaDto` | carregando, vazio, erro, desatualizado, sucesso | `despacho`, `despachoRevisao`, `telas`, `contrato`, E2E |
| Despacho | `POST /api/entregas` | `entregaResponseSchema` | `CriarEntregaAvulsaRequest` → `EntregaResponse` | enviando, erro por campo, sucesso | `despacho`, `formularios` |
| Despacho | `POST /api/entregas/{id}/pronto` e `/cancelar` | `entregaResponseSchema` | `CancelarEntregaRequest` → `EntregaResponse` | enviando, erro, sucesso | `despacho`, `duploClique` |
| Despacho | `PATCH /api/entregas/{id}/coordenada` | `entregaResponseSchema` | `AjustarCoordenadaRequest` → `EntregaResponse` | enviando, erro por campo, sucesso | `despacho`, `duploClique` |
| Despacho | `GET` e `POST /api/lotes`, `POST /api/lotes/{id}/devolver` | `loteEntregaResponseSchema` | `DespacharLoteRequest` → `LoteEntregaResponse` | carregando, vazio, erro, enviando, sucesso | `despacho`, `despachoRevisao`, `contrato`, E2E |
| Despacho | `GET /api/motoboys?statusDisponibilidade=ONLINE` | `motoboyResponseSchema` | `MotoboyResponse` | carregando, vazio (E1), erro | `despachoRevisao`, `contrato` |
| Despacho | `GET /api/falhas-integracao?status=PENDENTE` | `falhaIntegracaoResponseSchema` | `FalhaIntegracaoResponse` | sem falhas, alerta | `despacho`, `contrato` |
| Monitoramento | `GET /api/motoboys` | `motoboyResponseSchema` | `MotoboyResponse` | carregando, vazio, erro, desatualizado, sucesso | `monitoramento`, `monitoramentoRevisao`, `telas`, E2E |
| Acerto | `GET /api/motoboys` | `motoboyResponseSchema` | `MotoboyResponse` | carregando, vazio, erro | `telas`, `dinheiro` |
| Acerto | `GET /api/acertos` | `extratoAcertoResponseSchema` | `ExtratoAcertoResponse`, `LinhaExtratoResponse` | carregando, vazio, erro, desatualizado, sucesso | `acerto`, `dinheiro`, `contrato`, E2E |
| Acerto | `GET` e `POST /api/entregas/{id}/ajustes` | `entregaAjusteValorResponseSchema` | `AjustarRepasseRequest` → `EntregaAjusteValorResponse` | carregando, vazio, erro, enviando, por campo | `dinheiro`, `contrato` |
| Acerto | `GET` e `POST /api/recibos`, `POST /api/recibos/{id}/pagar` | `reciboResponseSchema` | `GerarReciboRequest` → `ReciboResponse` | carregando, vazio, erro, enviando, sucesso | `acerto`, `dinheiro`, `contrato`, E2E |
| Acerto, Caixa | `GET /api/caixas/atual` e `GET /api/caixas?dataInicio=&dataFim=` | `caixaResponseSchema` | `CaixaResponse` | carregando, vazio (404), erro, sucesso | `caixa`, `dinheiro`, `contrato`, E2E |
| Caixa | `POST /api/caixas` e `POST /api/caixas/{id}/fechar` | `caixaResponseSchema` | `AbrirCaixaRequest` → `CaixaResponse` | enviando, erro, sucesso | `dinheiro`, E2E |
| Despacho, Monitoramento | STOMP `/ws`: `entregas` e `frota` | só invalida o cache | `EventoEntrega`, `EventoFrota` | conectando, ativo, offline com polling | `realtime` |
| Loja (4 telas), Restaurantes | nenhum | não se aplica | não se aplica | esqueleto "em construção" (D007) | `telas` (erro de renderização), `App` |
| Acesso negado | nenhum | não se aplica | não se aplica | estático, com volta para `/inicio` | `telas`, E2E |

Confirmados em `endpoints.ts`, sem uso nas telas: faixas de preço, integrações, restaurantes, reabrir caixa, cancelar recibo, resolver revisão, detalhes e cadastro de entregador.

**O que não existe no backend:** o tópico `/topic/estabelecimento/{id}/integracao`, removido do front. Nenhum caminho de `endpoints.ts` ficou PROVISÓRIO. A regra do refresh continua fora do DVP (D002).

## 2. Achados

### CRÍTICO
| # | Evidência | Cenário | Correção |
| --- | --- | --- | --- |
| C01 | `app/App.tsx:15` | Build sem StrictMode: abrir ou trocar de tela. O efeito do App religava o cliente depois das consultas da página, que saíam sem token, tomavam 401 e dependiam de um refresh a cada navegação | `useLayoutEffect` único; teste prova zero requisição sem token e zero refresh |

### ALTO
| # | Evidência | Cenário | Correção |
| --- | --- | --- | --- |
| A01 | `features/acerto/paginas/AcertoPagina.tsx:48` | Dia sem caixa, ou período de ontem fechado com hoje aberto: oferecia ajuste, recibo e pagamento (5.2, 5.3) | Caixa do dia da entrega, do início do período e do próprio recibo; sem saber, nada é oferecido; aviso da S013 |
| A02 | `features/acerto/componentes/DialogoGerarRecibo.tsx:100` | Entrega sem valor: dizia que ela ficaria fora, mas o backend recusa o recibo inteiro | Bloqueia e explica |
| A03 | `features/acerto/componentes/DialogoGerarRecibo.tsx:47`, `features/acerto/paginas/AcertoPagina.tsx:75`, `features/caixa/paginas/CaixaPagina.tsx:67` | Duplo clique em gerar, pagar e fechar: 2 POSTs (medido no código antigo) | Trava síncrona `useEnvioUnico` em todas as escritas |
| A04 | `features/acerto/paginas/AcertoPagina.tsx:75` | Marcar pago recusado: nenhuma mensagem | Aviso de erro e de sucesso |
| A05 | `features/caixa/paginas/CaixaPagina.tsx:174` | Fechar recusado: o erro aparecia atrás do diálogo modal | Erro dentro do diálogo |
| A06 | `features/acerto/componentes/TotaisExtrato.tsx:17` | Só valores nulos em revisão ou a acertar: mostrava R$ 0,00 (5.1) | "—" ou "parcial", sem somar no cliente |
| A07 | `shared/api/client.ts:108` | Servidor travado (caso de 17/11): "Carregando" para sempre | 20 s; em escrita, manda conferir antes de repetir |
| A08 | `shared/api/client.ts:143` | Refresh certo e repetição com 422, ou refresh com 503: derrubava a sessão | Só 401 ou recusa do refresh encerram |
| A09 | `app/ligarClienteHttp.ts:31` | Sair ou trocar de usuário no meio: o token voltava e a escrita antiga podia repetir com o token novo | Resposta antiga não age na sessão nova |
| A10 | `shared/realtime/index.ts:70` | `desconectarStomp` nunca era chamado: o socket sobrevivia ao logout | Encerra no logout e na troca de usuário |
| A11 | `shared/realtime/index.ts:142`, `features/monitoramento/api/useTempoRealFrota.ts:55` | Trocar de tela e reconectar: inscrições de telas desmontadas voltavam | Registro por tela montada |
| A12 | `shared/realtime/index.ts:54` | Reconexão depois do refresh usava o token vencido | Token lido a cada tentativa |
| A13 | `app/LayoutApp.tsx:77` | Exceção em qualquer página fora do mapa do Despacho: app em branco | Limite por página, no app e nos dois mapas |
| A14 | `test/msw/dadosMotoboys.ts:17`, `test/msw/handlersLotes.ts:125`, `features/despacho/despacho.test.tsx:55` | IDs que não eram UUID quebravam 3 telas no modo mock; o `AbortSignal` do jsdom fazia os testes pularem rede e Zod | Mocks com campos, status e regras reais; adaptador; teste de contrato |

### MÉDIO (todos corrigidos)
| # | Evidência | Cenário | Correção |
| --- | --- | --- | --- |
| M01 | `features/monitoramento/util.ts:13` | Máquina fora de São Paulo: alerta de 3 min errado | Interpretador de `dataHora.ts` |
| M02 | `features/monitoramento/api/motoboysMonitoramentoApi.ts:20` | Bloqueado aparecia; quem trocava de status entre as 2 leituras duplicava | Uma leitura, filtrada |
| M03 | `features/despacho/componentes/MapaDespacho.tsx:109`, `features/monitoramento/paginas/MonitoramentoPagina.tsx:73` | Pinos fora da área visível, frota sem a loja | Enquadramento e botão "Enquadrar todos" |
| M04 | `features/monitoramento/componentes/MapaFrota.tsx:51` | Cores dos pinos diferentes da legenda | Matizes certos e nome no pino |
| M05 | `app/LayoutApp.tsx:76` | Tabelas largas empurravam a página em 1366 | `min-w-0`, tabela em largura total, mapas na altura da tela |
| M06 | `shared/realtime/index.ts:55` | Recuo fixo e nada relido ao reconectar | Exponencial até 30 s e ressincronização |
| M07 | `shared/realtime/index.ts:123` | Cada posição de GPS relia entregas e lotes | Invalidação por tópico |
| M08 | `app/queryClient.ts:12` | Resposta fora do schema repetida 2 vezes | Sem repetição |
| M09 | `shared/api/erros.ts:174` | Regra genérica, 409 e 503 sem explicação; Spring em inglês na tela | `message` só onde ajuda (S005, S013) |
| M10 | `shared/api/erros.ts:106` | Um item ruim em `campos[]` descartava o erro inteiro | Tolerância por item |
| M11 | `features/despacho/componentes/ListaPendentes.tsx:37` | Falha no polling apagava a lista | Mantém os dados e avisa |
| M12 | `features/despacho/selecaoStore.ts:20` | Entrega que saiu da lista continuava selecionada; limite menor não bloqueava | Poda e bloqueio |
| M13 | `features/despacho/paginas/DespachoPagina.tsx:35` | Loja fora: herdava o limite da sessão anterior | Padrão 5 |
| M14 | `features/despacho/componentes/BarraSelecao.tsx:46` | "Nenhum entregador online" só no `title` | Texto visível, com carregando e erro |
| M15 | `features/despacho/api/hooks.ts:125` | Escrita recusada deixava a lista velha | Recarrega no sucesso e no erro |
| M16 | `features/acerto/componentes/DialogoAjusteRepasse.tsx:63` | Sem limite de decimais e de motivo, sem vírgula, valor igual aceito | Validação Zod com os limites do DTO |
| M17 | `features/auth/paginas/LoginPagina.tsx:92` | `campos[]` ignorado (login, ajuste, cancelamento, coordenada) | Erro no campo |
| M18 | `features/acerto/paginas/AcertoPagina.tsx:51` | Entregadores sem carregando, vazio ou erro | Estados completos |
| M19 | `features/acerto/componentes/FiltroAcerto.tsx:29` | Período invertido ia ao servidor | Barrado no formulário |
| M20 | `features/acerto/componentes/DialogoAjusteRepasse.tsx:143` | Histórico com erro ficava em branco | Erro e nova tentativa |
| M21 | `features/acerto/paginas/AcertoPagina.tsx:144` | Prévia do recibo vinha do cache | Relida ao abrir |
| M22 | `features/acerto/paginas/AcertoPagina.tsx:111` | Filtrar de novo não relia nada | Relê |
| M23 | `features/acerto/paginas/AcertoPagina.tsx:65` | Último segundo do dia ficava fora do acerto | Fim em `23:59:59.999999` |
| M24 | `features/acerto/componentes/DialogoGerarRecibo.tsx:63` | Diálogo fechava no meio do envio | Bloqueado até responder |
| M25 | `features/caixa/paginas/CaixaPagina.tsx:197` | Fechamento só com texto | Digitar FECHAR; avisa dos recibos não pagos |
| M26 | `features/acerto/componentes/DialogoGerarRecibo.tsx:50` | Ações sem aviso de sucesso | Aviso com o valor devolvido pelo servidor |
| M27 | `features/despacho/componentes/DialogoCancelarEntrega.tsx:61` | Duplo envio em login, pronto, cancelar, coordenada e devolver | Mesma trava |
| M28 | `features/despacho/componentes/DialogoDespacho.tsx:153` | Foco invisível no teclado | Anel visível |
| M29 | `features/despacho/componentes/MapaDespacho.tsx:164` | Seleção no mapa só por cor e tamanho | Número da parada no pino |
| M30 | `test/setup.ts:78` | Aviso de um teste aprovava o seguinte (falso positivo) | Limpeza entre testes |
| M31 | `app/rotas.tsx:21` | Pacote acima de 500 kB | `React.lazy`; o maior ficou com 408 kB |
| M32 | `features/auth/sessaoStore.ts:12` | Textos sem acento em várias telas | pt-BR corrigido |
| M33 | `features/auth/paginas/AcessoNegadoPagina.tsx:8` | "Voltar para o início" não ia a `/inicio` (D011) | Corrigido |
| M34 | `features/despacho/componentes/ListaRevisao.tsx:109` | Mandava analisar contestação numa ação que não existe | Texto verdadeiro |

### BAIXO
| # | Onde | Achado | Situação |
| --- | --- | --- | --- |
| B01 | `shared/api`, `shared/realtime` | PROVISÓRIO obsoleto e `topicoIntegracao` inexistente | corrigido |
| B02 | Monitoramento, Acerto, Caixa, app | Importavam internos de outro módulo | corrigido |
| B03 | `shared/ui/dialog.tsx` | "Close" em inglês | corrigido |
| B04 | `shared/api/client.ts` | Mensagens do Bean Validation seguiam o idioma do navegador | corrigido (`Accept-Language: pt-BR`) |
| B05 | `TabelaExtrato` | Faixa com ponto decimal | corrigido |
| B06 | `MapaDespacho` | Pino recusado ficava onde foi solto | corrigido |
| B07 | `LimiteDeErro` | O log podia levar coordenada do cliente em produção | corrigido |
| B08 | `ligarClienteHttp` | 401 no meio da sessão não garante a volta à tela de origem | aberto |
| B09 | rotas lazy | Se o pedaço da rota não baixar, "Tentar novamente" exige recarregar, o que encerra a sessão | aberto |
| B10 | Monitoramento | Falha ao ler a loja só tira o pino dela, sem aviso | aberto |
| B11 | `AlertaIntegracao` | Falha ao ler as falhas de integração é silenciosa | aberto |
| B12 | `DialogoDespacho` | Mostra "0 selecionadas" por um instante enquanto recarrega após o sucesso | aberto |
| B13 | filtros de data | O formato do campo nativo segue o idioma do navegador: usar o navegador em pt-BR na apresentação | aberto |
| B14 | `AcertoPagina` | Sem tempo real: entrega finalizada aparece ao filtrar de novo ou ao abrir o recibo | aberto |

## 3. Teste antes da correção
- **Rodadas que falharam antes de corrigir:** contrato e rede (29 falhas), casca, tempo real, Despacho e Monitoramento (44), dinheiro (25), totais nulos (2), passada adversarial (3) e token ausente (1).
- **Provas contra o código antigo, feitas depois da correção:** refresh adverso (2), duplo envio de login e despacho (4), seleção obsoleta (1) e duplo POST do dinheiro (3 de 5: ajustar e abrir caixa já enviavam um só, e mesmo assim receberam a trava).
- **Sem teste que falhasse antes:** M04 e M28 (visual), M30 (era uma falha intermitente, reproduzida), M05 e M31 (conferidos depois por E2E e build), parte de M32, M34 (o teste existente mudou de texto), B02, B03, B05, B06 e B07.

## 4. Segunda passada adversarial
| Tentativa | Resultado |
| --- | --- |
| Resposta lenta e servidor travado | carregando em cada tela; erro em 20 s |
| Erro no meio do fluxo | recusas de despacho, pagamento, ajuste e fechamento visíveis, com listas relidas |
| Duplo clique | um envio nas escritas testadas |
| Trocar de tela no meio do envio | o resultado ainda é avisado |
| Sair ou trocar de usuário no meio | sem token ressuscitado e sem repetição com o token de outro |
| Campo `null` | "—"; revelou A06 |
| Perfil sem permissão | guardas, 403 e 4 cenários E2E |
| Refiltrar, limite herdado, idioma | revelaram M22, M13 e B04 |

## 5. Segurança
- Tokens só em memória; cache e STOMP limpos no logout.
- Nenhum `dangerouslySetInnerHTML`, `eval`, storage ou `any`; um único `console.error`, sem mensagem em produção.
- CPF não existe em formulário, schema ou tela.
- Nenhum dado dos mocks no pacote de produção (varredura de três marcadores).

## Verificação
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | OK, sem erros |
| `npm run lint` | OK, sem erros nem avisos |
| `npm run test` | 30 arquivos, 418 testes, todos passaram (176 s, 2 workers) |
| `npm run build` | OK, sem aviso de 500 kB (maior pedaço: 407,65 kB) |
| `npm run test:e2e` | 11 testes, todos passaram (49 s) |

O baseline era de 269 testes unitários e nenhum E2E. Os E2E rodam em 1366×768 por padrão, e os de layout e mapas também em 1920×1080.

## O que NÃO foi feito ou não pôde ser verificado
- **Backend real:** não testado. A conferência de contrato foi por leitura do código e MSW no formato real; o teste real fica com o Orquestrador.
- **STOMP contra um broker:** não testado; só com cliente falso que segue a API do `stompjs`.
- **Fundo do mapa:** os E2E bloqueiam a internet, então o OpenStreetMap não foi visto. Pinos, rótulos e enquadramento usam o Leaflet real.
- **Inspeção visual:** olhei 4 das 10 capturas (Despacho, Acerto e Caixa em 1366; Monitoramento em 1920), antes dos últimos retoques de cor, espaçamento e grade. Início e as demais combinações só têm o teste de rolagem.
- **Erro de rede em Loja, Restaurantes e Acesso negado:** não se aplica, porque não fazem requisição. Elas têm teste de erro de renderização.

## O que ficou para depois (decisão ou tarefa do Orquestrador)
1. **Entrega em revisão sem saída pelo painel:** `CONTESTACAO_ENTREGADOR` não tem ação de resolver (AGENT 8.4; o endpoint existe) e `SEM_DISTANCIA` só oferece cancelar (padrão restritivo da T003). A primeira nunca entra em recibo; a segunda nunca é despachada.
2. **Cancelar recibo e reabrir caixa:** cortados pela D007, embora os avisos da regra 5.2 e da S013 os citem como caminho.
3. **Caixa de dia anterior:** não pode ser fechado pela tela, que só age no caixa de hoje.
4. **Loja e Restaurantes:** esqueletos (D007). Cadastro de entregadores aguarda o Eduardo.
5. **Recarregar a página encerra a sessão:** pendência separada.
6. **`AGENT.md`, seções 6, 6.7, 6.8, 8.1 e 12:** ainda dizem que o backend não tem controllers e citam o tópico de integração.
7. Os 7 achados BAIXO abertos.

## Arquivos criados/alterados
- `src/shared/api/`: cliente, erros, endpoints e schema de falhas.
- `src/shared/realtime/`: cliente STOMP e indicador.
- `src/shared/ui/`: `useEnvioUnico`, `AvisoDesatualizado`, `mapa/` e ajustes.
- `src/app/`: rotas lazy, limites de erro e ligação do cliente.
- `src/features/`: auth, despacho, monitoramento, acerto (`regras.ts`) e caixa.
- `src/test/`: setup, STOMP e mapa falsos, MSW fiel, fábricas e contrato.
- `e2e/`, `playwright.config.ts`, `package.json`, `tsconfig.node.json`, `vite.config.ts`.

## Decisões tomadas (dentro do escopo)
- Nenhuma dependência nova.
- E2E sempre com servidor próprio na 5174, sem reaproveitar, para uma escrita de teste nunca chegar a um backend real.
- Vitest com no máximo 2 workers e prazo de 20 s por teste, pela memória da máquina.
- Período do recibo sem caixa no primeiro dia: ação escondida, como o backend exige.
- Em revisão, o ajuste continua não oferecido (padrão restritivo).

## Ocorrências de ambiente
- **`.env`:** não abri, não li e não editei. Dois contatos indiretos: um `ls -la` da raiz, no início da tarefa, listou o nome e o tamanho do arquivo; e uma varredura do pacote encontrou `localhost:8080`, valor que o Vite embute a partir do ambiente.
- **Código antigo por instantes:** para as provas da seção 3, alguns arquivos voltaram temporariamente à versão da `develop` na árvore de trabalho e foram restaurados e conferidos com `git diff`.
- **Disco:** nada foi apagado para abrir espaço. O build regravou `dist/`, e o Playwright usou só `test-results/e2e`.

## Sugestões/pendências registradas para o backend
- Nenhuma nova.
- `../sugestoes-backend/S001-login-500-com-senha-correta.md`: RESOLVIDA pelo backend, commitada aqui.
- Respondidas em `agente_backend/sugestoes-frontend/`, só `Status` e `Resposta`: S001, S005, S010, S011 e S012 (RESOLVIDA; as da F6 citam a D007) e S013 (ACEITA e aplicada).

## Proposta de mudança no DVP (Constituição, Artigo 2.4)
- Nenhuma.

## Dúvidas / bloqueios
- Nenhum bloqueio. O item 1 de "O que ficou para depois" precisa de decisão antes de um uso real.
