/**
 * T009 — caminho de rede real nos testes.
 *
 * O TanStack Query passa um `AbortSignal` criado pelo `AbortController` do jsdom. O `fetch` e o
 * `Request` do Node (usados pelo MSW) só aceitam o `AbortSignal` do próprio Node e recusavam o do
 * jsdom: toda consulta de tela falhava como erro de rede. Por isso os testes anteriores
 * pré-populavam o cache e nunca exercitavam cliente HTTP + MSW + schema Zod nas leituras.
 *
 * Estes testes garantem o adaptador de `test/setup.ts`: a requisição com sinal do jsdom chega ao
 * MSW, e o cancelamento continua rejeitando com `AbortError`, como no navegador.
 */
import { http, HttpResponse, delay } from 'msw'
import { z } from 'zod'
import { requisitar } from '@/shared/api/client'
import { ErroApi } from '@/shared/api/erros'
import { server } from '@/test/msw/server'

describe('adaptador de AbortSignal (jsdom x Node) nos testes', () => {
  it('requisição com o sinal do jsdom chega ao MSW e passa pelo schema', async () => {
    server.use(http.get('*/api/teste-sinal', () => HttpResponse.json({ ok: true })))
    const controle = new AbortController()
    const resposta = await requisitar({
      caminho: '/api/teste-sinal',
      schema: z.object({ ok: z.boolean() }),
      signal: controle.signal,
    })
    expect(resposta).toEqual({ ok: true })
  })

  it('cancelar no meio da requisição rejeita com AbortError, não com erro de rede', async () => {
    server.use(
      http.get('*/api/teste-sinal-lento', async () => {
        await delay(2_000)
        return HttpResponse.json({ ok: true })
      }),
    )
    const controle = new AbortController()
    const promessa = requisitar({
      caminho: '/api/teste-sinal-lento',
      schema: z.object({ ok: z.boolean() }),
      signal: controle.signal,
    })
    controle.abort()
    const erro: unknown = await promessa.catch((e: unknown) => e)
    expect(erro).not.toBeInstanceOf(ErroApi)
    expect((erro as { name?: string }).name).toBe('AbortError')
  })
})
