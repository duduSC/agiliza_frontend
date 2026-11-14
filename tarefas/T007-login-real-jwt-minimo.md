# T007 — Login real e sessão JWT (F7 mínimo)

**Status:** CONCLUIDA
**Fase:** F7
**Depende de:** T006
**Referências no DVP:** UC07 (1.4.2.7, HU13, E1, E4), RNF05
**Skills indicadas:** auth-implementation-patterns, frontend-security-coder, react-ui-patterns, tanstack-query-expert, vitest-skill

## Objetivo
Substituir a sessão provisória de desenvolvimento pela autenticação real via JWT. Tela de login, interceptor de token, logout, tratamento de erros de autenticação. Mínimo viável para a apresentação (D007).

## Antes de começar
Reler a sugestão do backend **S006** em `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S006-formato-login-jwt.md` (já ACEITA):
- `POST /api/auth/login` → `{ token, refreshToken, usuario: UsuarioAutenticadoResponse }`
- `POST /api/auth/refresh` → `{ token, refreshToken }`
- Acesso 3h, refresh 30d
- Códigos de erro: `CREDENCIAIS_INVALIDAS`, `ESTABELECIMENTO_INATIVO`, `USUARIO_BLOQUEADO`

## Escopo

### Tela `/login`
- [ ] Formulário com e-mail e senha. Validação Zod (email válido, senha não vazia).
- [ ] Erro **sempre genérico**: "E-mail ou senha inválidos" para `CREDENCIAIS_INVALIDAS` (UC07 E1 — Constituição 6.7).
- [ ] `ESTABELECIMENTO_INATIVO` → "O acesso desta loja está suspenso".
- [ ] `USUARIO_BLOQUEADO` → "Usuário sem acesso".
- [ ] `ENTREGADOR` tentando logar → "Este acesso é exclusivo do painel administrativo. Use o aplicativo do entregador." (UC07 E4).
- [ ] Loading no botão durante a requisição, bloqueio de duplo clique.

### Sessão e JWT
- [ ] Token de acesso em memória (Zustand store `useAuthStore`). **Nunca** em localStorage, cookie legível por JS ou URL (Constituição 6.1).
- [ ] `client.ts`: interceptor que adiciona `Authorization: Bearer <token>` em toda requisição.
- [ ] Refresh automático: quando a resposta for 401, tentar `POST /api/auth/refresh` com o refreshToken. Se falhar, redirecionar para `/login`.
- [ ] Refresh token guardado em memória junto com o access token (PROVISÓRIO — sem persistência entre abas/reloads, aceitável para a apresentação).

### Logout
- [ ] Limpar `useAuthStore` (token + refreshToken + usuário).
- [ ] `queryClient.clear()` — limpar todo o cache de dados (Constituição 6.2).
- [ ] Redirecionar para `/login`.

### Remoção da sessão de desenvolvimento
- [ ] Remover `SeletorSessaoDev` e o provider de sessão provisória (`sessaoDev`).
- [ ] Remover o guard que mostra o seletor em dev. As rotas agora dependem do JWT real.
- [ ] Manter MSW funcional para os testes (os handlers de `/api/auth/login` e `/api/auth/refresh` já devem existir ou serem criados).

### Guardas de rota
- [ ] Rota sem autenticação → redireciona para `/login`.
- [ ] Rota sem permissão de perfil → `/acesso-negado`.
- [ ] Após login, redirecionar para a primeira tela do perfil (AGENT.md seção 7).

### Geral
- [ ] Handlers MSW para login (sucesso e cada erro), refresh (sucesso e falha).
- [ ] Testes: login com sucesso redireciona, login com erro mostra mensagem genérica, ENTREGADOR recebe mensagem específica, logout limpa sessão, rota protegida redireciona sem token, refresh automático após 401.

## Fora do escopo
- E2E com Playwright (cortado por D007).
- Fluxo visual de refresh token (renovação é automática e invisível).
- "Esqueci minha senha" (fora do MVP).
- Persistência do token entre abas/reloads (aceitável como PROVISÓRIO).

## Regras de negócio envolvidas
- Constituição 6.1 (token em memória), 6.2 (limpar cache no logout), 6.7 (erro genérico no login), 7.3, 9.2 (`PROVISÓRIO`).

## Critérios de aceite
- Dado credenciais válidas no MSW, quando faço login, sou redirecionado para a tela do meu perfil e o token está em memória.
- Dado credenciais inválidas, a mensagem é "E-mail ou senha inválidos" (nunca diferencia e-mail de senha).
- Dado perfil ENTREGADOR, a mensagem é "Este acesso é exclusivo do painel administrativo".
- Dado logout, o cache TanStack Query está vazio e estou em `/login`.
- Dado token expirado (401), o refresh é tentado automaticamente antes de redirecionar para login.
- A sessão provisória de desenvolvimento (SeletorSessaoDev) não existe mais no código.
- `typecheck`, `lint`, `test` passam.

## Mocks / backend
O login e refresh têm implementação real (T004 backend, S006). Handlers MSW são necessários para os testes.

## Ao terminar
Escreva `../relatorios/T007-login-real-jwt-minimo.md`, faça o merge para `develop` e pare. Sem `git push`. Siga D006.
