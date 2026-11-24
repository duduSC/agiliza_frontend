/**
 * T009, parte C: Acerto e Caixa pelo caminho de rede. O caixa que vale é o do dia da entrega
 * (ajuste), o do início do período (recibo, e nenhum dia fechado no meio: S013) e o do próprio
 * recibo (pagamento). Escritas de dinheiro sem otimismo e com trava de duplo clique.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { criarCaixaResponse } from '@/test/fabricas'
import { dbAcerto, IDS_ACERTO } from '@/test/msw/dadosAcerto'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const ESPERA = { timeout: 10_000 }

beforeEach(() => {
  redefinirSessao()
  entrarComo('OPERADOR')
})

async function filtrar(inicio = '2026-11-09', fim = '2026-11-09') {
  const app = renderizarApp('/acerto')
  await screen.findByRole('option', { name: 'Entregador Exemplo' }, ESPERA)
  fireEvent.change(screen.getByLabelText(/Selecionar entregador|^Entregador$/), {
    target: { value: IDS_ACERTO.motoboy },
  })
  fireEvent.change(screen.getByLabelText(/Data in[ií]cio/), { target: { value: inicio } })
  fireEvent.change(screen.getByLabelText('Data fim'), { target: { value: fim } })
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
  return app
}

async function extratoNaTela() {
  await screen.findByText(/^Total devido/, undefined, ESPERA)
  await screen.findByRole('heading', { name: 'Recibos' }, ESPERA)
}

function semAcoesDeCorrecao() {
  expect(screen.queryByRole('button', { name: /^Ajustar/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Gerar recibo' })).not.toBeInTheDocument()
}

function contar(metodo: 'post', caminho: string) {
  const envios = { total: 0 }
  server.use(
    http[metodo](caminho, () => {
      envios.total++
      return undefined
    }),
  )
  return envios
}

async function abrirGerarRecibo() {
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar recibo' }, ESPERA))
  return await screen.findByRole('button', { name: /^Confirmar gera/ }, ESPERA)
}

async function abrirAjuste() {
  fireEvent.click(await screen.findByRole('button', { name: /^Ajustar/ }, ESPERA))
  await screen.findByRole('dialog', undefined, ESPERA)
}

function preencherAjuste(valor: string, motivo: string) {
  fireEvent.change(screen.getByLabelText(/Novo valor/), { target: { value: valor } })
  fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: motivo } })
  return screen.getByRole('button', { name: 'Salvar ajuste' })
}

describe('caixa do período manda (5.2, 5.3)', () => {
  it('dia sem caixa: não oferece ajuste nem recibo e explica', async () => {
    dbAcerto.definirCaixaAtual(null)
    await filtrar()
    await extratoNaTela()
    expect(await screen.findByText(/não há caixa aberto em 09\/11\/2026/i, undefined, ESPERA)).toBeInTheDocument()
    semAcoesDeCorrecao()
  })

  it('período de dia fechado, mesmo com o caixa de hoje aberto: somente leitura', async () => {
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { finalizadaEm: '2026-11-08T14:30:00' })
    await filtrar('2026-11-08', '2026-11-08')
    await extratoNaTela()
    expect(await screen.findByText(/caixa de 08\/11\/2026 fechado/i, undefined, ESPERA)).toBeInTheDocument()
    semAcoesDeCorrecao()
  })

  it('período que alcança um dia fechado: manda encurtar o período (S013)', async () => {
    dbAcerto.inserirCaixa(
      criarCaixaResponse({
        id: 'ab777777-7777-4777-8777-777777777777',
        dataReferencia: '2026-11-10',
        status: 'FECHADO',
      }),
    )
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { finalizadaEm: '2026-11-10T10:00:00' })
    await filtrar('2026-11-09', '2026-11-10')
    await extratoNaTela()
    expect(await screen.findByText(/encurte o período/i, undefined, ESPERA)).toBeInTheDocument()
    semAcoesDeCorrecao()
  })

  it('recibo de caixa fechado não oferece "Marcar pago"', async () => {
    dbAcerto.atualizarRecibo(IDS_ACERTO.reciboPago, { status: 'GERADO', pagoEm: null })
    await filtrar()
    await extratoNaTela()
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Marcar pago/ })).toHaveLength(1), ESPERA)
  })

  it('situação do caixa ainda carregando: nenhuma ação (padrão restritivo)', async () => {
    server.use(http.get('*/api/caixas', () => delay('infinite')))
    await filtrar()
    await extratoNaTela()
    semAcoesDeCorrecao()
    expect(screen.queryByRole('button', { name: /^Marcar pago/ })).not.toBeInTheDocument()
  })

  it('falha ao ler o caixa: nenhuma ação e "Tentar novamente"', async () => {
    server.use(http.get('*/api/caixas', () => new HttpResponse(null, { status: 422 })))
    await filtrar()
    await extratoNaTela()
    expect(await screen.findByText(/não foi possível conferir o caixa/i, undefined, ESPERA)).toBeInTheDocument()
    semAcoesDeCorrecao()
  })

  it('caixa reaberto volta a permitir correção', async () => {
    dbAcerto.atualizarCaixa(dbAcerto.caixaAtual()!.id, { status: 'REABERTO' })
    await filtrar()
    expect(await screen.findByRole('button', { name: /^Ajustar/ }, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar recibo' })).toBeInTheDocument()
  })

  it('entrega em recibo não tem ajuste: diz qual recibo e o caminho (8.4)', async () => {
    await filtrar()
    const linha = (await screen.findByText('Bruno Lima', undefined, ESPERA)).closest('tr')!
    expect(within(linha).queryByRole('button')).not.toBeInTheDocument()
    expect(linha).toHaveTextContent(/recibo #dd444444.*cancele/i)
  })
})

describe('filtro', () => {
  it('fim antes do início é barrado no formulário', async () => {
    await filtrar('2026-11-09', '2026-11-08')
    expect(await screen.findByText(/data final não pode ser anterior/i, undefined, ESPERA)).toBeInTheDocument()
  })

  it('o período vai até o último microssegundo do dia', async () => {
    let fim: string | null = null
    server.use(
      http.get('*/api/acertos', ({ request }) => {
        fim = new URL(request.url).searchParams.get('fim')
        return undefined
      }),
    )
    await filtrar()
    await extratoNaTela()
    expect(fim).toBe('2026-11-09T23:59:59.999999')
  })
})

describe('gerar recibo', () => {
  it('duplo clique envia um POST e avisa com o total devolvido pelo servidor', async () => {
    const envios = contar('post', '*/api/recibos')
    await filtrar()
    const confirmar = await abrirGerarRecibo()
    await waitFor(() => expect(confirmar).toBeEnabled(), ESPERA)
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(await screen.findByText(/recibo gerado: 1 entrega.*9,00/i, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(1)
  })

  it('valor indefinido bloqueia o recibo inteiro, como o backend, e marca o total como parcial', async () => {
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { valorRepasse: null, foraDeArea: true })
    await filtrar()
    expect(await screen.findByText(/total devido \(parcial\)/i, undefined, ESPERA)).toBeInTheDocument()
    const confirmar = await abrirGerarRecibo()
    expect(await screen.findByText(/o recibo não pode ser gerado/i, undefined, ESPERA)).toBeInTheDocument()
    expect(confirmar).toBeDisabled()
  })

  it('a prévia é relida ao abrir o diálogo', async () => {
    await filtrar()
    await screen.findByRole('button', { name: 'Gerar recibo' }, ESPERA)
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { valorRepasse: 12.5 })
    await abrirGerarRecibo()
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('12,50'), ESPERA)
  })
})

