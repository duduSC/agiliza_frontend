import { render, screen } from '@testing-library/react'
import { App } from './App'
import { Providers } from './Providers'

describe('App', () => {
  it('renderiza a casca com os providers', () => {
    render(
      <Providers>
        <App />
      </Providers>,
    )
    expect(screen.getByRole('heading', { name: /agiliza delivery/i })).toBeInTheDocument()
  })
})
