/**
 * PROVISÓRIO — dados FICTÍCIOS para a sessão de desenvolvimento (T002). Só é carregado pelo
 * seletor de dev, que não entra no build de produção. Sai na F7, com o login real.
 */
import {
  usuarioAutenticadoResponseSchema,
  type UsuarioAutenticadoResponse,
} from '@/shared/api/schemas'
import type { PerfilUsuario } from '@/shared/dominio'

export type EstabelecimentoDev = { id: string; nome: string }

export const ESTABELECIMENTOS_DEV: readonly EstabelecimentoDev[] = [
  { id: 'a1b2c3d4-0001-4a00-8a00-00000000d001', nome: 'Pizzaria Exemplo (fictícia)' },
  { id: 'a1b2c3d4-0002-4a00-8a00-00000000d002', nome: 'Lanchonete Teste (fictícia)' },
]

const USUARIO_ID_DEV: Record<PerfilUsuario, string> = {
  ADMIN_GERAL: 'b1b2c3d4-0001-4b00-8b00-00000000e001',
  ADMIN_RESTAURANTE: 'b1b2c3d4-0002-4b00-8b00-00000000e002',
  OPERADOR: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
  ENTREGADOR: 'b1b2c3d4-0004-4b00-8b00-00000000e004',
}

const NOME_DEV: Record<PerfilUsuario, string> = {
  ADMIN_GERAL: 'Admin Geral (dev)',
  ADMIN_RESTAURANTE: 'Admin da Loja (dev)',
  OPERADOR: 'Operador (dev)',
  ENTREGADOR: 'Entregador (dev)',
}

/** Monta um `UsuarioAutenticadoResponse` fictício, validado pelo mesmo schema da API. */
export function montarUsuarioDev(
  perfil: PerfilUsuario,
  estabelecimentoId: string | null,
): UsuarioAutenticadoResponse {
  return usuarioAutenticadoResponseSchema.parse({
    usuarioId: USUARIO_ID_DEV[perfil],
    estabelecimentoId: perfil === 'ADMIN_GERAL' ? null : estabelecimentoId,
    motoboyId: perfil === 'ENTREGADOR' ? 'c1b2c3d4-0001-4c00-8c00-00000000f001' : null,
    nome: NOME_DEV[perfil],
    perfil,
  })
}
