/** T009, parte B: erros de rede, tempo esgotado, sessão e mensagens. */
import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { criarQueryClient } from '@/app/queryClient'
import { server } from '@/test/msw/server'
import { configurarCliente, redefinirCliente, requisitar } from './client'
import { erroRespostaInvalida, parseErroApi } from './erros'

afterEach(() => {
  redefinirCliente()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** fetch que nunca responde, mas respeita o cancelamento, como um servidor travado. */
function servidorTravado() {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')))
      }),
  )
}

describe('tempo limite', () => {
  it('leitura sem resposta em 20 s vira erro tratado', async () => {
    servidorTravado()
    let erro: unknown = 'pendente'
    void requisitar({ caminho: '/api/lento' }).catch((e: unknown) => (erro = e))
    await vi.advanceTimersByTimeAsync(20_001)
    expect(erro).toMatchObject({ tipo: 'rede', mensagem: expect.stringMatching(/demorou/) })
  })

  it('escrita sem resposta manda conferir antes de repetir', async () => {
    servidorTravado()
    let erro: unknown = 'pendente'
    void requisitar({ metodo: 'POST', caminho: '/api/lento' }).catch((e: unknown) => (erro = e))
    await vi.advanceTimersByTimeAsync(20_001)
    expect(erro).toMatchObject({ mensagem: expect.stringMatching(/Confira/) })
  })
})

describe('401 no meio da sessão', () => {
  it('depois do refresh, o erro de negócio da repetição aparece e não derruba a sessão', async () => {
    let chamadas = 0
    server.use(
      http.post('*/api/teste-401', () => {
        chamadas++
        return chamadas === 1
          ? HttpResponse.json({ codigo: 'NAO_AUTENTICADO' }, { status: 401 })
          : HttpResponse.json({ codigo: 'LIMITE_LOTE_EXCEDIDO' }, { status: 422 })
      }),
    )
    const sair = vi.fn()
    configurarCliente({ tentarRefresh: () => Promise.resolve('novo'), aoNaoAutenticado: sair })
    await expect(
      requisitar({ metodo: 'POST', caminho: '/api/teste-401', schema: z.object({ ok: z.boolean() }) }),
    ).rejects.toMatchObject({ status: 422, codigo: 'LIMITE_LOTE_EXCEDIDO' })
    expect(sair).not.toHaveBeenCalled()
  })

  it('usuário trocou no meio: a escrita antiga não é repetida com o token do novo', async () => {
    let usuario = 'usuario-a'
    let chamadas = 0
    server.use(
      http.post('*/api/teste-troca', () => {
        chamadas++
        usuario = 'usuario-b'
        return HttpResponse.json({ codigo: 'NAO_AUTENTICADO' }, { status: 401 })
      }),
    )
    const sair = vi.fn()
    const refresh = vi.fn(() => Promise.resolve('token-b'))
    configurarCliente({ obterSessao: () => usuario, tentarRefresh: refresh, aoNaoAutenticado: sair })
    await expect(requisitar({ metodo: 'POST', caminho: '/api/teste-troca' })).rejects.toMatchObject({
      status: 401,
    })
    expect(chamadas).toBe(1)
    expect(refresh).not.toHaveBeenCalled()
    expect(sair).not.toHaveBeenCalled()
  })
})

describe('mensagens de erro', () => {
  it('regra de negócio genérica mostra a explicação do servidor', () => {
    const erro = parseErroApi(422, {
      codigo: 'REGRA_NEGOCIO_VIOLADA',
      message: 'O período informado é inválido.',
    })
    expect(erro.mensagem).toBe('O período informado é inválido.')
  })

  it.each([
    [409, 'DADO_DUPLICADO'],
    [503, 'ERRO_INTERNO_SERVIDOR'],
    [400, 'DADOS_INVALIDOS'],
  ])('%i %s usa a message do servidor (S013/S005)', (status, codigo) => {
    const erro = parseErroApi(status, { codigo, message: 'Explicação do servidor.' })
    expect(erro.mensagem).toBe('Explicação do servidor.')
  })

  it('mensagem com identificador interno fica com o texto do catálogo', () => {
    const erro = parseErroApi(422, {
      codigo: 'AJUSTE_VALOR_NAO_PERMITIDO',
      message: "vinculada ao recibo '1b2c3d4e-5f6a-4b7c-9d8e-9f0a1b2c3d4e'",
    })
    expect(erro.mensagem).toBe('O ajuste de repasse não é permitido para esta entrega.')
  })

  it.each([
    [400, 'No message available'],
    [405, "Method 'POST' is not supported."],
  ])('erro %i padrão do Spring (sem codigo) não mostra inglês', (status, message) => {
    const erro = parseErroApi(status, {
      timestamp: '2026-11-22T10:00:00Z',
      status,
      error: 'x',
      message,
      path: '/api',
    })
    expect(erro.mensagem).toBe('Não foi possível concluir a operação.')
  })

  it('um item ruim em campos[] não descarta o codigo nem os outros campos', () => {
    const erro = parseErroApi(400, {
      codigo: 'DADOS_INVALIDOS',
      campos: [
        { campo: 'motivo', mensagem: null },
        { campo: 'valorNovo', mensagem: 'inválido' },
      ],
    })
    expect(erro.codigo).toBe('DADOS_INVALIDOS')
    expect(erro.campos).toEqual([{ campo: 'valorNovo', mensagem: 'inválido' }])
  })

  it('resposta fora do schema não é repetida, porque o erro é determinístico', () => {
    const retry = criarQueryClient().getDefaultOptions().queries?.retry as (n: number, e: Error) => boolean
    expect(retry(0, erroRespostaInvalida(200, '/api/x'))).toBe(false)
  })
})
