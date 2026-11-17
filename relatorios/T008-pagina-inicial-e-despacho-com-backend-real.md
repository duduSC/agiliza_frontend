# Relatório — T008 Página inicial depois do login e despacho travando com o backend real

**Status final:** CONCLUIDA
**Data:** 2026-11-17

## 1. Causa do travamento do Despacho (diagnóstico)

### Como foi reproduzido
- O Eduardo já estava com um Vite rodando na porta 5173, e não mexi nele. Subi um Vite meu na porta 5179 com `VITE_USE_MOCKS=false VITE_API_URL=http://localhost:8080` e abri a tela num Chromium headless (Playwright). O Chromium rodou com `--disable-web-security`, porque o CORS do backend só aceita a origem 5173. Fiz login com `operador@agiliza.dev` e entrei em `/despacho`. Ao terminar, parei o meu Vite.
- **Requisições:** as cinco chamadas do Despacho responderam **200**, com o formato esperado:
  - `GET /api/entregas?status=AGUARDANDO_DESPACHO` devolveu uma lista simples com 15 entregas, todas com coordenada;
  - `GET /api/entregas?pendenteRevisao=true` devolveu `[]`;
  - `GET /api/lotes?status=DESPACHADO` devolveu `[]`;
  - `GET /api/motoboys?statusDisponibilidade=ONLINE` devolveu 1 entregador;
  - `GET /api/falhas-integracao?status=PENDENTE` devolveu `[]`.

  Todas passaram nos schemas Zod. O contrato **não** era o problema: lista simples, mesmos nomes de campo, datas com microssegundos já aceitas pelo `localDateTime`.
- **Erro no console**, logo depois de `/api/entregas` chegar, uma vez para cada pino:
  ```
  PAGEERROR Cannot read properties of undefined (reading 'createIcon')
  The above error occurred in the <ForwardRef(ContainerComponent)> component:
      at PinoEntrega (src/features/despacho/componentes/MapaDespacho.tsx)
  ```
  Não existia limite de erro (error boundary). Por isso o React desmontava a árvore inteira e a página ficava em branco. Era isso que aparecia como "travou / não carrega".

### Causa exata
Trecho em `MapaDespacho.tsx` (`PinoEntrega`):
```tsx
icon={estaSelecionada ? ICONE_SELECIONADO : undefined}
```
O react-leaflet repassa `icon: undefined` nas opções do `L.marker`. Com isso, o ícone padrão herdado do protótipo é substituído por `undefined`, e o Leaflet quebra em `options.icon.createIcon()`. O erro acontece com qualquer entrega que tenha coordenada, inclusive no modo com mocks no navegador. Os testes não pegavam o problema porque `test/setup.ts` substituía o `<Marker>` inteiro por uma `div`.

### Correção
- O pino agora recebe um ícone padrão explícito: `ICONE_PADRAO = new L.Icon.Default()`.
- O mock de `react-leaflet` em `test/setup.ts` passou a **reproduzir o erro real**: lança o mesmo `TypeError` quando `icon` está presente com valor `undefined`. Confirmei a regressão: voltando o código antigo, 35 testes do despacho falham com `createIcon`; com a correção, todos passam.
- Criei o `LimiteDeErro` (`shared/ui`) e coloquei o mapa dentro dele. Se o mapa voltar a quebrar, aparece "Não foi possível exibir o mapa. As entregas continuam na lista abaixo.", com "Tentar novamente", e as listas continuam na tela.

### Problemas encontrados no caminho (corrigidos porque afetam o critério "entregas no mapa")
- **Centro do mapa fixo em São Paulo.** A página passava `coordenadaLoja={null}`, e a loja real fica em Passo Fundo/RS, então todos os pinos ficavam fora da área visível. Agora o centro vem de `GET /api/estabelecimento` (`coordenada` da loja). Se a loja falhar, o mapa centraliza na primeira entrega com coordenada. A regra está em `features/despacho/mapa.ts` (`centroDoMapa`).
- **`maxPedidosPorLote` nunca vinha do backend.** A store ficava sempre em 5. Agora a página chama `definirLimite(loja.maxPedidosPorLote)` (Constituição 5.6). Enquanto a loja não chega, continua valendo o padrão 5.

