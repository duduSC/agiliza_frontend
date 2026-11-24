import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { LimiteDeErro } from './LimiteDeErro'

function Quebra(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'createIcon')")
}

describe('LimiteDeErro (T008)', () => {
  it('mostra o estado de erro no lugar do filho que quebrou, sem derrubar os irmaos', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <div>
        <LimiteDeErro mensagem="Nao foi possivel exibir o mapa.">
          <Quebra />
        </LimiteDeErro>
        <p>Lista continua aqui</p>
      </div>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Nao foi possivel exibir o mapa.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByText('Lista continua aqui')).toBeInTheDocument()
  })
})
