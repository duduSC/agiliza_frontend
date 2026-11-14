/**
 * Handlers MSW para autenticacao (T007).
 * POST /api/auth/login e POST /api/auth/refresh.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api'

/** Credenciais validas aceitas pelo mock. */
export const CREDENCIAIS_VALIDAS = {
  operador: { loginEmail: 'operador@teste.com', senha: 'senha123' },
  adminRestaurante: { loginEmail: 'admin@loja.com', senha: 'senha123' },
  adminGeral: { loginEmail: 'admin@agiliza.com', senha: 'senha123' },
  entregador: { loginEmail: 'motoboy@teste.com', senha: 'senha123' },
} as const

const USUARIOS_MOCK = {
  'operador@teste.com': {
    usuarioId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
    estabelecimentoId: 'a1b2c3d4-0001-4a00-8a00-00000000d001',
    motoboyId: null,
    nome: 'Operador (teste)',
    perfil: 'OPERADOR' as const,
  },
  'admin@loja.com': {
    usuarioId: 'b1b2c3d4-0002-4b00-8b00-00000000e002',
    estabelecimentoId: 'a1b2c3d4-0001-4a00-8a00-00000000d001',
    motoboyId: null,
    nome: 'Admin da Loja (teste)',
    perfil: 'ADMIN_RESTAURANTE' as const,
  },
  'admin@agiliza.com': {
    usuarioId: 'b1b2c3d4-0001-4b00-8b00-00000000e001',
    estabelecimentoId: null,
    motoboyId: null,
    nome: 'Admin Geral (teste)',
    perfil: 'ADMIN_GERAL' as const,
  },
  'motoboy@teste.com': {
    usuarioId: 'b1b2c3d4-0004-4b00-8b00-00000000e004',
    estabelecimentoId: 'a1b2c3d4-0001-4a00-8a00-00000000d001',
    motoboyId: 'c1b2c3d4-0001-4c00-8c00-00000000f001',
    nome: 'Entregador (teste)',
    perfil: 'ENTREGADOR' as const,
  },
} as const

function erroApi(status: number, codigo: string, message: string) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      error: status === 401 ? 'Unauthorized' : 'Forbidden',
      codigo,
      message,
      path: '/api/auth/login',
    },
    { status },
  )
}

/** Token de refresh valido aceito pelo mock. */
export const REFRESH_TOKEN_VALIDO = 'refresh-token-valido'

export const handlersAuth = [
  http.post(`*${ENDPOINTS.auth.login}`, async ({ request }) => {
    const corpo = (await request.json()) as { loginEmail?: string; senha?: string }
    const email = corpo.loginEmail ?? ''
    const senha = corpo.senha ?? ''

    const usuario = USUARIOS_MOCK[email as keyof typeof USUARIOS_MOCK]
    if (!usuario) {
      return erroApi(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.')
    }

    // Verifica senha (todas as contas de teste usam 'senha123')
    if (senha !== 'senha123') {
      return erroApi(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.')
    }

    return HttpResponse.json({
      token: `jwt-${usuario.perfil.toLowerCase()}-mock`,
      refreshToken: REFRESH_TOKEN_VALIDO,
      usuario,
    })
  }),

  http.post(`*${ENDPOINTS.auth.refresh}`, async ({ request }) => {
    const corpo = (await request.json()) as { refreshToken?: string }
    if (corpo.refreshToken !== REFRESH_TOKEN_VALIDO) {
      return erroApi(401, 'CREDENCIAIS_INVALIDAS', 'Refresh token invalido.')
    }

    return HttpResponse.json({
      token: 'jwt-renovado-mock',
      refreshToken: 'refresh-renovado-mock',
      usuario: USUARIOS_MOCK['operador@teste.com'],
    })
  }),
]