### O que não era a causa (conferido)
- **WebSocket `/ws`:** no meu teste respondeu 403. Isso aconteceu só porque a origem era a porta 5179. Pelo `curl`, o handshake com `Origin: http://localhost:5173` responde **101**. Uma falha do STOMP não trava a tela: o indicador mostra "Tempo real offline" e o polling de 15 s assume.
- **Laço de render/refetch:** depois da correção, a thread principal responde normalmente e cada consulta é feita uma vez (em dev, duas por causa do StrictMode, com a primeira abortada).

## 2. O que foi feito
- Correções do Despacho descritas acima.
- **Página `/inicio`** (`features/inicio/paginas/InicioPagina.tsx`):
  - mostra nome, perfil e estabelecimento (`nomeFantasia` vindo de `GET /api/estabelecimento`, com estados de carregando e de erro com "Tentar novamente"). Para o `ADMIN_GERAL`, que não tem estabelecimento, nada disso aparece e a consulta nem é feita;
  - mostra um cartão de atalho, com título e descrição, para cada tela que o perfil acessa, via `telasDoPerfil` (a mesma configuração do menu e das guardas). Nenhum número ou métrica é mostrado.
- "Início" é o primeiro item do menu lateral, para todos os perfis do Backoffice.
- `/` e rotas desconhecidas levam a `/inicio` (`RedirecionarParaInicio`).
- **Destino depois do login:**
  - `ExigirSessao` guarda a rota de origem no estado do roteador (`state.de`), nunca em storage nem na URL;
  - `LoginPagina` usa `destinoDepoisDoLogin(perfil, de)`: volta para a rota guardada se ela for uma tela conhecida que o perfil acessa; caso contrário, vai para `/inicio`. URLs externas nunca são seguidas.
- Hook `useEstabelecimentoAtual` em `features/loja` (exportado pelo `index.ts`), usado pelo Despacho e pelo Início.
- MSW: novo handler de `GET /api/estabelecimento` no formato real, e amostra real capturada do backend em `test/msw/dadosBackendReal.ts`.

## O que NÃO foi feito (e por quê)
- **Não atualizei o `AGENT.md`, seção 7.** A tarefa diz que o Orquestrador faz isso.
- **Não usei o Vite do Eduardo (5173)**, para não mexer no processo dele. Por isso o tempo real (STOMP) não foi verificado no navegador; só o handshake, pelo `curl`.
- **Login no navegador não verificado até o fim.** Durante a tarefa, o `POST /api/auth/login` do backend passou a responder **500** com a senha correta (com a senha errada continua 401). Para terminar a verificação, o script substituiu só a resposta do login pela resposta real capturada antes (token ainda válido). Todas as outras chamadas foram ao backend real. Registrei em `S001`.
- **Entrega sem coordenada no navegador.** O backend real não tinha nenhuma entrega em revisão naquele momento. Esse caso foi coberto por teste, com uma entrega `SEM_COORDENADA` no formato real.
- **Ajuste automático do mapa para mostrar todos os pinos (fitBounds).** No zoom 13 centrado na loja, 12 das 15 entregas ficaram dentro da área visível; as demais aparecem ao arrastar ou diminuir o zoom. Fica como sugestão.

## Verificação no navegador (backend real)
- Depois do login (com a resposta de login gravada, ver acima), a URL foi `/inicio`, mostrando "Operador de Logística · Operador de logística · Pizzaria Demo" e os atalhos Despacho, Monitoramento, Acerto e Caixa.
- Ao clicar em Despacho, a tabela apareceu em cerca de 3,3 s nesta medição. Desse tempo, cerca de 2,3 s foram de latência do backend, que estava mais lento depois do problema no login. Numa medição anterior deu 5,1 s, com o backend ainda mais lento. Antes do problema no login, o backend respondia essas chamadas em menos de 50 ms.
- Na tela: 15 linhas na lista e 16 pinos (15 entregas e a loja). Nenhum `pageerror`, e a thread principal responde.

