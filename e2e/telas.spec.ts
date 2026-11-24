/** T009, parte E: projetor e mapas, com o Leaflet de verdade. */
import type { Page } from '@playwright/test'
import { abrirPeloMenu, entrar, expect, filtrarAcerto, test } from './apoio'

const RESOLUCOES = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]

async function todosOsPinosVisiveis(page: Page, regiao: string, quantidade: number) {
  const mapa = page.getByRole('region', { name: regiao })
  const pinos = mapa.locator('.leaflet-marker-icon')
  await expect(pinos).toHaveCount(quantidade)
  await expect
    .poll(async () => {
      const area = (await mapa.boundingBox())!
      let fora = 0
      for (const pino of await pinos.all()) {
        const p = (await pino.boundingBox())!
        const dentro =
          p.x >= area.x &&
          p.y >= area.y &&
          p.x + p.width <= area.x + area.width &&
          p.y + p.height <= area.y + area.height
        if (!dentro) fora++
      }
      return fora
    }, { message: `pinos fora da área visível de "${regiao}"` })
    .toBe(0)
}

async function semRolagemHorizontal(page: Page, tela: string) {
  const excessos = await page.evaluate(() => {
    const largos = [...document.querySelectorAll('[data-slot="table-container"]')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => `tabela ${el.scrollWidth} > ${el.clientWidth}`)
    const raiz = document.documentElement
    if (raiz.scrollWidth > raiz.clientWidth) largos.push(`página ${raiz.scrollWidth} > ${raiz.clientWidth}`)
    return largos
  })
  expect(excessos, tela).toEqual([])
}

for (const resolucao of RESOLUCOES) {
  test.describe(`${resolucao.width}x${resolucao.height}`, () => {
    test.use({ viewport: resolucao })

    test('os mapas enquadram a loja e todos os pinos, inclusive um distante', async ({ page }) => {
      await entrar(page)
      // Entrega a cerca de 20 km da loja, pelo MSW: ficaria fora do zoom fixo antigo.
      const status = await page.evaluate(async () => {
        const resposta = await fetch('/api/entregas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomeCliente: 'Cliente Distante',
            enderecoCompleto: 'Estrada Exemplo, 1',
            coordenada: { latitude: -23.7, longitude: -46.8 },
            pagoOnline: false,
          }),
        })
        return resposta.status
      })
      expect(status).toBe(201)

      // Operação unificada (T010): loja, 4 pedidos aguardando (o distante incluído), o pino da
      // revisão SEM_DISTANCIA e os 4 entregadores da frota com posição.
      await abrirPeloMenu(page, 'Despacho')
      await todosOsPinosVisiveis(page, 'Mapa de entregas e entregadores', 10)

      await abrirPeloMenu(page, 'Monitoramento')
      await todosOsPinosVisiveis(page, 'Mapa da frota em tempo real', 5)
    })

    test('nenhuma tela tem rolagem horizontal', async ({ page }) => {
      await entrar(page)
      await expect(page.getByTestId('inicio-estabelecimento')).toHaveText('Pizzaria Demo')
      await semRolagemHorizontal(page, 'Início')

      await abrirPeloMenu(page, 'Despacho')
      await expect(page.getByRole('checkbox', { name: /Ana Souza/ })).toBeVisible()
      await semRolagemHorizontal(page, 'Despacho')

      await abrirPeloMenu(page, 'Monitoramento')
      await expect(page.getByRole('list', { name: 'Lista de entregadores' })).toBeVisible()
      await semRolagemHorizontal(page, 'Monitoramento')

      await abrirPeloMenu(page, 'Acerto')
      await filtrarAcerto(page)
      await expect(page.getByRole('button', { name: 'Marcar pago' })).toBeVisible()
      await semRolagemHorizontal(page, 'Acerto')

      await abrirPeloMenu(page, 'Caixa')
      await expect(page.getByRole('heading', { name: 'Caixa do dia' })).toBeVisible()
      await semRolagemHorizontal(page, 'Caixa')
    })
  })
}
