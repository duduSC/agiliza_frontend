/** T009: Despacho pelo caminho de rede, com as regras do Artigo 5 e a passada adversarial. */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { criarEntregaResponse } from '@/test/fabricas'
import { mapaFalso } from '@/test/mapaFalso'
import { dbEntregas } from '@/test/msw/dadosEntregas'
import { criarEstabelecimentoMock } from '@/test/msw/handlersEstabelecimento'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'
import { chavesEntregas } from './api/hooks'
import { useSelecaoStore } from './selecaoStore'

const ESPERA = { timeout: 10_000 }
const LOJA = 'a1b2c3d4-0001-4a00-8a00-00000000d001'

beforeEach(() => {
  redefinirSessao()
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
  entrarComo('OPERADOR')
})

async function abrirESelecionar(...nomes: string[]) {
  const app = renderizarApp('/despacho')
  for (const nome of nomes) {
    fireEvent.click(await screen.findByRole('checkbox', { name: `Selecionar entrega de ${nome}` }, ESPERA))
  }
  return app
}

async function abrirDialogoComEntregador() {
  const despachar = await screen.findByRole('button', { name: /^Despachar \d/ }, ESPERA)
  await waitFor(() => expect(despachar).toBeEnabled(), ESPERA)
  fireEvent.click(despachar)
  fireEvent.click(await screen.findByRole('radio', { name: 'Selecionar Ricardo Silva' }, ESPERA))
  return screen.getByRole('button', { name: 'Confirmar despacho' })
}

describe('escritas do despacho', () => {
  it('duplo clique em "Confirmar despacho" envia um único POST', async () => {
    let envios = 0
    server.use(
      http.post('*/api/lotes', () => {
        envios++
        return undefined // segue para o handler normal
      }),
    )
    await abrirESelecionar('Ana Souza')
    const confirmar = await abrirDialogoComEntregador()
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    await screen.findByText(/lote com 1 entrega.*despachado/i, undefined, ESPERA)
    expect(envios).toBe(1)
  })

  it('duplo clique em "Devolver lote" envia um único POST', async () => {
    let envios = 0
    server.use(
      http.post('*/api/lotes/:id/devolver', () => {
        envios++
        return undefined
      }),
    )
    renderizarApp('/despacho')
    const botao = await screen.findByRole('button', { name: /devolver lote com 2/i }, ESPERA)
    fireEvent.click(botao)
    fireEvent.click(botao)
    await screen.findByText(/lote com 2.*devolvido/i, undefined, ESPERA)
    expect(envios).toBe(1)
  })

  it('trocar de tela no meio do despacho ainda avisa o resultado', async () => {
    server.use(
      http.post('*/api/lotes', async () => {
        await delay(400)
        return undefined
      }),
    )
    await abrirESelecionar('Ana Souza')
    fireEvent.click(await abrirDialogoComEntregador())
    const inicio = screen.getByRole('link', { name: 'Início', hidden: true })
    fireEvent.click(inicio)
    expect(await screen.findByText(/lote com 1 entrega.*despachado/i, undefined, ESPERA)).toBeInTheDocument()
  })

  it('erro de despacho atualiza as listas, porque o estado mudou por baixo', async () => {
    let leituras = 0
    server.use(
      http.get('*/api/entregas', () => {
        leituras++
        return undefined
      }),
      http.post('*/api/lotes', () => HttpResponse.json({ codigo: 'ENTREGA_INAPTA_LOTE' }, { status: 422 })),
    )
    await abrirESelecionar('Ana Souza')
    const confirmar = await abrirDialogoComEntregador()
    const antes = leituras
    fireEvent.click(confirmar)
    expect(await screen.findByText(/não podem entrar neste lote/i, undefined, ESPERA)).toBeInTheDocument()
    expect(leituras).toBeGreaterThan(antes)
  })
})

describe('seleção', () => {
  it('entrega que saiu da lista sai da seleção', async () => {
    const { queryClient } = await abrirESelecionar('Ana Souza', 'Bruno Lima')
    dbEntregas.substituir(dbEntregas.todas().filter((e) => e.nomeCliente !== 'Ana Souza'))
    await act(() => queryClient.refetchQueries({ queryKey: chavesEntregas.pendentes(LOJA) }))
    await waitFor(() => expect(useSelecaoStore.getState().selecionadas.size).toBe(1), ESPERA)
  })

  it('limite menor que a seleção bloqueia o despacho e explica', async () => {
    const { queryClient } = await abrirESelecionar('Ana Souza', 'Bruno Lima')
    server.use(
      http.get('*/api/estabelecimento', () =>
        HttpResponse.json(criarEstabelecimentoMock({ maxPedidosPorLote: 1 })),
      ),
    )
    await act(() => queryClient.refetchQueries({ queryKey: ['estabelecimento', LOJA] }))
    expect(await screen.findByText(/no máximo 1/i, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Despachar/ })).toBeDisabled()
  })

  it('a ordem de seleção, que vira a ordem das paradas, aparece no pino sem depender de cor', async () => {
    await abrirESelecionar('Bruno Lima', 'Ana Souza')
    const pinos = screen.getAllByTestId('pino-mapa')
    const pinoDe = (nome: string) => pinos.find((p) => p.title.includes(nome))!
    expect(within(pinoDe('Bruno Lima')).getByText('1')).toBeInTheDocument()
    expect(within(pinoDe('Ana Souza')).getByText('2')).toBeInTheDocument()
  })

  it('sem entregador online: aviso visível, não só no title (UC01 E1)', async () => {
    server.use(http.get('*/api/motoboys', () => HttpResponse.json([])))
    await abrirESelecionar('Ana Souza')
    expect(await screen.findByText('Nenhum entregador online', undefined, ESPERA)).toBeVisible()
  })
})

describe('robustez', () => {
  it('falha ao atualizar mantém a lista e avisa', async () => {
    const { queryClient } = renderizarApp('/despacho')
    await screen.findByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' }, ESPERA)
    queryClient.setDefaultOptions({ queries: { retry: false } })
    server.use(http.get('*/api/entregas', () => new HttpResponse(null, { status: 503 })))
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: chavesEntregas.todas(LOJA) })
    })
    expect((await screen.findAllByText(/não foi possível atualizar/i, undefined, ESPERA)).length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: 'Selecionar entrega de Ana Souza' })).toBeInTheDocument()
  })

  it('entrega com todos os campos opcionais nulos aparece com "—", nunca R$ 0,00', async () => {
    dbEntregas.substituir([criarEntregaResponse({ nomeCliente: 'Tudo Nulo' })])
    renderizarApp('/despacho')
    const linha = (await screen.findByText('Tudo Nulo', { selector: 'td' }, ESPERA)).closest('tr')!
    expect(within(linha).getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(linha).not.toHaveTextContent('R$')
  })

  it('o mapa enquadra a loja e todos os pinos, inclusive os distantes', async () => {
    dbEntregas.inserir(
      criarEntregaResponse({
        id: '9a999999-9999-4999-8999-999999999999',
        nomeCliente: 'Distante',
        coordenada: { latitude: -23.7, longitude: -46.8 },
      }),
    )
    renderizarApp('/despacho')
    await screen.findByText('Distante', { selector: 'td' }, ESPERA)
    await waitFor(() => expect(mapaFalso.fitBounds).toHaveBeenCalled(), ESPERA)
    await waitFor(() => {
      const [limites] = mapaFalso.fitBounds.mock.lastCall as [[[number, number], [number, number]]]
      expect(limites).toEqual([
        [-23.7, -46.8],
        [-23.55, -46.63],
      ])
    }, ESPERA)
  })
})