## Arquivos criados/alterados
- `src/features/despacho/componentes/MapaDespacho.tsx`: ícone padrão explícito; centro via `centroDoMapa`; `key` para remontar o mapa quando o centro muda.
- `src/features/despacho/mapa.ts` (novo): `centroDoMapa`.
- `src/features/despacho/paginas/DespachoPagina.tsx`: loja do token, `definirLimite`, mapa dentro do `LimiteDeErro`.
- `src/shared/ui/LimiteDeErro.tsx` e `LimiteDeErro.test.tsx` (novos).
- `src/features/loja/api/estabelecimentoApi.ts` (novo) e `src/features/loja/index.ts`.
- `src/features/inicio/index.ts`, `paginas/InicioPagina.tsx` e `inicio.test.tsx` (novos).
- `src/shared/dominio/permissoes.ts`: `CAMINHO_INICIO`, `TITULO_INICIO`, `descricao` em cada tela, `destinoDepoisDoLogin`.
- `src/features/auth/componentes/guardas.tsx`, `index.ts` e `paginas/LoginPagina.tsx`: destino guardado e `/inicio`.
- `src/app/rotas.tsx` e `src/app/LayoutApp.tsx`: rota `/inicio` e item "Início" no menu.
- `src/shared/api/endpoints.ts`: comentário em `estabelecimento.atual` (continua PROVISÓRIO; respondeu 200 no backend real).
- `src/test/setup.ts`: o mock do `Marker` reproduz o erro real do Leaflet; o mock do `leaflet` passou a ter `Icon.Default` construtível.
- `src/test/msw/handlersEstabelecimento.ts` e `dadosBackendReal.ts` (novos), `handlers.ts`.
- Testes atualizados: `App.test.tsx` (menu com "Início"; `/` e rota desconhecida levam a `/inicio`), `login.test.tsx` (vai para `/inicio`; testes do destino guardado), `permissoes.test.ts`, `despacho.test.tsx` (loja no cache; o limite do lote vem da loja).
- Teste novo: `src/features/despacho/despachoBackendReal.test.tsx` (formato real, entrega sem coordenada, centro do mapa, limite vindo da loja, falha da loja não derruba a tela).

## Verificação
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | OK (`tsc -b` sem erros) |
| `npm run lint` | OK (sem erros nem avisos) |
| `npm run test` | 21 arquivos, 269 testes, todos passaram |
| `npm run build` | OK (só o aviso já existente de chunk acima de 500 kB) |

Observação: numa rodada completa feita com o meu Vite e o lint rodando ao mesmo tempo, 4 testes da tela de login estouraram o timeout de 5 s por carga da máquina. Isolados passaram, e a rodada final, sem carga paralela, passou inteira.

## Decisões tomadas (dentro do escopo)
- **"Início" fora de `TELAS`.** Ele não é uma tela de trabalho, e sim o índice delas. Assim `telasDoPerfil` continua sendo a lista de atalhos, e o menu soma "Início" na frente.
- **Destino guardado só é seguido se o perfil acessar a tela.** É o padrão mais restritivo e evita redirecionamento aberto.
- **Corrigi o centro do mapa e o `maxPedidosPorLote`**, mesmo sem a tarefa citar esses pontos. Sem o centro, o critério "entregas no mapa" não se cumpre com o backend real. O limite vem da mesma resposta e é regra da Constituição (5.6).
- **Nos testes, as consultas que passam pela rede são feitas sem `AbortSignal` e entregues ao cache.** No jsdom, o `fetch` do Node recusa o `AbortSignal` do jsdom, e os testes existentes já contornavam isso pré-populando o cache.

## Sugestões/pendências registradas para o backend
- `../sugestoes-backend/S001-login-500-com-senha-correta.md`: o login do operador passou a responder 500 com a senha correta durante o teste.

## Proposta de mudança no DVP (Constituição, Artigo 2.4)
- Nenhuma.

## Dúvidas / bloqueios
- Nenhum bloqueio. O login com 500 depende do backend (S001). Quando o Eduardo reiniciar ou corrigir o backend, vale repetir o login real no navegador, na porta 5173.

## Sugestões (não implementadas, fora do que o backend decide)
- `fitBounds` no mapa do despacho para mostrar todos os pinos de uma vez.
- O redirecionamento por 401 no meio da sessão (`ligarClienteHttp`) também poderia guardar o destino; hoje leva a `/login` sem estado.
- Separar o bundle em partes (o Leaflet, por exemplo) para eliminar o aviso de chunk acima de 500 kB.
