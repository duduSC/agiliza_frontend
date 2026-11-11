# Relatório — T002 Casca do app, guardas por perfil e sessão de desenvolvimento

**Status final:** CONCLUIDA
**Data:** 2026-11-11

## O que foi feito
- **Store de sessão** (`src/features/auth/sessaoStore.ts`, Zustand, só em memória): `usuario` (`UsuarioAutenticadoResponse`), `token` opcional, `estabelecimentoId`. `iniciarSessao` recusa `ENTREGADOR` com mensagem própria (UC07 E4) e devolve um resultado tipado. `encerrarSessao` zera a store e chama `queryClient.clear()` por meio de `registrarLimpezaDeCache`, que os `Providers` registram. A troca de usuário também limpa o cache (Constituição 6.2).
- **Schema** `usuarioAutenticadoResponseSchema` em `src/shared/api/schemas/usuario.ts`, conferido contra o record Java.
- **Sessão de desenvolvimento (PROVISÓRIO)**: `src/features/auth/dev/SeletorSessaoDev.tsx` e `usuariosDev.ts` (perfil + estabelecimento fictício, dados validados pelo mesmo schema). Ficam atrás de `SESSAO_DEV_HABILITADA` (`!PROD && (DEV || VITE_USE_MOCKS==='true')`) e são carregados com `lazy(import())`. A lógica de liberação está em `calcularSessaoDevHabilitada`, que é testável.
- **Tela "Sem sessão"** (`TelaSemSessao.tsx`): aparece em qualquer rota protegida sem sessão e depois de um 401. Não é tela de login e não tem campo de e-mail nem de senha.
- **Cliente HTTP ligado à sessão** (`src/app/ligarClienteHttp.ts`): o token vem da store; 401 chama `encerrarSessao` e a guarda mostra "Sem sessão"; 403 navega para `/acesso-negado`.
- **Router**: React Router 6 com roteador de componente (`BrowserRouter` em produção e `MemoryRouter` nos testes, com `useRoutes`). Rotas da seção 7 mais `/acesso-negado`. `/` e rotas desconhecidas redirecionam para a primeira tela do perfil.
- **Permissões** centralizadas em `src/shared/dominio/permissoes.ts` (`TELAS`, `podeAcessarTela`, `telasDoPerfil`, `primeiraTelaDoPerfil`, `podeReabrirCaixa`). Menu e guarda usam a mesma tabela, então não divergem. Regras: ADMIN_GERAL → `/restaurantes`; ADMIN_RESTAURANTE → `/loja/*` e as telas do operador (D004); OPERADOR → só as telas de operação; ENTREGADOR → nenhuma.
- **Guardas** (`ExigirSessao`, `ExigirPerfil`, `RedirecionarParaInicio`), documentadas como conveniência de interface (Constituição 6.3).
- **Layout** (`src/app/LayoutApp.tsx`): cabeçalho com nome e perfil, botão "Sair" e um selo "sessão dev" que só aparece em dev. Menu lateral no desktop; em telas estreitas e tablet vira uma faixa horizontal rolável.
- **Páginas-esqueleto** das 9 telas em `features/*/paginas/`, usando `PaginaEsqueleto` e os estados `carregando`/`vazio`/`erro`/`sucesso` (`src/shared/ui/estados.tsx`). O estado padrão é "vazio (em construção)". Em `/caixa`, "Reabrir caixa" aparece só para ADMIN_RESTAURANTE, desabilitado e sem ação, que fica para a F5.
- **Testes**: permissões por perfil, store (início, recusa do ENTREGADOR, recusa de loja sem estabelecimento, limpeza de cache no logout e na troca de usuário, nada gravado em storage), seletor de dev presente ou ausente conforme o ambiente, casca integrada (menu de cada perfil, bloqueios incluindo OPERADOR em `/loja/*`, redirecionamento inicial, "Reabrir caixa", "Sair" limpando store e cache) e cliente HTTP (token, 401, 403).

### Retomada desta execução
A execução anterior foi interrompida com o código pronto e não comitado. Nesta retomada: revisei o código, rodei typecheck, lint, test e build, removi o único aviso de lint (`react-refresh/only-export-components` em `src/test/sessao.tsx`, com um disable justificado porque é utilitário de teste), conferi o bundle, respondi as sugestões, comitei e fiz o merge.

## O que NÃO foi feito (e por quê)
- Tela de login, refresh de token e WebSocket: fora do escopo (F7).
- Conteúdo real das telas: F2 em diante.
- "Reabrir caixa" sem ação (só visibilidade por perfil); a ação é da F5.

