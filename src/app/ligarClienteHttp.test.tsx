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

describe('cliente HTTP ligado à sessão', () => {
  it('envia o token da sessão em memória', async () => {
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

  it('401 encerra a sessão e mostra "Sem sessão"', async () => {
    server.use(http.get('*/api/teste', () => erro(401, 'ACESSO_NEGADO')))
    entrarComo('OPERADOR', 'jwt-expirado')
    renderizarApp('/despacho')
    await screen.findByRole('heading', { level: 1, name: 'Despacho' })

    await expect(requisitar({ caminho: '/api/teste' })).rejects.toMatchObject({ status: 401 })

    expect(useSessaoStore.getState().usuario).toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: 'Sem sessão' })).toBeInTheDocument()
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
