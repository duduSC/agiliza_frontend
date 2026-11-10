import { defineConfig } from '@playwright/test'

/**
 * E2E (Playwright) — placeholder da T001. Os fluxos de ponta a ponta entram na fase F7.
 * `npm run test:e2e` passa sem testes (`--pass-with-no-tests`).
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
})
