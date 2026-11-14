import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useSessaoStore } from '@/features/auth'
import { requisitar } from '@/shared/api/client'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao, renderizarApp } from '@/test/sessao'

const erro = (status: number, codigo: string) =>
  HttpResponse.json(
    { timestamp: '2026-11-10T10:00:00', status, error: 'x', codigo, message: 'x', path: '/api/teste' },
    { status },
  )

beforeEach(() => redefinirSessao())

describe('cliente HTTP ligado a sessao', () => {
  it('envia o token da sessao em memoria', async () => {
    let autorizacao: string | null = null
    server.use(
      http.get('*/api/teste', ({ request }) => {
        autorizacao = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    entrarComo('OPERADOR', 'jwt-teste')
    renderizarApp('/despacho')
    await screen.findByRole('heading', { level: 1, name: 'Despacho' })
    await requisitar({ caminho: '/api/teste', schema: z.object({ ok: z.boolean() }) })
    expect(autorizacao).toBe('Bearer jwt-teste')
  })

  it('401 encerra a sessao e redireciona para /login', async () => {
    // Mock refresh para falhar tambem (token invalido)
    server.use(
      http.get('*/api/teste', () => erro(401, 'ACESSO_NEGADO')),
      http.post('*/api/auth/refresh', () => erro(401, 'CREDENCIAIS_INVALIDAS')),
    )
    entrarComo('OPERADOR', 'jwt-expirado')
    const { local } = renderizarApp('/despacho')
    await screen.findByRole('heading', { level: 1, name: 'Despacho' })

    await expect(requisitar({ caminho: '/api/teste' })).rejects.toMatchObject({ status: 401 })

    expect(useSessaoStore.getState().usuario).toBeNull()
    await waitFor(() => expect(local.pathname).toBe('/login'))
  })

  it('403 leva para /acesso-negado', async () => {
    server.use(http.get('*/api/teste', () => erro(403, 'ACESSO_NEGADO')))
    entrarComo('OPERADOR', 'jwt')
    const { local } = renderizarApp('/despacho')
    await screen.findByRole('heading', { level: 1, name: 'Despacho' })

    await expect(requisitar({ caminho: '/api/teste' })).rejects.toMatchObject({ status: 403 })

    await waitFor(() => expect(local.pathname).toBe('/acesso-negado'))
    expect(useSessaoStore.getState().usuario).not.toBeNull()
  })
})
