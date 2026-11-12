import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { calcularSessaoDevHabilitada } from './sessaoDevHabilitada'
import { TelaSemSessao } from './paginas/TelaSemSessao'

/**
 * Pre-carrega o modulo do SeletorSessaoDev antes dos testes.
 * React.lazy(() => import(...)) cria uma promessa que pode levar tempo
 * indeterminado para resolver em jsdom quando outros testes estao rodando
 * em paralelo. Ao importar o modulo aqui, o cache do Vitest ja tem o
 * modulo resolvido quando o lazy() dispara o import(), eliminando a
 * condicao de corrida que fazia o Suspense fallback ficar preso.
 */
beforeAll(async () => {
  await import('./dev/SeletorSessaoDev')
})

describe('sessão de desenvolvimento (PROVISÓRIO)', () => {
  it('só fica habilitada com DEV ou VITE_USE_MOCKS=true, e nunca em produção', () => {
    expect(calcularSessaoDevHabilitada({ PROD: false, DEV: true })).toBe(true)
    expect(calcularSessaoDevHabilitada({ PROD: false, DEV: false, VITE_USE_MOCKS: 'true' })).toBe(
      true,
    )
    expect(calcularSessaoDevHabilitada({ PROD: false, DEV: false, VITE_USE_MOCKS: 'false' })).toBe(
      false,
    )
    expect(calcularSessaoDevHabilitada({ PROD: false, DEV: false })).toBe(false)
    expect(calcularSessaoDevHabilitada({ PROD: true, DEV: false, VITE_USE_MOCKS: 'true' })).toBe(
      false,
    )
  })

  it('sem DEV/mocks, a tela "Sem sessão" não mostra o seletor', () => {
    render(
      <MemoryRouter>
        <TelaSemSessao sessaoDevHabilitada={false} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Sem sessão' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /sessão de desenvolvimento/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Perfil')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /e-mail/i })).not.toBeInTheDocument()
  })

  it('com DEV/mocks, a tela "Sem sessão" mostra o seletor', async () => {
    render(
      <MemoryRouter>
        <TelaSemSessao sessaoDevHabilitada />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('form', { name: /sessão de desenvolvimento/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument()
  })
})
