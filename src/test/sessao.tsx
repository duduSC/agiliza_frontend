/* eslint-disable react-refresh/only-export-components -- utilitário de teste, não participa do fast refresh */
/** Utilitários de teste para sessão e roteamento (T002). */
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { QueryClient } from '@tanstack/react-query'
import { RotasApp } from '@/app/App'
import { Providers } from '@/app/Providers'
import { criarQueryClient } from '@/app/queryClient'
import { useSessaoStore } from '@/features/auth'
import { ESTABELECIMENTOS_DEV, montarUsuarioDev } from '@/features/auth/dev/usuariosDev'
import type { PerfilUsuario } from '@/shared/dominio'

export function redefinirSessao(): void {
  useSessaoStore.setState({ usuario: null, token: null, estabelecimentoId: null })
}

export function usuarioDeTeste(perfil: PerfilUsuario) {
  return montarUsuarioDev(perfil, ESTABELECIMENTOS_DEV[0]?.id ?? null)
}

export function entrarComo(perfil: PerfilUsuario, token: string | null = null) {
  return useSessaoStore.getState().iniciarSessao({ usuario: usuarioDeTeste(perfil), token })
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
