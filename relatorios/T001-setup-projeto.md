# Relatório — T001 Setup do projeto e fundações compartilhadas

**Status final:** CONCLUIDA
**Data:** 2026-11-10

## O que foi feito
Retomada de uma execução interrompida por reinício do container. Já existiam e foram mantidos sem refazer: repositório git (`main` com o commit inicial "Governança inicial do agente React", `develop`, `feature/T001-setup-projeto`), scaffold Vite (`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `components.json`, `index.html`, `public/`), `node_modules` instalado (íntegro, `npm ls` sem erro), Tailwind 4, os 9 componentes shadcn em `src/shared/ui/` e `src/shared/dominio/enums.ts`. Esse estado foi comitado primeiro (`c5f6653`).

Completado nesta retomada:
- **Git:** todo o trabalho comitado em `feature/T001-setup-projeto`, merge `--no-ff` para `develop`, branch local apagada. `main` não foi tocada após o commit inicial.
- **TypeScript strict** com alias `@/` → `src/` (já existia; adicionados `noUncheckedIndexedAccess`/`noImplicitOverride` que já estavam no tsconfig). `vite-env.d.ts` tipa `VITE_API_URL` e `VITE_USE_MOCKS`.
- **Scripts:** `dev`, `build`, `typecheck` (`tsc -b`), `lint`, `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test --pass-with-no-tests`, placeholder), `format`, `format:check`.
- **ESLint + Prettier:** React Hooks, `eslint-config-prettier`, e regras que reforçam a Constituição: `no-explicit-any` e `ban-ts-comment` (7.1), `no-eval`/`no-new-func`/`no-implied-eval` e proibição de `dangerouslySetInnerHTML` (6.5), proibição de `localStorage` (6.1). `.prettierignore` protege os arquivos de governança de reformatação.
- **Estrutura de pastas (AGENT.md 5):** `src/app/` (Providers com TanStack Query + Toaster sonner, `queryClient` sem retry em 4xx nem em mutações, casca `App`), `src/features/{auth,despacho,monitoramento,acerto,caixa,loja,integracao,restaurantes}/` com `index.ts` vazio e `api/`, `componentes/`, `paginas/`, `src/shared/realtime/index.ts` vazio, `src/test/`.
- **`shared/dominio/transicoes.ts`:** mapa de transições da ENTREGA (DVP 1.4.4), ações por status (AGENT.md 6.2) com labels pt-BR, `acoesPermitidas`, `podeTransicionar`, `ehStatusFinal`.
- **`shared/api/client.ts`:** `requisitar()` sobre `fetch` — base `VITE_API_URL`, `Authorization: Bearer` a partir de um provedor de token em memória (`configurarCliente`), validação Zod obrigatória da resposta quando há corpo, 401 → `aoNaoAutenticado`, 403 → `aoAcessoNegado` (desligável com `tratarAutenticacaoGlobal: false` para a tela de login), `AbortSignal` repassado (abort não vira `ErroApi`), falha de rede e resposta fora do contrato viram `ErroApi` tipados. Não registra corpo em log.
- **`shared/api/erros.ts`:** `CODIGOS_ERRO` (todos os 35 do `CodigoErro.java`), mapa `codigo → mensagem pt-BR` completo, `parseErroApi` tolerante → `ErroApi` (`tipo`, `status`, `codigo`, `codigoBruto`, `mensagem`, `mensagemServidor`, `campos`, `path`). Código desconhecido cai na `message` do servidor; sem `message`, mensagem genérica pelo status.
- **`shared/api/endpoints.ts`:** todos os caminhos da seção 6.7, cada um `// PROVISÓRIO`.
- **`shared/api/schemas/`:** Zod de `CoordenadaDto`, `EntregaResponse`, `LoteEntregaResponse`, `MotoboyResponse`, `ReciboResponse`, `CaixaResponse`, `DistanciaPrecoResponse`, `EstabelecimentoResponse`, `UsuarioResponse`, **conferidos campo a campo contra os records Java em `dto/` em 10/11/2026**. Opcionais são `.nullable().optional()`; `LocalDateTime`/`LocalDate` validados por regex (rejeitam `Z`/offset); UUID via `z.uuid()`.
- **`shared/formatacao/`:** `formatarMoeda` (BRL; `null`/`undefined`/NaN → "—"), `paraValorMonetarioBackend` (2 casas), `formatarKm`, `formatarDataHora`/`formatarHora` (LocalDateTime como horário de São Paulo via `date-fns-tz`, independente do fuso da máquina), `formatarData` (LocalDate), `instanteDeLocalDateTime`, e as saídas `paraLocalDateTimeBackend`/`paraLocalDateBackend` (sem `Z` nem offset).
- **MSW:** handlers compartilhados em `src/test/msw/handlers.ts` (um handler de exemplo: `GET */api/caixas/atual`), `server.ts` (Vitest, `onUnhandledRequest: 'error'`) e `browser.ts` (dev). `public/mockServiceWorker.js` gerado por `msw init`. Em `main.tsx` o worker só sobe com `import.meta.env.DEV && VITE_USE_MOCKS === 'true'` — confirmado que o MSW não entra no bundle de produção.
- **Testes:** Vitest + Testing Library + jsdom + jest-dom; fábricas em `src/test/fabricas.ts`.
- `.env.example`, `README.md`, `.gitignore` mesclado (básico + Vite + `.env.*` exceto `.env.example`, artefatos de teste), `index.html` com `lang="pt-BR"` e título.
- Respondida a sugestão do backend `S002-codigos-de-erro.md` (ver abaixo).

## O que NÃO foi feito (e por quê)
- Nenhuma tela de negócio, login, rota ou guarda (T002, fora do escopo). React Router, Leaflet e STOMP estão instalados mas não usados.
- E2E: só o placeholder do Playwright; os navegadores do Playwright não foram baixados (`npx playwright install` fica para a fase F7).
- Dos 9 componentes shadcn, só `badge` e `sonner` (Toaster) estão de fato renderizados na casca; os demais (button, input, label, dialog, table, form, select) estão instalados, compilam e passam no lint, mas só serão usados pelas telas a partir da T002 — não criei tela fictícia para usá-los.
- Sem `git push` (não pedido).

## Arquivos criados/alterados
- Config: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `playwright.config.ts`, `components.json`, `.gitignore`, `.env.example`, `index.html`, `README.md`, `public/mockServiceWorker.js`
- `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`
- `src/app/{App.tsx, App.test.tsx, Providers.tsx, queryClient.ts}`
- `src/shared/api/{client.ts, client.test.ts, endpoints.ts, erros.ts, erros.test.ts, index.ts}`
- `src/shared/api/schemas/{comuns,coordenada,entrega,lote,motoboy,recibo,caixa,distanciaPreco,estabelecimento,usuario,index}.ts`, `schemas.test.ts`
- `src/shared/dominio/{enums.ts, transicoes.ts, transicoes.test.ts, index.ts}`
- `src/shared/formatacao/{moeda,distancia,dataHora,index}.ts`, `formatacao.test.ts`
- `src/shared/realtime/index.ts`, `src/shared/ui/*` (shadcn)
- `src/features/*/index.ts` (+ `.gitkeep` em `api/`, `componentes/`, `paginas/`)
- `src/test/{setup.ts, fabricas.ts, msw/handlers.ts, msw/server.ts, msw/browser.ts}`
- Fora do repo (exceção do Artigo 3.3): `../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S002-codigos-de-erro.md` — só `Status` e `Resposta do agente front`.

## Verificação
| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ `tsc -b` sem erros |
| `npm run lint` | ✅ sem erros nem avisos |
| `npm run test` | 6 arquivos, 46 testes, 46 passaram |
| `npm run build` | ✅ (`dist/assets/index-*.js` 340 kB / 104 kB gzip). Aviso do Rollup sobre um comentário `@__PURE__` dentro de `zod/v4/core/regexes.js` — vem da biblioteca, inofensivo |
| `npm run format:check` | ✅ |
| `npm run test:e2e` | ✅ placeholder (nenhum teste, `--pass-with-no-tests`) |

Os testes cobrem os critérios de aceite: `acoesPermitidas` para os 6 status; `parseErroApi` com e sem `campos`; código desconhecido caindo na `message`; `formatarMoeda(9)` → `R$ 9,00` (o Intl usa U+00A0 entre "R$" e o número; o teste normaliza o espaço) e `formatarMoeda(null)` → `"—"`; `formatarDataHora` sem deslocar o horário; saída de data sem `Z` nem offset; `EntregaResponse` aceitando opcionais ausentes e `null` e rejeitando status inválido. Também: cliente HTTP (Bearer, 401/403, login sem redirecionamento, resposta fora do contrato, abort) e smoke da casca com os providers.

Governança intacta: `git diff main` em `CLAUDE.md`, `agent/`, `docs/`, `tarefas/`, `relatorios/`, `sugestoes-backend/` e `.claude/` mostra só a mudança de Status da T001 e este relatório; as 19 skills seguem em `.claude/skills/`.

## Decisões tomadas (dentro do escopo)
- **`CREDENCIAIS_INVALIDAS` incluído no catálogo de erros**, apesar de não estar no AGENT.md 6.5: existe no `CodigoErro.java` (401 do login). Constituição 2.2a — segue-se o contrato real. A seção 6.5 do AGENT.md está desatualizada nesse ponto (cabe ao Orquestrador atualizar).
- **`distanciaRotaKm` não entrou no schema de `LoteEntregaResponse`:** o AGENT.md 6.3 cita o campo, mas ele não existe no record Java atual (e seria da otimização de rota, fora do escopo). `ordemRota` existe em `EntregaResponse` e é aceito no parse, mas não usado (Constituição 4.2).
- **`typecheck` = `tsc -b`**, não `tsc --noEmit`: o `tsconfig.json` raiz usa project references com `files: []`, então `tsc --noEmit` nele não checaria nada. `tsc -b` checa `tsconfig.app.json` e `tsconfig.node.json`, todos com `noEmit`.
- **`ErroApi.mensagem`** usa o mapa pt-BR sempre que o código é conhecido; a `message` original fica em `mensagemServidor` para as telas que quiserem um detalhe mais específico (por exemplo, `REGRA_NEGOCIO_VIOLADA`).
- **Datas:** a conversão passa sempre por `date-fns-tz` com `America/Sao_Paulo` explícito, então o resultado não depende do fuso do navegador. Entrada com `Z`/offset é rejeitada no schema e na formatação (o backend manda `LocalDateTime` sem fuso).
- **`AJUSTAR_REPASSE`** aparece em `acoesPermitidas` dos estados finais só como condição de status; `reciboId === null` e caixa aberto (Constituição 5.2) ficam para a feature de acerto, como está documentado no código.
- **Handlers MSW** em `src/test/msw/`, compartilhados entre testes e dev, com prefixo `*` para casar com qualquer origem (`VITE_API_URL` ou a origem da página).
- **shadcn:** o `sonner.tsx` foi adaptado sem `next-themes` (específico do Next.js), com tema claro fixo; a regra `react-refresh/only-export-components` foi desligada só em `src/shared/ui/**` (arquivos gerados exportam variantes junto com o componente).
- **Dependências além da lista da tarefa** (todas exigidas pela pilha da seção 4 ou pelo shadcn): `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `tw-animate-css`, `@tailwindcss/vite`, `eslint-config-prettier`, `@playwright/test`, `@types/leaflet`, `@types/node`. Versões instaladas: React 18.3.1, React Router 6.30, TanStack Query 5.107, Zod 4.6, Vite 6.4, Vitest 3.2, MSW 2.15, Tailwind 4.3, TypeScript 5.8.
- **Status `CONCLUIDA`** gravado no último commit da branch, junto com este relatório, imediatamente antes do merge (e depois de todas as verificações passarem), para não deixar uma mudança solta em `develop` fora de branch de tarefa.

## Sugestões/pendências registradas para o backend
- Nenhuma nova. Os endpoints ainda não existem, mas a tarefa diz que isso é esperado nesta fase e não é pendência a registrar.
- Respondida `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/S002-codigos-de-erro.md` → `Status: ACEITA` (`CREDENCIAIS_INVALIDAS` incluído; 404 decidido pelo status HTTP, sem depender dos 404 específicos nem de `VIOLACAO_MULTITENANT`).
- S001, S003 e S004 (também dirigidas ao front, `SEM-RESPOSTA`) **não foram respondidas**: tratam do cadastro de restaurante, dos DTOs de rota/lote e da cobertura de endpoints, que não são assunto desta tarefa. Ficam para as tarefas que tocarem nesses pontos (T002+), ou para o Orquestrador.

## Proposta de mudança no DVP (Constituição, Artigo 2.4)
- Nenhuma.

## Dúvidas / bloqueios
- Nenhum bloqueio.
- Para o Orquestrador (governança, não DVP): o `AGENT.md` do front está defasado em relação ao código do backend em dois pontos — 6.5 sem `CREDENCIAIS_INVALIDAS` e 6.3 citando `distanciaRotaKm` em `LoteEntregaResponse`. A seção 11 cita `typecheck (tsc --noEmit)`, que não funciona com project references (ver Decisões).

## Sugestões (não implementadas, fora do que o backend decide)
- A T002 deve ligar `configurarCliente({ obterToken, aoNaoAutenticado, aoAcessoNegado })` à store de sessão (Zustand) e ao router, e usar `tratarAutenticacaoGlobal: false` na chamada de login.
- Rodar `npx playwright install` quando a fase F7 começar.
