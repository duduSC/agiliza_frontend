import { defineConfig } from '@playwright/test'

/**
 * E2E (T009): Chromium + Vite próprio com MSW.
 *
 * Porta 5174, sempre um servidor novo. Os fluxos escrevem (despachar, gerar recibo, fechar caixa):
 * reaproveitar um Vite existente, como o da 5173, poderia fazê-los num backend real. A API também
 * aponta para a própria 5174, então nada alcança a 8080.
 */
const PORTA = 5174
const ORIGEM = `http://localhost:${PORTA}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/e2e',
  // Um navegador por vez: a máquina tem 8 GB e roda o Docker junto.
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: ORIGEM,
    viewport: { width: 1366, height: 768 },
    timezoneId: 'America/Sao_Paulo',
    locale: 'pt-BR',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: `npx vite --host localhost --port ${PORTA} --strictPort`,
    url: ORIGEM,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_USE_MOCKS: 'true', VITE_API_URL: ORIGEM },
  },
})
