import { useEffect, useMemo } from 'react'
import { BrowserRouter, useNavigate, useRoutes } from 'react-router-dom'
import { redefinirCliente } from '@/shared/api/client'
import { ligarClienteHttp } from './ligarClienteHttp'
import { criarRotas } from './rotas'

/**
 * Rotas + ligação do cliente HTTP ao roteador. Fica separado de `App` para os testes
 * usarem `MemoryRouter`. (Sem loaders/actions, não há motivo para o roteador de dados.)
 */
export function RotasApp() {
  const navigate = useNavigate()
  const rotas = useMemo(criarRotas, [])

  useEffect(() => {
    ligarClienteHttp((caminho) => navigate(caminho, { replace: true }))
    return () => redefinirCliente()
  }, [navigate])

  return useRoutes(rotas)
}

export function App() {
  return (
    <BrowserRouter>
      <RotasApp />
    </BrowserRouter>
  )
}
