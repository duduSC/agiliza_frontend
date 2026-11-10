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
