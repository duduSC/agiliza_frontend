/**
 * T010, item 3: Relatório do dia (`GET /api/relatorios/dia?data=`, contrato da D013, PROVISÓRIO).
 * Todos os totais vêm do servidor (Constituição, Artigo 5.1); `null` aparece como "—".
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { relatorioDoDiaMock } from '@/test/msw/handlersRelatorio'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const ESPERA = { timeout: 10_000 }
const HOJE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

beforeEach(() => {
  redefinirSessao()
  entrarComo('OPERADOR')
})

function responderCom(corpo: object, espera = 0) {
  const datas: (string | null)[] = []
  server.use(
    http.get('*/api/relatorios/dia', async ({ request }) => {
      datas.push(new URL(request.url).searchParams.get('data'))
      if (espera) await delay(espera)
      return HttpResponse.json(corpo)
    }),
  )
  return datas
}

function cartao(rotulo: string) {
  return screen.getByTestId(`cartao-${rotulo}`)
}

describe('acesso', () => {
  it.each(['OPERADOR', 'ADMIN_RESTAURANTE'] as const)('%s vê o item no menu e o atalho no Início', async (perfil) => {
    redefinirSessao()
    entrarComo(perfil)
    renderizarApp('/inicio')
    const menu = await screen.findByRole('navigation', { name: 'Menu principal' }, ESPERA)
    expect(within(menu).getByRole('link', { name: 'Relatório do dia' })).toHaveAttribute('href', '/relatorio')
    const atalhos = screen.getByRole('list', { name: 'Atalhos' })
    expect(within(atalhos).getByRole('link', { name: /Relatório do dia/ })).toHaveAttribute('href', '/relatorio')
  })

  it('ADMIN_GERAL não acessa', async () => {
    redefinirSessao()
    entrarComo('ADMIN_GERAL')
    const { local } = renderizarApp('/relatorio')
    await waitFor(() => expect(local.pathname).toBe('/acesso-negado'), ESPERA)
  })
})

