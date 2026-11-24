/**
 * Handlers MSW para autenticacao (T007).
 * POST /api/auth/login e POST /api/auth/refresh.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api'
import { erroApi } from './respostas'

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

/** Token de refresh valido aceito pelo mock. */
export const REFRESH_TOKEN_VALIDO = 'refresh-token-valido'

export const handlersAuth = [
  http.post(`*${ENDPOINTS.auth.login}`, async ({ request }) => {
    const corpo = (await request.json()) as { loginEmail?: string; senha?: string }
    const email = corpo.loginEmail ?? ''
    const senha = corpo.senha ?? ''

    const usuario = USUARIOS_MOCK[email as keyof typeof USUARIOS_MOCK]
    if (!usuario) {
      return erroApi(request, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.')
    }

    // Verifica senha (todas as contas de teste usam 'senha123')
    if (senha !== 'senha123') {
      return erroApi(request, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.')
    }
    // Sem `canal`, o backend assume BACKOFFICE e recusa o entregador (UC07 E4).
    if (usuario.perfil === 'ENTREGADOR') {
      return erroApi(request, 403, 'ACESSO_NEGADO', 'Entregadores acessam o sistema apenas pelo aplicativo.')
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
      return erroApi(request, 401, 'NAO_AUTENTICADO', 'Sessão inválida ou expirada.')
    }

    return HttpResponse.json({
      token: 'jwt-renovado-mock',
      refreshToken: 'refresh-renovado-mock',
      usuario: USUARIOS_MOCK['operador@teste.com'],
    })
  }),
]
