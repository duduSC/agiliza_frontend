/**
 * Chamadas de rede de autenticacao (UC07, T007).
 * Endpoints confirmados pelo backend (S006).
 *
 * O login usa `tratarAutenticacaoGlobal: false` porque 401 aqui e
 * "credenciais invalidas" (erro de formulario), nao sessao expirada.
 */
import {
  ENDPOINTS,
  loginResponseSchema,
  refreshResponseSchema,
  requisitar,
  type LoginResponse,
  type RefreshResponse,
} from '@/shared/api'

export type LoginRequest = {
  loginEmail: string
  senha: string
}

/** POST /api/auth/login (S006) */
export function fazerLogin(corpo: LoginRequest): Promise<LoginResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.auth.login,
    corpo,
    schema: loginResponseSchema,
    tratarAutenticacaoGlobal: false,
  })
}

/** POST /api/auth/refresh (S006) */
export function renovarToken(refreshToken: string): Promise<RefreshResponse> {
  return requisitar({
    metodo: 'POST',
    caminho: ENDPOINTS.auth.refresh,
    corpo: { refreshToken },
    schema: refreshResponseSchema,
    tratarAutenticacaoGlobal: false,
  })
}