describe('estados', () => {
  it('carregando, depois sucesso', async () => {
    responderCom(relatorioDoDiaMock(), 300)
    renderizarApp('/relatorio')
    expect(await screen.findByText(/Carregando o relatório/, undefined, ESPERA)).toBeInTheDocument()
    expect(await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)).toHaveTextContent('7')
  })

  it('vazio: dia sem entrega finalizada', async () => {
    responderCom(
      relatorioDoDiaMock({
        totalEntregas: 0,
        entregues: 0,
        falhas: 0,
        canceladas: 0,
        entregadoresQueTrabalharam: 0,
        valorTotalRepasse: 0,
        valorPago: 0,
        valorAPagar: 0,
        porEntregador: [],
      }),
    )
    renderizarApp('/relatorio')
    expect(await screen.findByText(/Nenhuma entrega finalizada em/, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('erro com nova tentativa', async () => {
    server.use(http.get('*/api/relatorios/dia', () => new HttpResponse(null, { status: 503 })))
    renderizarApp('/relatorio')
    expect(await screen.findByRole('button', { name: 'Tentar novamente' }, { timeout: 20_000 })).toBeInTheDocument()
  }, 30_000)

  it('resposta fora do contrato vira erro, não tela quebrada', async () => {
    responderCom({ data: HOJE, totalEntregas: 'sete' })
    renderizarApp('/relatorio')
    expect(await screen.findByText(/formato inesperado/, undefined, ESPERA)).toBeInTheDocument()
  })
})

describe('valores do servidor (Constituição 5.1)', () => {
  it('cartões mostram exatamente os totais do servidor, sem somar no cliente', async () => {
    // Totais propositalmente diferentes da soma das linhas: a tela tem de mostrar os do servidor.
    responderCom(
      relatorioDoDiaMock({
        valorTotalRepasse: 99.99,
        valorPago: 11.11,
        valorAPagar: 88.88,
      }),
    )
    renderizarApp('/relatorio')
    await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)
    expect(cartao('total-entregas')).toHaveTextContent('7')
    expect(cartao('entregues')).toHaveTextContent('5')
    expect(cartao('falhas')).toHaveTextContent('1')
    expect(cartao('canceladas')).toHaveTextContent('1')
    expect(cartao('entregadores')).toHaveTextContent('2')
    expect(cartao('valor-repasse')).toHaveTextContent(/R\$\s*99,99/)
    expect(cartao('valor-pago')).toHaveTextContent(/R\$\s*11,11/)
    expect(cartao('valor-a-pagar')).toHaveTextContent(/R\$\s*88,88/)
  })

  it('tabela por entregador com os valores de cada linha', async () => {
    responderCom(relatorioDoDiaMock())
    renderizarApp('/relatorio')
    const tabela = await screen.findByRole('table', { name: 'Entregas por entregador' }, ESPERA)
    const linha = within(tabela).getByText('Ricardo Silva').closest('tr')!
    expect(within(linha).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Ricardo Silva',
      '4',
      '3',
      '1',
      expect.stringMatching(/R\$\s*30,00/),
      expect.stringMatching(/R\$\s*20,00/),
      expect.stringMatching(/R\$\s*10,00/),
    ])
  })

  it('valor nulo aparece como "—", nunca R$ 0,00, nos cartões e na tabela', async () => {
    responderCom(
      relatorioDoDiaMock({
        valorTotalRepasse: null,
        valorAPagar: null,
        porEntregador: [
          {
            motoboyId: '3d4e5f6a-7b8c-4d9e-bf0a-1b2c3d4e5f6a',
            nome: 'Sem Valor',
            entregas: 1,
            entregues: 1,
            falhas: 0,
            valorRepasse: null,
            valorPago: 0,
            valorAPagar: null,
          },
        ],
      }),
    )
    renderizarApp('/relatorio')
    await screen.findByTestId('cartao-valor-repasse', undefined, ESPERA)
    expect(cartao('valor-repasse')).toHaveTextContent('—')
    expect(cartao('valor-repasse')).not.toHaveTextContent('R$ 0,00')
    expect(cartao('valor-a-pagar')).toHaveTextContent('—')
    const linha = screen.getByText('Sem Valor').closest('tr')!
    const celulas = within(linha).getAllByRole('cell').map((c) => c.textContent)
    expect(celulas[4]).toBe('—')
    expect(celulas[6]).toBe('—')
    expect(screen.getByText(/valor ainda indefinido/i)).toBeInTheDocument()
  })
})

describe('filtro por data', () => {
  it('abre no dia de hoje (São Paulo) e troca de dia pelo filtro', async () => {
    const datas = responderCom(relatorioDoDiaMock())
    renderizarApp('/relatorio')
    await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)
    expect(datas[0]).toBe(HOJE)
    expect(screen.getByLabelText('Data')).toHaveValue(HOJE)

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-08' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver relatório' }))
    await waitFor(() => expect(datas).toContain('2026-11-08'), ESPERA)
  })

  it('data vazia não consulta e explica', async () => {
    const datas = responderCom(relatorioDoDiaMock())
    renderizarApp('/relatorio')
    await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)
    const antes = datas.length
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver relatório' }))
    expect(await screen.findByText('Informe a data.')).toBeInTheDocument()
    expect(datas.length).toBe(antes)
  })

  it('voltar ao relatório relê o servidor: o pago de agora, não o de antes', async () => {
    // Os totais são do "servidor" (o mock): antes e depois de um recibo pago no Acerto.
    let totais = { valorPago: 20, valorAPagar: 32.5 }
    server.use(http.get('*/api/relatorios/dia', () => HttpResponse.json(relatorioDoDiaMock(totais))))
    renderizarApp('/relatorio')
    expect(await screen.findByTestId('cartao-valor-pago', undefined, ESPERA)).toHaveTextContent(/R\$\s*20,00/)

    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    fireEvent.click(within(menu).getByRole('link', { name: 'Caixa' }))
    await screen.findByRole('heading', { name: 'Caixa', level: 1 }, ESPERA)
    totais = { valorPago: 52.5, valorAPagar: 0 }
    fireEvent.click(within(menu).getByRole('link', { name: 'Relatório do dia' }))

    await waitFor(() => expect(cartao('valor-pago')).toHaveTextContent(/R\$\s*52,50/), ESPERA)
    expect(cartao('valor-a-pagar')).toHaveTextContent(/R\$\s*0,00/)
  })

  it('a data escolhida sobrevive a uma ida ao Caixa', async () => {
    const datas = responderCom(relatorioDoDiaMock())
    renderizarApp('/relatorio')
    await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-08' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver relatório' }))
    await waitFor(() => expect(datas).toContain('2026-11-08'), ESPERA)

    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    fireEvent.click(within(menu).getByRole('link', { name: 'Caixa' }))
    await screen.findByRole('heading', { name: 'Caixa', level: 1 }, ESPERA)
    fireEvent.click(within(menu).getByRole('link', { name: 'Relatório do dia' }))
    await screen.findByTestId('cartao-total-entregas', undefined, ESPERA)
    expect(screen.getByLabelText('Data')).toHaveValue('2026-11-08')
  })
})
