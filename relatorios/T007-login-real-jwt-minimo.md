# Relatorio -- T007 Login real e sessao JWT

**Status final:** CONCLUIDA
**Data:** 2026-11-14

## O que foi feito

### Tela /login
- Formulario com e-mail e senha, validacao Zod (email valido, senha nao vazia).
- `noValidate` no form para que a validacao Zod controle tudo (jsdom impede submissao com type="email" invalido se nao desligar a validacao nativa).
- Erro sempre generico para `CREDENCIAIS_INVALIDAS`: "E-mail ou senha invalidos." (Constituicao 6.7, UC07 E1).
- `ESTABELECIMENTO_INATIVO` -> "O acesso desta loja esta suspenso."
- `USUARIO_BLOQUEADO` -> "Usuario sem acesso."
- ENTREGADOR detectado via `iniciarSessao` retornando `PERFIL_SEM_ACESSO_BACKOFFICE` -> "Este acesso e exclusivo do painel administrativo. Use o aplicativo do entregador." (UC07 E4).
- Loading no botao ("Entrando...") e bloqueio de duplo clique durante a requisicao.
- Redireciona para `primeiraTelaDoPerfil()` apos login bem-sucedido.

### Sessao e JWT
- Token de acesso e refresh token em memoria (Zustand store `useSessaoStore`). Nunca em localStorage, cookie ou URL (Constituicao 6.1).
- `DadosInicioSessao` agora requer `token: string` e `refreshToken: string` (antes token era opcional para a sessao de dev).
- `atualizarTokens(token, refreshToken)` adicionado para o fluxo de refresh.
- `obterRefreshTokenDaSessao()` exportado para o interceptor de refresh.
- Schema Zod `loginResponseSchema` e `refreshResponseSchema` em `shared/api/schemas/auth.ts`.
- API em `features/auth/api/authApi.ts`: `fazerLogin()` e `renovarToken()`, ambos com `tratarAutenticacaoGlobal: false`.

### Refresh automatico
- `client.ts` agora aceita `tentarRefresh: () => Promise<string | null>` na configuracao.
- Em 401 (com `tratarAutenticacaoGlobal: true`), tenta refresh antes de encerrar a sessao. Se refresh retorna novo token, faz retry da requisicao original.
- `ligarClienteHttp.ts` implementa o refresh com mutex (uma so tentativa por vez via promessa compartilhada).
- Se refresh falhar, `aoNaoAutenticado` encerra a sessao e redireciona para `/login`.

### Logout
- `encerrarSessao()` limpa usuario, token, refreshToken, estabelecimentoId.
- `queryClient.clear()` via `registrarLimpezaDeCache` (Constituicao 6.2).
- Redireciona para `/login`.

### Guardas de rota
- `ExigirSessao` agora redireciona para `/login` com `<Navigate>` (antes mostrava TelaSemSessao).
- `CAMINHO_LOGIN = '/login'` exportado pelas guardas.
- `/login` no router fora do `ExigirSessao` wrapper.

### Remocao da sessao de desenvolvimento
- Removidos: `SeletorSessaoDev.tsx`, `usuariosDev.ts`, `sessaoDevHabilitada.ts`, `TelaSemSessao.tsx`, `sessaoDev.test.tsx`, diretorio `dev/`.
- `LayoutApp.tsx`: removido badge "sessao dev" e import de `SESSAO_DEV_HABILITADA`.
- `auth/index.ts`: removidos exports de `SESSAO_DEV_HABILITADA`, `calcularSessaoDevHabilitada`, `TelaSemSessao`. Adicionados `LoginPagina`, `CAMINHO_LOGIN`, `obterRefreshTokenDaSessao`.

### Testes
- 10 testes novos em `login.test.tsx`: renderizacao, validacao de campos, login sucesso OPERADOR, login sucesso ADMIN_GERAL, credenciais invalidas, ESTABELECIMENTO_INATIVO, USUARIO_BLOQUEADO, ENTREGADOR recusado, estado "Entrando..." durante requisicao.
- `sessaoStore.test.ts` reescrito para o novo formato de sessao (refreshToken obrigatorio, teste de `atualizarTokens`).
- `App.test.tsx` reescrito: removidos testes do seletor de dev, adicionados testes de redirecionamento para /login sem sessao, logout vai para /login.
- `ligarClienteHttp.test.tsx` atualizado: 401 agora redireciona para /login (antes mostrava "Sem sessao").
- Todos os testes de features (despacho, acerto, caixa, monitoramento) atualizados para incluir `refreshToken` no estado de sessao.
- `test/sessao.tsx` reescrito: `usuarioDeTeste()` agora e independente (sem importar de `dev/usuariosDev`), `entrarComo()` passa `refreshToken`, `redefinirSessao()` limpa `refreshToken`.
- Handlers MSW de auth em `test/msw/handlersAuth.ts`: login com 4 perfis de teste, refresh com token valido.

