import { z } from 'zod'
import { usuarioAutenticadoResponseSchema } from './usuario'

/**
 * Resposta do login e do refresh (S006):
 * `POST /api/auth/login` e `POST /api/auth/refresh`.
 */
export const loginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  usuario: usuarioAutenticadoResponseSchema,
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

/**
 * Resposta do refresh e identica a do login (S006).
 */
export const refreshResponseSchema = loginResponseSchema
export type RefreshResponse = z.infer<typeof refreshResponseSchema>
