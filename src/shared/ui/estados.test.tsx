import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginaEsqueleto } from './PaginaEsqueleto'

describe('PaginaEsqueleto e estados de tela', () => {
  it('padrão: título e estado vazio', () => {
    render(<PaginaEsqueleto titulo="Despacho" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Despacho' })).toBeInTheDocument()
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument()
  })

  it('carregando', () => {
    render(<PaginaEsqueleto titulo="Acerto" estado={{ tipo: 'carregando' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('erro com "Tentar novamente"', async () => {
    const tentar = vi.fn()
    render(
      <PaginaEsqueleto
        titulo="Caixa"
        estado={{ tipo: 'erro', mensagem: 'Falha de rede', aoTentarNovamente: tentar }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Erro: Falha de rede')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(tentar).toHaveBeenCalledOnce()
  })

  it('sucesso renderiza o conteúdo', () => {
    render(<PaginaEsqueleto titulo="X" estado={{ tipo: 'sucesso', conteudo: <p>ok</p> }} />)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
