/* eslint-disable react-refresh/only-export-components -- utilitario de teste, nao participa do fast refresh */
/** Utilitarios de teste para sessao e roteamento (T002, T007). */
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { QueryClient } from '@tanstack/react-query'
import { RotasApp } from '@/app/App'
import { Providers } from '@/app/Providers'
import { criarQueryClient } from '@/app/queryClient'
import { useSessaoStore } from '@/features/auth'
import type { UsuarioAutenticadoResponse } from '@/shared/api/schemas'
import type { PerfilUsuario } from '@/shared/dominio'

const ID_ESTABELECIMENTO_TESTE = 'a1b2c3d4-0001-4a00-8a00-00000000d001'

const USUARIO_ID_TESTE: Record<PerfilUsuario, string> = {
  ADMIN_GERAL: 'b1b2c3d4-0001-4b00-8b00-00000000e001',
  ADMIN_RESTAURANTE: 'b1b2c3d4-0002-4b00-8b00-00000000e002',
  OPERADOR: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
  ENTREGADOR: 'b1b2c3d4-0004-4b00-8b00-00000000e004',
}

const NOME_TESTE: Record<PerfilUsuario, string> = {
  ADMIN_GERAL: 'Admin Geral (teste)',
  ADMIN_RESTAURANTE: 'Admin da Loja (teste)',
  OPERADOR: 'Operador (teste)',
  ENTREGADOR: 'Entregador (teste)',
}

export function redefinirSessao(): void {
  useSessaoStore.setState({ usuario: null, token: null, refreshToken: null, estabelecimentoId: null })
}

export function usuarioDeTeste(perfil: PerfilUsuario): UsuarioAutenticadoResponse {
  return {
    usuarioId: USUARIO_ID_TESTE[perfil],
    estabelecimentoId: perfil === 'ADMIN_GERAL' ? null : ID_ESTABELECIMENTO_TESTE,
    motoboyId: perfil === 'ENTREGADOR' ? 'c1b2c3d4-0001-4c00-8c00-00000000f001' : null,
    nome: NOME_TESTE[perfil],
    perfil,
  }
}

export function entrarComo(perfil: PerfilUsuario, token: string = 'token-teste') {
  return useSessaoStore.getState().iniciarSessao({
    usuario: usuarioDeTeste(perfil),
    token,
    refreshToken: 'refresh-token-teste',
  })
}

type Local = { pathname: string }

function EspiaoDeLocal({ local }: { local: Local }) {
  local.pathname = useLocation().pathname
  return null
}

export function renderizarApp(rota: string, opcoes: { queryClient?: QueryClient } = {}) {
  const queryClient = opcoes.queryClient ?? criarQueryClient()
  const local: Local = { pathname: rota }
  const resultado = render(
    <Providers queryClient={queryClient}>
      <MemoryRouter initialEntries={[rota]}>
        <RotasApp />
        <EspiaoDeLocal local={local} />
      </MemoryRouter>
    </Providers>,
  )
  return { ...resultado, local, queryClient }
}