## Arquivos criados/alterados
- `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/Providers.tsx`, `src/app/LayoutApp.tsx`, `src/app/rotas.tsx`, `src/app/ligarClienteHttp.ts`, `src/app/ligarClienteHttp.test.tsx`
- `src/features/auth/{index.ts, sessaoStore.ts, sessaoStore.test.ts, sessaoDevHabilitada.ts, sessaoDev.test.tsx}`, `src/features/auth/componentes/guardas.tsx`, `src/features/auth/paginas/{TelaSemSessao,AcessoNegadoPagina}.tsx`, `src/features/auth/dev/{SeletorSessaoDev.tsx,usuariosDev.ts}`
- `src/features/{acerto,caixa,despacho,loja,monitoramento,restaurantes}/index.ts` e `paginas/*Pagina.tsx` (os `.gitkeep` foram removidos)
- `src/shared/api/schemas/usuario.ts`, `src/shared/dominio/{index.ts,permissoes.ts,permissoes.test.ts}`, `src/shared/ui/{PaginaEsqueleto.tsx,estados.tsx,estados.test.tsx}`, `src/test/sessao.tsx`

## Verificação
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | OK (`tsc -b` sem erros) |
| `npm run lint` | OK (0 erros, 0 avisos) |
| `npm run test` | 11 arquivos, 93 testes, 93 passaram. Aparecem avisos `act(...)` do React em stderr nos testes de 401/403, porque a navegação e o `set` da store são disparados fora do React pelo cliente HTTP. Nenhum teste falha. |
| `npm run build` | OK. Gera um único chunk JS; nenhum chunk separado do seletor. |

**Como verifiquei que o seletor de dev não entra no build de produção:** rodei `npm run build` e fiz `grep` em `dist/assets/*.js`. Não aparece nenhuma ocorrência de "Iniciar sessão de desenvolvimento", "sessão dev", do UUID fictício `a1b2c3d4-0001` nem de `msw`. A string "Sem sessão" aparece, como esperado, porque essa tela existe em produção, só que sem o seletor. Também só foi gerado o chunk principal (o `import()` dinâmico foi eliminado, já que `SESSAO_DEV_HABILITADA` vira `false` em tempo de build).

## Decisões tomadas (dentro do escopo)
- **Roteador de componente em vez de data router** (`createBrowserRouter`): o data router do React Router 6 conflita com o `AbortSignal` do jsdom nos testes (`Request` com signal de outro realm). Como a T002 não usa loaders nem actions, `BrowserRouter`/`MemoryRouter` + `useRoutes` resolve sem perder nada. Se uma fase futura precisar de loaders, isso pode ser revisto.
- **PROVISÓRIO, padrão restritivo (Constituição 1.3 / D006):** um perfil de loja (OPERADOR ou ADMIN_RESTAURANTE) com `estabelecimentoId` nulo tem a sessão recusada. O DVP não trata esse caso; recusar é o mais restritivo e fácil de reverter.
- **401 vai para "Sem sessão"**, e não para uma tela de login, porque o login é da F7.
- A primeira tela do ADMIN_RESTAURANTE é `/loja/entregadores`, a primeira da ordem da seção 7.

## Sugestões/pendências registradas para o backend
- Nenhuma nova em `sugestoes-backend/`.
- Respondidas em `agente_backend/sugestoes-frontend/` (só os campos `Status` e `Resposta do agente front`):
  - `S003-dtos-de-rota-e-lote.md` → **RESOLVIDA**. O schema do lote já não tem `distanciaRotaKm`; a ordem de `entregaIds` fica anotada para a F3.
  - `S004-endpoints-provisorios-cobertura.md` → **ACEITA**. Os caminhos seguem `PROVISÓRIO`; os pontos mais incertos estão anotados para os mocks.
- **Deixadas em SEM-RESPOSTA, porque não cabem na T002:** `S001` (administrador aninhado no cadastro de restaurante, que é a tela 8.7 da F6) e `S005` (`provedor` como string, que pertence ao schema e à tela de integração da F6, ainda inexistentes). Devem ser respondidas nas tarefas que criarem esses schemas e telas.

## Proposta de mudança no DVP (Constituição, Artigo 2.4)
- Nenhuma.

## Dúvidas / bloqueios
- (PROVISÓRIO, D006) Perfil de loja sem `estabelecimentoId`: hoje a sessão é recusada. Falta confirmar se o backend pode emitir um usuário assim (provavelmente não). Ponto para `decisoes/PENDENTES.md`, sem urgência.
- A `AGENT.md` do front, seção 6.4, ainda cita `SugerirRotaRequest`/`SugestaoRotaResponse` como existentes (S003 aponta isso). A governança é do Orquestrador.

## Sugestões (não implementadas, fora do que o backend decide)
- Quando a F7 trocar o seletor pelo login real, reaproveitar `iniciarSessao` (já recebe `token` + `UsuarioAutenticadoResponse`) e substituir o conteúdo de `TelaSemSessao` pelo formulário de login.
