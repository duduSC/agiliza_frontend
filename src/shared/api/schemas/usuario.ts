import { z } from 'zod'
import { PERFIS_USUARIO } from '@/shared/dominio/enums'
import { localDateTime, opcional, uuid } from './comuns'

/** `dto/response/UsuarioResponse.java` */
export const usuarioResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: opcional(uuid),
  nome: z.string(),
  loginEmail: z.string(),
  perfil: z.enum(PERFIS_USUARIO),
  ativo: z.boolean(),
  ultimoAcessoEm: opcional(localDateTime),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type UsuarioResponse = z.infer<typeof usuarioResponseSchema>

/**
 * `dto/response/UsuarioAutenticadoResponse.java` — o usuário da sessão (UC07, passo 5).
 * `estabelecimentoId` é nulo para ADMIN_GERAL; `motoboyId` só vem para ENTREGADOR.
 * Conferido contra o record Java em 10/11/2026.
 */
export const usuarioAutenticadoResponseSchema = z.object({
  usuarioId: uuid,
  estabelecimentoId: opcional(uuid),
  motoboyId: opcional(uuid),
  nome: z.string(),
  perfil: z.enum(PERFIS_USUARIO),
})
export type UsuarioAutenticadoResponse = z.infer<typeof usuarioAutenticadoResponseSchema>