## O que NAO foi feito (e por que)
- E2E com Playwright: cortado por D007 (fora do escopo da tarefa).
- Fluxo visual de refresh token: renovacao e automatica e invisivel (fora do escopo).
- "Esqueci minha senha": fora do MVP.
- Persistencia do token entre abas/reloads: aceitavel como PROVISORIO para a apresentacao.

## Arquivos criados/alterados

### Criados
- `src/shared/api/schemas/auth.ts` -- schemas Zod para login e refresh
- `src/features/auth/api/authApi.ts` -- chamadas de rede de autenticacao
- `src/features/auth/paginas/LoginPagina.tsx` -- tela de login
- `src/features/auth/login.test.tsx` -- 10 testes de login
- `src/test/msw/handlersAuth.ts` -- handlers MSW de auth

### Alterados
- `src/shared/api/schemas/index.ts` -- export de auth
- `src/shared/api/client.ts` -- suporte a tentarRefresh
- `src/app/ligarClienteHttp.ts` -- refresh automatico com mutex
- `src/app/rotas.tsx` -- rota /login fora do ExigirSessao
- `src/app/LayoutApp.tsx` -- removido badge dev, logout para /login
- `src/features/auth/componentes/guardas.tsx` -- ExigirSessao redireciona para /login
- `src/features/auth/sessaoStore.ts` -- refreshToken, atualizarTokens
- `src/features/auth/index.ts` -- exports atualizados
- `src/test/msw/handlers.ts` -- incluiu handlersAuth
- `src/test/sessao.tsx` -- independente dos arquivos dev
- `src/app/App.test.tsx` -- reescrito para login
- `src/app/ligarClienteHttp.test.tsx` -- 401 redireciona para /login
- `src/features/auth/sessaoStore.test.ts` -- refreshToken obrigatorio
- `src/features/acerto/acerto.test.tsx` -- refreshToken
- `src/features/caixa/caixa.test.tsx` -- refreshToken
- `src/features/despacho/despacho.test.tsx` -- refreshToken
- `src/features/monitoramento/monitoramento.test.tsx` -- refreshToken
- `tarefas/T007-login-real-jwt-minimo.md` -- status CONCLUIDA

### Removidos
- `src/features/auth/dev/SeletorSessaoDev.tsx`
- `src/features/auth/dev/usuariosDev.ts`
- `src/features/auth/paginas/TelaSemSessao.tsx`
- `src/features/auth/sessaoDevHabilitada.ts`
- `src/features/auth/sessaoDev.test.tsx`

## Verificacao
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Passa sem erros |
| `npm run lint` | Passa sem erros |
| `npm run test` | 247 testes, 247 passaram (18 arquivos) |

## Decisoes tomadas (dentro do escopo)
- `noValidate` no form de login: jsdom implementa constraint validation de HTML5, impedindo a submissao do form quando type="email" tem valor invalido. A validacao Zod cobre tudo, entao desligar a nativa e o correto.
- Mutex de refresh via promessa compartilhada: se multiplas requisicoes recebem 401 ao mesmo tempo, so uma renovacao e tentada. As demais reutilizam a mesma promessa.
- `DadosInicioSessao` agora exige token e refreshToken como strings obrigatorias: a sessao de dev que aceitava token opcional nao existe mais.
- O retry apos refresh so e tentado uma vez. Se o retry tambem retornar erro, o erro original e propagado e `aoNaoAutenticado` e chamado.
- Nomes de usuario nos testes mudaram de "(dev)" para "(teste)" ja que a sessao de dev foi removida.

## Sugestoes/pendencias registradas para o backend
- Nenhuma nova. O login e refresh ja estavam confirmados pela S006 (ACEITA).

## Proposta de mudanca no DVP (Constituicao, Artigo 2.4)
- Nenhuma.

## Duvidas / bloqueios
- Nenhum.

## Sugestoes (nao implementadas, fora do que o backend decide)
- Para a apresentacao, considerar adicionar persistencia do refresh token em sessionStorage (permitido pela Constituicao 6.1 com tarefa explicita) para que o reload da pagina nao force re-login. Isso e deliberadamente fora do escopo da T007 (PROVISORIO aceitavel para a apresentacao, conforme D007).
