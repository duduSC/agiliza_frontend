# T001 — Setup do projeto e fundações compartilhadas

**Status:** PENDENTE
**Fase:** F0
**Depende de:** —
**Referências no DVP:** 1.5.1, 1.5.2, 1.4.4, 2.2 (Entregas 1 e 4)
**Skills indicadas:** frontend-architecture, typescript-expert, frontend-data-contracts, tailwind-patterns, shadcn, vitest-skill

## ⚠️ Antes de começar — proteção dos arquivos de governança

A raiz de `agiliza_react/` já tem `CLAUDE.md`, `agent/`, `docs/`, `tarefas/`, `relatorios/`, `sugestoes-backend/` e `.claude/skills/`. O scaffold do Vite **não pode apagar nada disso** (Constituição, Artigo 3.5).

- Se `npm create vite@latest .` (ou equivalente) perguntar se deve limpar a pasta antes de criar o projeto: responda **não**.
- Se a ferramenta não der essa opção e ameaçar sobrescrever a pasta não-vazia: crie o projeto numa pasta temporária (`/tmp/vite-scaffold` ou similar) e depois mova só os arquivos do Vite (`src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `.gitignore` do Vite) para a raiz de `agiliza_react/`, um por um, sem tocar nos itens listados acima.
- Depois de criar o projeto, confirme que `CLAUDE.md`, `agent/CONSTITUTION.md`, `agent/AGENT.md`, `docs/`, `tarefas/`, `relatorios/`, `sugestoes-backend/` e `.claude/skills/` continuam intactos antes de seguir.

## Objetivo
Criar a base do Backoffice: o repositório git com `main`/`develop`, o projeto Vite + React 18 + TypeScript strict, com a pilha da seção 4 do `AGENT.md`, a estrutura de pastas da seção 5 e as fundações de `shared/` (cliente HTTP, erros, domínio, formatação), testadas e sem nenhuma tela de negócio ainda.

## Escopo

**Git (antes de tudo — esta tarefa é quem inicializa o repositório):**
- [ ] `git init` em `agiliza_react/`, se ainda não existir repositório.
- [ ] `.gitignore` básico (`node_modules`, `dist`, `.env`) já neste momento, antes do primeiro commit.
- [ ] Commit inicial na branch `main` com o que já existe (`CLAUDE.md`, `agent/`, `docs/`, `tarefas/`, `relatorios/`, `sugestoes-backend/`, `.claude/`) — mensagem `"Governança inicial do agente React"`.
- [ ] Criar a branch `develop` a partir de `main`.
- [ ] Criar a branch `feature/T001-setup-projeto` a partir de `develop` (`AGENT.md`, seção 3.5) e fazer **todo o resto desta tarefa** nela, comitando o progresso.
- [ ] Ao final, com os critérios de aceite batendo: merge `--no-ff` de `feature/T001-setup-projeto` para `develop`, e apagar a branch local. Não tocar em `main` de novo depois do commit inicial.

**Projeto React:**
- [ ] Projeto Vite `react-ts` **na raiz de `agiliza_react/`** (sem subpasta), React 18.x — respeitando o aviso de proteção acima.
- [ ] TypeScript `strict`, alias `@/` → `src/`.
- [ ] Instalar como dependências (sem usar ainda, exceto onde indicado): `react-router-dom`, `@tanstack/react-query`, `zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`, `leaflet`, `react-leaflet`, `@stomp/stompjs`, `date-fns`, `date-fns-tz`.
- [ ] Tailwind + shadcn/ui inicializados e **usados** (componentes base: button, input, label, dialog, table, badge, toast/sonner, form, select).
- [ ] ESLint (com regras de React Hooks) e Prettier.
- [ ] Vitest + Testing Library + jsdom; MSW configurado para os testes e para o modo dev (`VITE_USE_MOCKS=true`).
- [ ] Scripts `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e` (o e2e pode ser placeholder nesta tarefa).
- [ ] Estrutura de pastas da seção 5 do `../agent/AGENT.md`, com um `index.ts` vazio em cada feature.
- [ ] `shared/dominio/`: todos os enums da seção 6.1 do `AGENT.md` como `const` + tipo, labels pt-BR e o mapa de transições permitidas da ENTREGA (seção 6.2) com a função `acoesPermitidas(status)`.
- [ ] `shared/api/client.ts`: cliente único sobre `fetch` (base `VITE_API_URL`, injeção do `Authorization: Bearer`, parse JSON, tratamento de 401/403, `AbortSignal`).
- [ ] `shared/api/erros.ts`: parse de `ApiErrorResponse` (seção 6.5 do `AGENT.md`) em um `ErroApi` normalizado e o mapa `codigo → mensagem pt-BR` para **todos** os códigos.
- [ ] `shared/api/endpoints.ts`: os caminhos da seção 6.7 do `AGENT.md`, cada um com `// PROVISÓRIO`.
- [ ] `shared/api/schemas/`: schemas Zod de `CoordenadaDto`, `EntregaResponse`, `LoteEntregaResponse`, `MotoboyResponse`, `ReciboResponse`, `CaixaResponse`, `DistanciaPrecoResponse`, `EstabelecimentoResponse`, `UsuarioResponse` (seção 6.3; **confira os DTOs atuais no backend**).
- [ ] `shared/formatacao/`: `formatarMoeda` (BRL; `null`/`undefined` → `"—"`, nunca `R$ 0,00`), `formatarKm`, `formatarDataHora` (LocalDateTime sem fuso → America/Sao_Paulo) e uma função de saída que formate de volta para o backend sem indicador de fuso (seção 6.6 do `AGENT.md`).
- [ ] `.env.example` com `VITE_API_URL=http://localhost:8080` e `VITE_USE_MOCKS=true`.
- [ ] `README.md` curto na raiz: como rodar, scripts, estrutura (e uma linha apontando para `agent/AGENT.md` como referência completa).
- [ ] `.gitignore` do Vite mesclado com o básico já criado — não substituir às cegas.

## Fora do escopo
- Qualquer tela de negócio, login ou rota protegida (é a T002).
- Leaflet, STOMP e React Router são **instalados**, mas não usados ainda (ficam para T002+).
- `git push` para qualquer remoto.
- Tocar na branch `main` depois do commit inicial.
- Copiar o DVP para `docs/` — isso já foi feito pelo Orquestrador.

## Regras de negócio envolvidas
- Constituição, Artigos 2.3 (só enums oficiais), 3.4 (fluxo de git), 3.5 (proteção de arquivos), 5.1 (valor nulo), 5.5 (máquina de estados) e 7.1–7.3.

## Critérios de aceite
- Existe repositório git, com `main` (só o commit inicial de governança) e `develop`; todo o trabalho desta tarefa foi feito em `feature/T001-setup-projeto` e já foi mesclado (`--no-ff`) para `develop`; essa branch não existe mais localmente.
- `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam.
- `agent/`, `docs/`, `tarefas/`, `relatorios/`, `sugestoes-backend/` e `.claude/skills/` continuam intactos depois do scaffold.
- Testes cobrem: `acoesPermitidas` para os 6 status; parse de `ApiErrorResponse` com e sem `campos`; código desconhecido caindo na `message`; `formatarMoeda(9)` → `R$ 9,00`; `formatarMoeda(null)` → `"—"`; `formatarDataHora` sem deslocar o horário; a função de saída de data não gera `Z` nem offset; schema de `EntregaResponse` aceitando campos opcionais nulos e rejeitando status inválido.
- Nenhum `any` explícito.

## Mocks / backend
Os endpoints ainda não existem. Nesta tarefa o MSW só precisa estar configurado, com um handler de exemplo. Isso não é uma pendência a registrar — é esperado nesta fase.

## Ao terminar
Escreva `../relatorios/T001-setup-projeto.md` e pare.
