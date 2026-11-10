# Agiliza Delivery — Backoffice Web

SPA do operador de logística e dos administradores (React 18 + Vite + TypeScript strict).
Referência completa (pilha, contrato com o backend, telas e regras): [`agent/AGENT.md`](agent/AGENT.md).

## Como rodar

```bash
npm install
cp .env.example .env      # VITE_API_URL e VITE_USE_MOCKS
npm run dev               # http://localhost:5173
```

Com `VITE_USE_MOCKS=true`, o MSW intercepta as chamadas no navegador (handlers em `src/test/msw/`).
Os endpoints ainda são provisórios (`src/shared/api/endpoints.ts`).

## Scripts

| Script                    | O que faz                                                         |
| ------------------------- | ----------------------------------------------------------------- |
| `dev`                     | servidor de desenvolvimento (Vite)                                |
| `build`                   | typecheck + build de produção                                     |
| `typecheck`               | `tsc -b` (strict)                                                 |
| `lint`                    | ESLint (inclui React Hooks e regras de segurança da Constituição) |
| `test`                    | Vitest + Testing Library + MSW                                    |
| `test:e2e`                | Playwright (placeholder até a fase F7)                            |
| `format` / `format:check` | Prettier                                                          |

## Estrutura

```
src/
├── app/          bootstrap: providers (TanStack Query, toasts) — router e guardas na T002
├── shared/
│   ├── api/        client.ts (único fetch), endpoints.ts, erros.ts, schemas/ (Zod)
│   ├── dominio/    enums oficiais, labels pt-BR, máquina de estados da entrega
│   ├── formatacao/ moeda ("—" para null), km, data/hora (America/Sao_Paulo)
│   ├── realtime/   cliente STOMP (T002+)
│   └── ui/         componentes shadcn/ui
├── features/     auth, despacho, monitoramento, acerto, caixa, loja, integracao, restaurantes
└── test/         setup do Vitest, handlers MSW, fábricas de dados
```
