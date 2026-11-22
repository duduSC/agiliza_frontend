import { expect, test as base, type Page } from '@playwright/test'

/**
 * Todo teste roda isolado da rede: só a origem do Vite com MSW. Qualquer exceção na página reprova
 * o teste (foi assim que o bug da T008 se manifestou).
 */
export const test = base.extend<{ isolamento: void }>({
  isolamento: [
    async ({ context, page, baseURL }, usar) => {
      const origem = new URL(baseURL!).origin
      await context.route(
        (url) => url.origin !== origem,
        (rota) => rota.abort(),
      )
      const excecoes: string[] = []
      page.on('pageerror', (erro) => excecoes.push(erro.message))
      await usar()
      expect(excecoes, 'exceções na página').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Contas que só existem no MSW. */
export const CONTAS = {
  operador: 'operador@teste.com',
  loja: 'admin@loja.com',
  plataforma: 'admin@agiliza.com',
  entregador: 'motoboy@teste.com',
} as const

export async function preencherLogin(page: Page, email: string) {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha123')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function entrar(page: Page, email: string = CONTAS.operador) {
  await page.goto('/login')
  await preencherLogin(page, email)
  await expect(page).toHaveURL(/\/inicio$/)
}

export async function abrirPeloMenu(page: Page, tela: string) {
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: tela }).click()
  await expect(page.getByRole('heading', { level: 1, name: tela })).toBeVisible()
}

/** Muda de rota sem recarregar: a sessão fica em memória (Constituição, Artigo 6.1). */
export async function irSemRecarregar(page: Page, caminho: string) {
  await page.evaluate((destino) => {
    window.history.pushState(null, '', destino)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, caminho)
}

/** O extrato de exemplo do MSW é de 09/11/2026. */
export async function filtrarAcerto(page: Page) {
  await page.getByLabel('Selecionar entregador').selectOption({ label: 'Entregador Exemplo' })
  await page.getByLabel('Data início').fill('2026-11-09')
  await page.getByLabel('Data fim').fill('2026-11-09')
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page.getByText('Total devido', { exact: true })).toBeVisible()
}
