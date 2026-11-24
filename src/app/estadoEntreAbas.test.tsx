/**
 * T010, item 2: o estado das telas não se perde ao trocar de aba (D013, decisão 4). Fica só em
 * memória (Zustand), nunca em storage, e some na troca de sessão (Constituição, Artigo 6.2).
 */
import { act, fireEvent, screen, within } from '@testing-library/react'
import { useSessaoStore } from '@/features/auth'
import { IDS_ACERTO } from '@/test/msw/dadosAcerto'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const ESPERA = { timeout: 10_000 }

beforeEach(() => {
  redefinirSessao()
  // eslint-disable-next-line no-restricted-globals -- só para provar que nada é gravado ali
  localStorage.clear()
  sessionStorage.clear()
  entrarComo('OPERADOR')
})

function irPeloMenu(nome: string) {
  const menu = screen.getByRole('navigation', { name: 'Menu principal' })
  fireEvent.click(within(menu).getByRole('link', { name: nome }))
}

async function filtrarAcerto() {
  await screen.findByRole('option', { name: 'Entregador Exemplo' }, ESPERA)
  fireEvent.change(screen.getByLabelText('Selecionar entregador'), { target: { value: IDS_ACERTO.motoboy } })
  fireEvent.change(screen.getByLabelText(/Data in[ií]cio/), { target: { value: '2026-11-09' } })
  fireEvent.change(screen.getByLabelText('Data fim'), { target: { value: '2026-11-09' } })
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
  await screen.findByText(/^Total devido/, undefined, ESPERA)
}

describe('Acerto', () => {
  it('ir ao Caixa e voltar mantém o filtro e o resultado', async () => {
    renderizarApp('/acerto')
    await filtrarAcerto()

    irPeloMenu('Caixa')
    await screen.findByRole('heading', { name: 'Caixa', level: 1 }, ESPERA)
    irPeloMenu('Acerto')

    expect(await screen.findByText(/^Total devido/, undefined, ESPERA)).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Entregador Exemplo', selected: true }, ESPERA)).toBeInTheDocument()
    expect(screen.getByLabelText(/Data in[ií]cio/)).toHaveValue('2026-11-09')
    expect(screen.getByLabelText('Data fim')).toHaveValue('2026-11-09')
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('o filtro não vai para localStorage, sessionStorage nem para a URL', async () => {
    const { local } = renderizarApp('/acerto')
    await filtrarAcerto()
    // eslint-disable-next-line no-restricted-globals -- só para provar que nada é gravado ali
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(local.pathname).toBe('/acerto')
    expect(window.location.search).toBe('')
  })

  it('a troca de sessão apaga o filtro', async () => {
    const primeira = renderizarApp('/acerto')
    await filtrarAcerto()
    primeira.unmount()

    act(() => {
      useSessaoStore.getState().encerrarSessao()
      entrarComo('ADMIN_RESTAURANTE')
    })
    renderizarApp('/acerto')
    await screen.findByRole('option', { name: 'Entregador Exemplo' }, ESPERA)
    expect(screen.getByText(/Selecione um entregador e período/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Data in[ií]cio/)).toHaveValue('')
  })
})

describe('Despacho', () => {
  it('a seleção de entregas sobrevive a uma ida ao Caixa', async () => {
    renderizarApp('/despacho')
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' }, ESPERA))

    irPeloMenu('Caixa')
    await screen.findByRole('heading', { name: 'Caixa', level: 1 }, ESPERA)
    irPeloMenu('Despacho')

    expect(await screen.findByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' }, ESPERA)).toBeChecked()
  })

  it('a troca de sessão apaga a seleção', async () => {
    const primeira = renderizarApp('/despacho')
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' }, ESPERA))
    primeira.unmount()

    act(() => {
      useSessaoStore.getState().encerrarSessao()
      entrarComo('OPERADOR')
    })
    renderizarApp('/despacho')
    expect(await screen.findByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' }, ESPERA)).not.toBeChecked()
  })

  it('o filtro da operação ("Saiu para entrega") sobrevive a uma ida ao Caixa', async () => {
    renderizarApp('/despacho')
    fireEvent.click(await screen.findByRole('button', { name: 'Saiu para entrega' }, ESPERA))

    irPeloMenu('Caixa')
    await screen.findByRole('heading', { name: 'Caixa', level: 1 }, ESPERA)
    irPeloMenu('Despacho')

    expect(await screen.findByRole('button', { name: 'Saiu para entrega' }, ESPERA)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await screen.findByRole('group', { name: /^Pedido 1: Gabi Torres/ }, ESPERA)).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('a troca de sessão volta o filtro da operação para "Aguardando despacho"', async () => {
    const primeira = renderizarApp('/despacho')
    fireEvent.click(await screen.findByRole('button', { name: 'Todos' }, ESPERA))
    primeira.unmount()

    act(() => {
      useSessaoStore.getState().encerrarSessao()
      entrarComo('OPERADOR')
    })
    renderizarApp('/despacho')
    expect(await screen.findByRole('button', { name: 'Aguardando despacho' }, ESPERA)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
