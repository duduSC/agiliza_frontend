/** T009, parte G: os fluxos principais no navegador, com MSW no formato real do backend. */
import { abrirPeloMenu, CONTAS, entrar, expect, filtrarAcerto, irSemRecarregar, preencherLogin, test } from './apoio'

test('login, início e despacho com seleção, operado pelo teclado', async ({ page }) => {
  await entrar(page)
  await expect(page.getByTestId('inicio-estabelecimento')).toHaveText('Pizzaria Demo')
  await abrirPeloMenu(page, 'Despacho')

  for (const nome of ['Bruno Lima', 'Ana Souza']) {
    await page.getByRole('checkbox', { name: `Selecionar entrega de ${nome}` }).focus()
    await page.keyboard.press('Space')
  }
  await expect(page.getByText('2 de 5 entrega(s) selecionada(s)')).toBeVisible()

  const despachar = page.getByRole('button', { name: /^Despachar 2/ })
  await expect(despachar).toBeEnabled()
  await despachar.focus()
  await page.keyboard.press('Enter')

  const dialogo = page.getByRole('dialog', { name: 'Despachar entregas' })
  await dialogo.getByRole('radio', { name: 'Selecionar Ricardo Silva' }).focus()
  await page.keyboard.press('Space')
  await dialogo.getByRole('button', { name: 'Confirmar despacho' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Lote com 2 entrega(s) despachado.')).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('checkbox', { name: /Ana Souza|Bruno Lima/ })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Lotes despachados' }).getByRole('listitem')).toHaveCount(2)
})

test('acerto: gerar recibo e marcar como pago', async ({ page }) => {
  await entrar(page)
  await abrirPeloMenu(page, 'Acerto')
  await filtrarAcerto(page)

  await page.getByRole('button', { name: 'Gerar recibo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Gerar recibo' })
  await expect(dialogo).toContainText('Ana Souza')
  await expect(dialogo).toContainText(/Total do recibo: R\$\s9,00/)
  await dialogo.getByRole('button', { name: 'Confirmar geração' }).click()

  await expect(page.getByText(/Recibo gerado: 1 entrega\(s\), R\$\s9,00/)).toBeVisible()
  await expect(dialogo).toBeHidden()
  const pagar = page.getByRole('button', { name: 'Marcar pago' })
  await expect(pagar).toHaveCount(2)
  await pagar.last().click()

  await expect(page.getByText(/Recibo marcado como pago/)).toBeVisible()
  await expect(pagar).toHaveCount(1)
})

test('fechar o caixa exige confirmação e deixa o acerto somente leitura', async ({ page }) => {
  await entrar(page)
  await abrirPeloMenu(page, 'Caixa')

  await page.getByRole('button', { name: 'Fechar caixa' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Fechar caixa' })
  const confirmar = dialogo.getByRole('button', { name: 'Confirmar fechamento' })
  await expect(confirmar).toBeDisabled()
  await dialogo.getByLabel(/digite FECHAR/).fill('FECHAR')
  await confirmar.click()

  await expect(page.getByText('Caixa fechado com sucesso.')).toBeVisible()
  await expect(page.getByText(/Caixa fechado — período imutável/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fechar caixa' })).toHaveCount(0)

  await abrirPeloMenu(page, 'Acerto')
  await filtrarAcerto(page)
  await expect(page.getByText(/somente leitura/)).toBeVisible()
  for (const acao of ['Gerar recibo', 'Ajustar', 'Marcar pago']) {
    await expect(page.getByRole('button', { name: acao })).toHaveCount(0)
  }
})

test.describe('acesso negado por perfil', () => {
  test('operador não abre as telas da loja nem de restaurantes', async ({ page }) => {
    await entrar(page)
    for (const rota of ['/loja/parametros', '/restaurantes']) {
      await irSemRecarregar(page, rota)
      await expect(page.getByRole('heading', { level: 1, name: 'Acesso negado' })).toBeVisible()
    }
    await page.getByRole('link', { name: 'Voltar para o início' }).click()
    await expect(page).toHaveURL(/\/inicio$/)
  })

  test('administrador geral não abre as telas de operação', async ({ page }) => {
    await entrar(page, CONTAS.plataforma)
    for (const rota of ['/despacho', '/caixa']) {
      await irSemRecarregar(page, rota)
      await expect(page.getByRole('heading', { level: 1, name: 'Acesso negado' })).toBeVisible()
    }
  })

  test('entregador é recusado no login', async ({ page }) => {
    await page.goto('/login')
    await preencherLogin(page, CONTAS.entregador)
    await expect(page.getByRole('alert')).toContainText('Este acesso é exclusivo do painel administrativo')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('sem sessão vai ao login e, depois, volta ao destino permitido (D011)', async ({ page }) => {
    await page.goto('/caixa')
    await expect(page).toHaveURL(/\/login$/)
    await preencherLogin(page, CONTAS.loja)
    await expect(page).toHaveURL(/\/caixa$/)
  })
})
