# T002 — Casca do app, guardas por perfil e sessão de desenvolvimento

**Status:** CONCLUIDA
**Fase:** F1
**Depende de:** T001 (CONCLUIDA)
**Referências no DVP:** UC07 (perfis e E4), seção 1.4.2.7/1.4.3.7; telas do `AGENT.md` seções 7 e 8
**Skills indicadas:** frontend-architecture, react-patterns, react-state-management, ui-states, shadcn, tailwind-patterns, vitest-skill

## Objetivo
Entregar o esqueleto navegável do Backoffice (layout, menu por perfil, rotas protegidas e páginas vazias de cada tela) usando uma **sessão provisória de desenvolvimento**, sem tela de login. A tela de login é da F7 (decisão D003 do Eduardo).

## Escopo
- [ ] **Store de sessão** (Zustand, em memória, nunca `localStorage`): usuário (`UsuarioAutenticadoResponse`), token opcional, `estabelecimentoId`. Ações `iniciarSessao`, `encerrarSessao` (limpa o store e faz `queryClient.clear()`).
- [ ] **Provedor de sessão de desenvolvimento** (`PROVISÓRIO`): um seletor simples (perfil + estabelecimento fictício) que preenche a store. Só existe quando `import.meta.env.DEV` ou `VITE_USE_MOCKS=true`; **não pode entrar no build de produção** (conferir o bundle). Sem sessão, qualquer rota protegida mostra uma tela "Sem sessão" com o seletor, não uma tela de login.
- [ ] **Ligar o cliente HTTP à sessão**: `configurarCliente({ obterToken, aoNaoAutenticado, aoAcessoNegado })` (já existe da T001) → `aoNaoAutenticado` volta para "Sem sessão"; `aoAcessoNegado` vai para `/acesso-negado`.
- [ ] **Router** (react-router) com as rotas do `AGENT.md` seção 7: `/restaurantes`, `/loja/entregadores`, `/loja/faixas-preco`, `/loja/parametros`, `/loja/integracao`, `/despacho`, `/monitoramento`, `/acerto`, `/caixa`, `/acesso-negado`. Cada tela é uma página-esqueleto com título e os estados carregando/vazio/erro (ver `ui-states`), sem lógica de negócio ainda.
- [ ] **Guardas por perfil** conforme seção 7: `ENTREGADOR` não acessa o backoffice (mensagem própria, UC07 E4); `ADMIN_RESTAURANTE` acessa as telas do operador e as de `/loja/*` (decisão D004); `OPERADOR` não acessa `/loja/*`. Depois da sessão iniciada, redirecionar para a primeira tela do perfil.
- [ ] **Layout**: cabeçalho com nome do usuário/perfil, botão "Sair" (`encerrarSessao`), menu lateral que mostra só os itens permitidos ao perfil, responsivo para telas de desktop e tablet.
- [ ] Testes (Vitest + Testing Library): guarda por perfil (cada perfil vê o menu da seção 7 e é barrado nas rotas que não são suas (inclusive `OPERADOR` em `/loja/*`)), `encerrarSessao` limpa sessão e cache, seletor de dev ausente quando `DEV`/mocks estão desligados.

## Fora do escopo
- Tela de login, formulário de e-mail e senha, refresh de token, recuperação de senha (F7).
- Qualquer tela com conteúdo real (F2 em diante).
- WebSocket/STOMP.
- Qualquer mudança nas permissões de perfil além da seção 7 do `AGENT.md`.

## Regras de negócio envolvidas
- Constituição 4.3 (ENTREGADOR fora do backoffice), 6.1 (token em memória), 6.2 (limpar cache no logout), 6.3 (guardas são conveniência; 401 → sem sessão/login, 403 → acesso negado), 1.3 (padrão restritivo para o que não estiver definido).

## Critérios de aceite
- Dado o seletor de dev com perfil `OPERADOR`, quando abro `/despacho`, então vejo a página-esqueleto e o menu só com `/despacho`, `/monitoramento`, `/acerto`, `/caixa`.
- Dado `ADMIN_RESTAURANTE`, quando abro `/despacho` ou `/loja/parametros`, então vejo a página e o menu com as telas do operador e as da loja; "Reabrir caixa" só aparece para ele.
- Dado `ENTREGADOR`, então a sessão é recusada com a mensagem própria do UC07 E4.
- Dado "Sair", então a store e o cache do TanStack Query ficam vazios.
- `npm run build` não contém o código do seletor de sessão de dev (justificar no relatório como foi verificado).
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
Sem endpoints novos. A sessão de dev usa dados fictícios no formato de `UsuarioAutenticadoResponse` (schema da T001). Marcar tudo que simula sessão como `PROVISÓRIO` no código e no relatório. Quando a T004 do backend (JWT) estiver pronta, a F7 troca o provedor de dev pelo login real. Se faltar algo no contrato, registrar em `../sugestoes-backend/` sem bloquear.

## Ao terminar
Escreva `../relatorios/T002-casca-do-app-e-sessao-de-desenvolvimento.md`, faça o merge para `develop` (seção 3.5 do `AGENT.md`) e pare. Sem `git push`.
