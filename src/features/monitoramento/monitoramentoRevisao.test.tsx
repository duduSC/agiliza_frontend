/** T009: Monitoramento pelo caminho de rede e no fuso de São Paulo. */
import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { mapaFalso } from '@/test/mapaFalso'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'
import { posicaoDesatualizada } from './util'

const ESPERA = { timeout: 10_000 }

beforeEach(() => {
  redefinirSessao()
  entrarComo('OPERADOR')
})
afterEach(() => vi.unstubAllEnvs())

it('posição é interpretada em São Paulo, mesmo com a máquina em UTC', () => {
  vi.stubEnv('TZ', 'UTC')
  const agora = new Date('2026-11-13T14:01:00-03:00')
  expect(posicaoDesatualizada('2026-11-13T14:00:00.123456', agora)).toBe(false)
})

it('lista só ONLINE e EM_ROTA com cadastro ativo, numa única leitura', async () => {
  let leituras = 0
  server.use(
    http.get('*/api/motoboys', () => {
      leituras++
      return undefined
    }),
  )
  renderizarApp('/monitoramento')
  const lista = await screen.findByRole('list', { name: 'Lista de entregadores' }, ESPERA)
  expect(within(lista).getAllByRole('listitem')).toHaveLength(4)
  expect(within(lista).queryByText('Jose Bloqueado')).not.toBeInTheDocument()
  // Duas leituras (ONLINE e EM_ROTA) deixavam quem trocou de status no meio aparecer duas vezes.
  expect(leituras).toBe(1)
})

it('o mapa enquadra a loja e os entregadores e identifica cada um pelo nome', async () => {
  renderizarApp('/monitoramento')
  await screen.findByRole('list', { name: 'Lista de entregadores' }, ESPERA)
  await waitFor(() => {
    const limites = mapaFalso.fitBounds.mock.lastCall?.[0] as number[][] | undefined
    expect(limites).toEqual([
      [-23.565, -46.65],
      [-23.5505, -46.634],
    ])
  }, ESPERA)
  const pinos = screen.getAllByTestId('pino-mapa')
  expect(pinos.map((p) => p.title).join(' ')).toMatch(/Loja/)
  expect(pinos).toHaveLength(5)
})

it('textos com acentuação correta', async () => {
  renderizarApp('/monitoramento')
  expect((await screen.findAllByText(/última posição/i, undefined, ESPERA)).length).toBeGreaterThan(0)
  expect(screen.getByText('Posição da frota em tempo real.')).toBeInTheDocument()
})
