/**
 * T010, item 1: ação na entrega em revisão, pelo caminho de rede (MSW no contrato da develop do
 * backend: `POST /api/entregas/{id}/revisao/resolver` e `PATCH /api/entregas/{id}/coordenada`).
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { criarCaixaResponse } from '@/test/fabricas'
import { dbAcerto } from '@/test/msw/dadosAcerto'
import { dbEntregas, IDS_ENTREGAS } from '@/test/msw/dadosEntregas'
import { erroApi } from '@/test/msw/respostas'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const ESPERA = { timeout: 10_000 }

beforeEach(() => {
  redefinirSessao()
  entrarComo('OPERADOR')
})

function capturarCorpo(caminho: string) {
  const corpos: unknown[] = []
  server.use(
    http.post(caminho, async ({ request }) => {
      corpos.push(await request.clone().json())
      return undefined // segue para o handler normal
    }),
  )
  return corpos
}

async function cartaoDe(id: string) {
  renderizarApp('/despacho')
  return screen.findByTestId(`revisao-${id}`, undefined, ESPERA)
}

async function abrirAnalise() {
  const cartao = await cartaoDe(IDS_ENTREGAS.revisaoContestacao)
  fireEvent.click(within(cartao).getByRole('button', { name: /analisar contestação/i }))
  return screen.findByRole('dialog', undefined, ESPERA)
}

describe('analisar contestação (CONTESTACAO_ENTREGADOR)', () => {
  it('a ação aparece só na entrega contestada', async () => {
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoContestacao)
    expect(within(cartao).getByRole('button', { name: /analisar contestação/i })).toBeInTheDocument()
    const semDistancia = screen.getByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`)
    expect(within(semDistancia).queryByRole('button', { name: /analisar contestação/i })).not.toBeInTheDocument()
  })

  it('mostra o valor atual vindo do servidor', async () => {
    const dialogo = await abrirAnalise()
    expect(await within(dialogo).findByTestId('valor-atual-contestacao', undefined, ESPERA)).toHaveTextContent(
      /R\$\s*10,00/,
    )
  })

  it('valor atual nulo aparece como "—", nunca R$ 0,00', async () => {
    dbEntregas.atualizar(IDS_ENTREGAS.revisaoContestacao, { valorRepasse: null })
    const dialogo = await abrirAnalise()
    const valor = await within(dialogo).findByTestId('valor-atual-contestacao', undefined, ESPERA)
    expect(valor).toHaveTextContent('—')
    expect(valor).not.toHaveTextContent('R$')
  })

  it('manter o valor exige motivo', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    const dialogo = await abrirAnalise()
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Confirmar análise' }, ESPERA))
    expect(await within(dialogo).findByText('O motivo é obrigatório.')).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it('manter o valor envia só o motivo e tira a entrega da revisão', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    const dialogo = await abrirAnalise()
    fireEvent.change(await within(dialogo).findByLabelText(/^Motivo/, undefined, ESPERA), {
      target: { value: 'Faixa conferida' },
    })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await screen.findByText(/Fábio Nunes resolvida: valor mantido/, undefined, ESPERA)).toBeInTheDocument()
    expect(corpos).toEqual([{ motivo: 'Faixa conferida' }])
    await waitFor(
      () => expect(screen.queryByTestId(`revisao-${IDS_ENTREGAS.revisaoContestacao}`)).not.toBeInTheDocument(),
      ESPERA,
    )
    expect(dbEntregas.buscar(IDS_ENTREGAS.revisaoContestacao)?.pendenteRevisao).toBe(false)
  })

  it('ajustar envia o valor novo com 2 casas e o motivo', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    const dialogo = await abrirAnalise()
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /ajustar/i }, ESPERA))
    fireEvent.change(within(dialogo).getByLabelText(/novo valor/i), { target: { value: '12,5' } })
    fireEvent.change(within(dialogo).getByLabelText(/^Motivo/), { target: { value: 'Faixa errada' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await screen.findByText(/repasse ajustado para R\$\s*12,50/, undefined, ESPERA)).toBeInTheDocument()
    expect(corpos).toEqual([{ valorRepasse: 12.5, motivo: 'Faixa errada' }])
    expect(dbEntregas.buscar(IDS_ENTREGAS.revisaoContestacao)?.valorRepasse).toBe(12.5)
  })

  it('ajustar para o mesmo valor é recusado antes de enviar', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    const dialogo = await abrirAnalise()
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /ajustar/i }, ESPERA))
    fireEvent.change(within(dialogo).getByLabelText(/novo valor/i), { target: { value: '10,00' } })
    fireEvent.change(within(dialogo).getByLabelText(/^Motivo/), { target: { value: 'x' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await within(dialogo).findByText(/diferente do atual/)).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it('valor inválido é recusado antes de enviar', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    const dialogo = await abrirAnalise()
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /ajustar/i }, ESPERA))
    fireEvent.change(within(dialogo).getByLabelText(/novo valor/i), { target: { value: '-3' } })
    fireEvent.change(within(dialogo).getByLabelText(/^Motivo/), { target: { value: 'x' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await within(dialogo).findByText(/valor válido/)).toBeInTheDocument()
    expect(corpos).toHaveLength(0)
  })

  it('caixa do dia fechado: não oferece nenhuma saída e explica', async () => {
    dbAcerto.atualizarCaixa(criarCaixaResponse().id, { status: 'FECHADO' })
    const dialogo = await abrirAnalise()
    expect(await within(dialogo).findByText(/caixa do dia desta entrega está fechado/i, undefined, ESPERA)).toBeVisible()
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar análise' })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('radio')).not.toBeInTheDocument()
  })

  it('sem caixa no dia da entrega: não oferece nenhuma saída e explica', async () => {
    dbAcerto.definirCaixaAtual(null)
    const dialogo = await abrirAnalise()
    expect(await within(dialogo).findByText(/não há caixa aberto para o dia/i, undefined, ESPERA)).toBeVisible()
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar análise' })).not.toBeInTheDocument()
  })

  it('erro ao conferir o caixa mostra erro com nova tentativa, e não "conferindo" para sempre', async () => {
    server.use(http.get('*/api/caixas', () => new HttpResponse(null, { status: 503 })))
    const dialogo = await abrirAnalise()
    expect(
      await within(dialogo).findByRole('button', { name: /tentar novamente/i }, { timeout: 20_000 }),
    ).toBeInTheDocument()
    expect(within(dialogo).queryByText(/conferindo/i)).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar análise' })).not.toBeInTheDocument()
  }, 30_000)

  it('entrega sem finalizadaEm usa o caixa de hoje, como o backend', async () => {
    dbEntregas.atualizar(IDS_ENTREGAS.revisaoContestacao, { finalizadaEm: null })
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    dbAcerto.definirCaixaAtual(criarCaixaResponse({ dataReferencia: hoje }))
    const dialogo = await abrirAnalise()
    expect(await within(dialogo).findByRole('button', { name: 'Confirmar análise' }, ESPERA)).toBeInTheDocument()
  })

  it('entrega em recibo: só "manter"; o ajuste pede cancelar o recibo antes', async () => {
    dbEntregas.atualizar(IDS_ENTREGAS.revisaoContestacao, { reciboId: 'dd444444-4444-4444-8444-444444444444' })
    const dialogo = await abrirAnalise()
    expect(await within(dialogo).findByRole('radio', { name: /ajustar/i }, ESPERA)).toBeDisabled()
    expect(within(dialogo).getByText(/cancele o recibo/i)).toBeInTheDocument()
    expect(within(dialogo).getByRole('radio', { name: /manter/i })).toBeEnabled()
  })

  it('recusa AJUSTE_VALOR_NAO_PERMITIDO do servidor (entrega em recibo) vira mensagem clara', async () => {
    server.use(
      http.post('*/api/entregas/:id/revisao/resolver', ({ request }) =>
        erroApi(
          request,
          422,
          'AJUSTE_VALOR_NAO_PERMITIDO',
          "Ajuste manual de repasse não permitido: a entrega está vinculada ao recibo 'dd444444-4444-4444-8444-444444444444'; cancele o recibo antes de ajustar o valor e gere um novo acerto em seguida.",
        ),
      ),
    )
    const dialogo = await abrirAnalise()
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /ajustar/i }, ESPERA))
    fireEvent.change(within(dialogo).getByLabelText(/novo valor/i), { target: { value: '12' } })
    fireEvent.change(within(dialogo).getByLabelText(/^Motivo/), { target: { value: 'x' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await within(dialogo).findByRole('alert', undefined, ESPERA)).toHaveTextContent(
      /está em um recibo.*cancele o recibo/i,
    )
  })

  it('recusa CAIXA_FECHADO do servidor vira mensagem clara', async () => {
    server.use(
      http.post('*/api/entregas/:id/revisao/resolver', ({ request }) =>
        erroApi(
          request,
          422,
          'CAIXA_FECHADO',
          "Operação 'resolver a revisão da entrega' não permitida: o caixa do período de operação já está fechado.",
        ),
      ),
    )
    const dialogo = await abrirAnalise()
    fireEvent.change(await within(dialogo).findByLabelText(/^Motivo/, undefined, ESPERA), { target: { value: 'x' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await within(dialogo).findByRole('alert', undefined, ESPERA)).toHaveTextContent(
      /caixa do dia desta entrega está fechado/i,
    )
  })

  it('recusa de outro motivo mostra a mensagem do servidor', async () => {
    server.use(
      http.post('*/api/entregas/:id/revisao/resolver', ({ request }) =>
        erroApi(request, 422, 'REGRA_NEGOCIO_VIOLADA', 'A entrega não possui revisão pendente.'),
      ),
    )
    const dialogo = await abrirAnalise()
    fireEvent.change(await within(dialogo).findByLabelText(/^Motivo/, undefined, ESPERA), { target: { value: 'x' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar análise' }))
    expect(await within(dialogo).findByRole('alert', undefined, ESPERA)).toHaveTextContent(
      'A entrega não possui revisão pendente.',
    )
  })

  it('duplo clique em "Confirmar análise" envia um único POST e mostra "Enviando…"', async () => {
    const corpos = capturarCorpo('*/api/entregas/:id/revisao/resolver')
    server.use(
      http.post('*/api/entregas/:id/revisao/resolver', async () => {
        await delay(200)
        return undefined
      }),
    )
    const dialogo = await abrirAnalise()
    fireEvent.change(await within(dialogo).findByLabelText(/^Motivo/, undefined, ESPERA), { target: { value: 'ok' } })
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar análise' })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(await within(dialogo).findByRole('button', { name: 'Enviando…' })).toBeDisabled()
    await screen.findByText(/valor mantido/, undefined, ESPERA)
    expect(corpos).toHaveLength(1)
  })
})

describe('reposicionar pino (SEM_DISTANCIA e SEM_COORDENADA)', () => {
  it('SEM_DISTANCIA oferece "Reposicionar pino" com a coordenada atual preenchida', async () => {
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoSemDistancia)
    fireEvent.click(within(cartao).getByRole('button', { name: /reposicionar pino/i }))
    expect(within(cartao).getByLabelText(/^Latitude/)).toHaveValue('-23.58')
    expect(within(cartao).getByLabelText(/^Longitude/)).toHaveValue('-46.66')
  })

  it('SEM_DISTANCIA reposicionado sai da revisão e informa a distância recalculada', async () => {
    let corpo: unknown = null
    server.use(
      http.patch('*/api/entregas/:id/coordenada', async ({ request }) => {
        corpo = await request.clone().json()
        return undefined
      }),
    )
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoSemDistancia)
    fireEvent.click(within(cartao).getByRole('button', { name: /reposicionar pino/i }))
    fireEvent.change(within(cartao).getByLabelText(/^Latitude/), { target: { value: '-23,581' } })
    fireEvent.click(within(cartao).getByRole('button', { name: 'Salvar coordenada' }))
    expect(await screen.findByText(/Elisa Rocha enviada.*3,5 km/, undefined, ESPERA)).toBeInTheDocument()
    expect(corpo).toEqual({ latitude: -23.581, longitude: -46.66 })
    await waitFor(
      () => expect(screen.queryByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`)).not.toBeInTheDocument(),
      ESPERA,
    )
  })

  it('se o servidor ainda não calcular a distância, avisa que continua em revisão', async () => {
    server.use(
      http.patch('*/api/entregas/:id/coordenada', async ({ params, request }) => {
        const { latitude, longitude } = (await request.json()) as { latitude: number; longitude: number }
        return HttpResponse.json(
          dbEntregas.atualizar(params.id as string, { coordenada: { latitude, longitude } }),
        )
      }),
    )
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoSemDistancia)
    fireEvent.click(within(cartao).getByRole('button', { name: /reposicionar pino/i }))
    fireEvent.click(within(cartao).getByRole('button', { name: 'Salvar coordenada' }))
    expect(await screen.findByText(/ainda não pôde ser calculada/i, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(/Elisa Rocha enviada/)).not.toBeInTheDocument()
  })

  it('recusa do servidor ao reposicionar aparece no cartão', async () => {
    server.use(
      http.patch('*/api/entregas/:id/coordenada', ({ request }) =>
        erroApi(request, 422, 'REGRA_NEGOCIO_VIOLADA', 'Não é possível reposicionar uma entrega já finalizada.'),
      ),
    )
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoSemDistancia)
    fireEvent.click(within(cartao).getByRole('button', { name: /reposicionar pino/i }))
    fireEvent.click(within(cartao).getByRole('button', { name: 'Salvar coordenada' }))
    expect(await within(cartao).findByRole('alert', undefined, ESPERA)).toHaveTextContent(
      'Não é possível reposicionar uma entrega já finalizada.',
    )
  })

  it('o pino da entrega SEM_DISTANCIA aparece no mapa para ser arrastado', async () => {
    renderizarApp('/despacho')
    await screen.findByTestId(`revisao-${IDS_ENTREGAS.revisaoSemDistancia}`, undefined, ESPERA)
    await waitFor(() => {
      const pinos = screen.getAllByTestId('pino-mapa')
      expect(pinos.some((p) => p.title === 'Em revisão: entrega de Elisa Rocha')).toBe(true)
    }, ESPERA)
  })

  it('arrastar o pino SEM_DISTANCIA envia a coordenada e avisa, mesmo saindo da revisão', async () => {
    let corpo: unknown = null
    server.use(
      http.patch('*/api/entregas/:id/coordenada', async ({ request }) => {
        corpo = await request.clone().json()
        return undefined
      }),
    )
    renderizarApp('/despacho')
    const pino = await waitFor(() => {
      const achado = screen.getAllByTestId('pino-mapa').find((p) => p.title === 'Em revisão: entrega de Elisa Rocha')
      expect(achado).toBeDefined()
      return achado!
    }, ESPERA)
    fireEvent.dragEnd(pino)
    expect(await screen.findByText(/Elisa Rocha enviada.*3,5 km/, undefined, ESPERA)).toBeInTheDocument()
    expect(corpo).toEqual({ latitude: -23.579, longitude: -46.659 })
  })

  it('SEM_COORDENADA continua com o formulário à mostra (não tem pino no mapa)', async () => {
    const cartao = await cartaoDe(IDS_ENTREGAS.revisaoSemCoordenada)
    expect(within(cartao).getByLabelText(/^Latitude/)).toHaveValue('')
  })
})
