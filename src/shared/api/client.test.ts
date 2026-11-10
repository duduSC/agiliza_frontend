import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { configurarCliente, montarUrl, redefinirCliente, requisitar } from './client'
import { ENDPOINTS } from './endpoints'
import { ErroApi } from './erros'
import { caixaResponseSchema } from './schemas'

afterEach(() => redefinirCliente())

describe('cliente HTTP', () => {
  it('valida a resposta com Zod (handler MSW de exemplo)', async () => {
    const caixa = await requisitar({ caminho: ENDPOINTS.caixas.atual, schema: caixaResponseSchema })
    expect(caixa.status).toBe('ABERTO')
  })

  it('injeta Authorization: Bearer a partir do token em memória', async () => {
    let cabecalho: string | null = null
    server.use(
      http.get(`*${ENDPOINTS.caixas.atual}`, ({ request }) => {
        cabecalho = request.headers.get('Authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    configurarCliente({ obterToken: () => 'token-de-teste' })
    await requisitar({ caminho: ENDPOINTS.caixas.atual })
    expect(cabecalho).toBe('Bearer token-de-teste')
  })

  it('sem token, não envia Authorization', async () => {
    let cabecalho: string | null = 'x'
    server.use(
      http.get(`*${ENDPOINTS.caixas.atual}`, ({ request }) => {
        cabecalho = request.headers.get('Authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await requisitar({ caminho: ENDPOINTS.caixas.atual })
    expect(cabecalho).toBeNull()
  })

  it('401 aciona aoNaoAutenticado e lança ErroApi', async () => {
    server.use(
      http.get(`*${ENDPOINTS.caixas.atual}`, () =>
        HttpResponse.json({ status: 401, codigo: 'ACESSO_NEGADO' }, { status: 401 }),
      ),
    )
    const aoNaoAutenticado = vi.fn()
    configurarCliente({ aoNaoAutenticado })
    await expect(requisitar({ caminho: ENDPOINTS.caixas.atual })).rejects.toBeInstanceOf(ErroApi)
    expect(aoNaoAutenticado).toHaveBeenCalledTimes(1)
  })

  it('401 com tratarAutenticacaoGlobal=false não aciona o callback (tela de login)', async () => {
    server.use(
      http.post(`*${ENDPOINTS.auth.login}`, () =>
        HttpResponse.json({ status: 401, codigo: 'CREDENCIAIS_INVALIDAS' }, { status: 401 }),
      ),
    )
    const aoNaoAutenticado = vi.fn()
    configurarCliente({ aoNaoAutenticado })
    const promessa = requisitar({
      metodo: 'POST',
      caminho: ENDPOINTS.auth.login,
      corpo: { loginEmail: 'a@b.com', senha: 'x' },
      tratarAutenticacaoGlobal: false,
    })
    await expect(promessa).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })
    expect(aoNaoAutenticado).not.toHaveBeenCalled()
  })

  it('403 aciona aoAcessoNegado', async () => {
    server.use(
      http.get(`*${ENDPOINTS.caixas.atual}`, () =>
        HttpResponse.json({ status: 403, codigo: 'ACESSO_NEGADO' }, { status: 403 }),
      ),
    )
    const aoAcessoNegado = vi.fn()
    configurarCliente({ aoAcessoNegado })
    await expect(requisitar({ caminho: ENDPOINTS.caixas.atual })).rejects.toMatchObject({
      status: 403,
      codigo: 'ACESSO_NEGADO',
    })
    expect(aoAcessoNegado).toHaveBeenCalledTimes(1)
  })

  it('resposta fora do contrato vira ErroApi do tipo resposta_invalida', async () => {
    server.use(
      http.get(`*${ENDPOINTS.caixas.atual}`, () => HttpResponse.json({ status: 'QUALQUER' })),
    )
    await expect(
      requisitar({ caminho: ENDPOINTS.caixas.atual, schema: caixaResponseSchema }),
    ).rejects.toMatchObject({ tipo: 'resposta_invalida' })
  })

  it('repassa o AbortSignal (requisição cancelada não vira ErroApi)', async () => {
    const controle = new AbortController()
    controle.abort()
    await expect(
      requisitar({ caminho: ENDPOINTS.caixas.atual, signal: controle.signal }),
    ).rejects.not.toBeInstanceOf(ErroApi)
  })

  it('montarUrl ignora parâmetros vazios', () => {
    const url = new URL(montarUrl('/api/entregas', { status: 'AGUARDANDO_DESPACHO', bairro: '' }))
    expect(url.pathname).toBe('/api/entregas')
    expect(url.searchParams.get('status')).toBe('AGUARDANDO_DESPACHO')
    expect(url.searchParams.has('bairro')).toBe(false)
  })
})