describe('marcar pago', () => {
  it('duplo clique envia um POST e avisa', async () => {
    const envios = contar('post', '*/api/recibos/:id/pagar')
    await filtrar()
    const pagar = await screen.findByRole('button', { name: /^Marcar pago/ }, ESPERA)
    fireEvent.click(pagar)
    fireEvent.click(pagar)
    expect(await screen.findByText(/recibo marcado como pago/i, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(1)
  })

  it('recusa do servidor aparece', async () => {
    server.use(
      http.post('*/api/recibos/:id/pagar', () => HttpResponse.json({ codigo: 'CAIXA_FECHADO' }, { status: 422 })),
    )
    await filtrar()
    fireEvent.click(await screen.findByRole('button', { name: /^Marcar pago/ }, ESPERA))
    expect(
      await screen.findByText(/caixa deste período está fechado; não é possível alterar/i, undefined, ESPERA),
    ).toBeInTheDocument()
  })

  it('sem otimismo: o status só muda com a resposta', async () => {
    server.use(http.post('*/api/recibos/:id/pagar', () => delay('infinite')))
    await filtrar()
    fireEvent.click(await screen.findByRole('button', { name: /^Marcar pago/ }, ESPERA))
    expect(await screen.findByText(/^Pagando/, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByText('Gerado')).toBeInTheDocument()
  })
})

describe('ajuste de repasse', () => {
  it('aceita vírgula, trava o duplo clique e avisa', async () => {
    const envios = contar('post', '*/api/entregas/:id/ajustes')
    await filtrar()
    await abrirAjuste()
    const salvar = preencherAjuste('11,50', 'Desvio por obra')
    fireEvent.click(salvar)
    fireEvent.click(salvar)
    expect(await screen.findByText(/repasse ajustado para.*11,50/i, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(1)
  })

  it.each([
    ['motivo acima de 255', '11', 'x'.repeat(256), /no máximo 255/i],
    ['valor igual ao atual', '9', 'motivo', /diferente do valor atual/i],
    ['mais de 2 decimais', '9.999', 'motivo', /até 2 casas/i],
  ])('%s é barrado antes de enviar', async (_caso, valor, motivo, mensagem) => {
    const envios = contar('post', '*/api/entregas/:id/ajustes')
    await filtrar()
    await abrirAjuste()
    fireEvent.click(preencherAjuste(valor, motivo))
    expect(await screen.findByText(mensagem, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(0)
  })

  it('campos[] do servidor vão para o campo', async () => {
    server.use(
      http.post('*/api/entregas/:id/ajustes', () =>
        HttpResponse.json(
          { codigo: 'DADOS_INVALIDOS', campos: [{ campo: 'motivo', mensagem: 'motivo recusado' }] },
          { status: 400 },
        ),
      ),
    )
    await filtrar()
    await abrirAjuste()
    fireEvent.click(preencherAjuste('11', 'motivo'))
    await waitFor(
      () => expect(screen.getByLabelText(/^Motivo/)).toHaveAccessibleDescription('motivo recusado'),
      ESPERA,
    )
  })

  it('não fecha no meio do envio', async () => {
    server.use(http.post('*/api/entregas/:id/ajustes', () => delay('infinite')))
    await filtrar()
    await abrirAjuste()
    fireEvent.click(preencherAjuste('11', 'motivo'))
    await screen.findByText(/^Salvando/, undefined, ESPERA)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('falha no histórico aparece, com nova tentativa', async () => {
    server.use(http.get('*/api/entregas/:id/ajustes', () => new HttpResponse(null, { status: 422 })))
    await filtrar()
    await abrirAjuste()
    const dialogo = screen.getByRole('dialog')
    expect(await within(dialogo).findByRole('button', { name: 'Tentar novamente' }, ESPERA)).toBeInTheDocument()
  })
})

describe('caixa', () => {
  async function abrirFechamento() {
    renderizarApp('/caixa')
    fireEvent.click(await screen.findByRole('button', { name: 'Fechar caixa' }, ESPERA))
    return await screen.findByRole('button', { name: 'Confirmar fechamento' }, ESPERA)
  }

  it('fechar exige digitar FECHAR e avisa que recibo não pago fica preso', async () => {
    const confirmar = await abrirFechamento()
    expect(confirmar).toBeDisabled()
    expect(screen.getByRole('dialog')).toHaveTextContent(/não pagos/i)
    fireEvent.change(screen.getByLabelText(/digite fechar/i), { target: { value: 'fechar' } })
    expect(confirmar).toBeEnabled()
  })

  it('duplo clique fecha uma vez e avisa', async () => {
    const envios = contar('post', '*/api/caixas/:id/fechar')
    const confirmar = await abrirFechamento()
    const campo = screen.queryByLabelText(/digite fechar/i)
    if (campo) fireEvent.change(campo, { target: { value: 'FECHAR' } })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(await screen.findByText(/caixa fechado com sucesso/i, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(1)
  })

  it('recusa ao fechar aparece DENTRO do diálogo, não atrás dele', async () => {
    server.use(
      http.post('*/api/caixas/:id/fechar', () => HttpResponse.json({ codigo: 'CAIXA_FECHADO' }, { status: 422 })),
    )
    const confirmar = await abrirFechamento()
    const campo = screen.queryByLabelText(/digite fechar/i)
    if (campo) fireEvent.change(campo, { target: { value: 'FECHAR' } })
    fireEvent.click(confirmar)
    const dialogo = screen.getByRole('dialog')
    expect(await within(dialogo).findByRole('alert', undefined, ESPERA)).toHaveTextContent(/fechado/i)
  })

  it('duplo clique em abrir cria um caixa só', async () => {
    dbAcerto.definirCaixaAtual(null)
    const envios = contar('post', '*/api/caixas')
    renderizarApp('/caixa')
    const abrir = await screen.findByRole('button', { name: 'Abrir caixa do dia' }, ESPERA)
    fireEvent.click(abrir)
    fireEvent.click(abrir)
    expect(await screen.findByText(/caixa aberto com sucesso/i, undefined, ESPERA)).toBeInTheDocument()
    expect(envios.total).toBe(1)
  })
})

describe('total sem valor definido nunca parece R$ 0,00 (5.1)', () => {
  it('em revisão só com valor nulo mostra "—"', async () => {
    await filtrar()
    await extratoNaTela()
    const cartao = screen.getByText(/^Em revisão/, { selector: 'p' }).parentElement!
    expect(cartao).toHaveTextContent('—')
    expect(cartao).not.toHaveTextContent('R$')
  })

  it('total devido e prévia do recibo só com valor nulo mostram "—"', async () => {
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { valorRepasse: null, foraDeArea: true })
    await filtrar()
    const cartao = (await screen.findByText(/^Total devido/, undefined, ESPERA)).parentElement!
    expect(cartao).not.toHaveTextContent('R$')
    await abrirGerarRecibo()
    await waitFor(() => expect(screen.getByRole('dialog')).not.toHaveTextContent('R$ 0,00'), ESPERA)
    expect(screen.getByRole('dialog').textContent).not.toMatch(/R\$\s0,00/)
  })
})

describe('passada adversarial', () => {
  it('filtrar de novo com os mesmos dados relê o extrato', async () => {
    await filtrar()
    await extratoNaTela()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Filtrar' })).toBeEnabled(), ESPERA)
    dbAcerto.atualizarFinalizada(IDS_ACERTO.entregaSemRecibo, { valorRepasse: 14.25 })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    await waitFor(() => expect(screen.getAllByText(/14,25/).length).toBeGreaterThan(0), { timeout: 3000 })
  })
})
