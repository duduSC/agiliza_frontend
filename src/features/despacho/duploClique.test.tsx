/** T009: as escritas que não movem dinheiro também saem uma vez só. */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

beforeEach(() => redefinirSessao())

function contar(metodo: 'post' | 'patch', caminho: string) {
  const envios = { total: 0 }
  server.use(
    http[metodo](caminho, () => {
      envios.total++
      return undefined
    }),
  )
  return envios
}

function clicarDuasVezes(botao: HTMLElement) {
  fireEvent.click(botao)
  fireEvent.click(botao)
}

it('login', async () => {
  const envios = contar('post', '*/api/auth/login')
  const { local } = renderizarApp('/login')
  fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'operador@teste.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } })
  const formulario = screen.getByRole('form', { name: 'Login' })
  // Enter duas vezes: submete o formulário sem passar pelo botão desabilitado.
  fireEvent.submit(formulario)
  fireEvent.submit(formulario)
  await waitFor(() => expect(local.pathname).toBe('/inicio'))
  expect(envios.total).toBe(1)
})

it('marcar pronto', async () => {
  const envios = contar('post', '*/api/entregas/:id/pronto')
  entrarComo('OPERADOR')
  renderizarApp('/despacho')
  clicarDuasVezes(await screen.findByRole('button', { name: 'Marcar pronto: entrega de Ana Souza' }))
  await screen.findByText(/Ana Souza marcada como pronta/)
  expect(envios.total).toBe(1)
})

it('cancelar entrega', async () => {
  const envios = contar('post', '*/api/entregas/:id/cancelar')
  entrarComo('OPERADOR')
  renderizarApp('/despacho')
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entrega de Ana Souza' }))
  fireEvent.change(await screen.findByLabelText(/Motivo do cancelamento/), { target: { value: 'Desistiu' } })
  clicarDuasVezes(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
  await screen.findByText(/Ana Souza cancelada/)
  expect(envios.total).toBe(1)
})

it('ajustar coordenada', async () => {
  const envios = contar('patch', '*/api/entregas/:id/coordenada')
  entrarComo('OPERADOR')
  renderizarApp('/despacho')
  fireEvent.change(await screen.findByLabelText(/^Latitude/), { target: { value: '-23,55' } })
  fireEvent.change(screen.getByLabelText(/^Longitude/), { target: { value: '-46,63' } })
  clicarDuasVezes(screen.getByRole('button', { name: 'Salvar coordenada' }))
  await screen.findByText(/Coordenada de Diego Alves enviada/)
  expect(envios.total).toBe(1)
})
