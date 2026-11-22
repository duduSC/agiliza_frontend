import { useLayoutEffect, useMemo, useRef } from 'react'
import { BrowserRouter, useNavigate, useRoutes } from 'react-router-dom'
import { redefinirCliente } from '@/shared/api/client'
import { LimiteDeErro } from '@/shared/ui/LimiteDeErro'
import { ligarClienteHttp } from './ligarClienteHttp'
import { criarRotas } from './rotas'

/**
 * Rotas + ligação do cliente HTTP ao roteador. Fica separado de `App` para os testes
 * usarem `MemoryRouter`. (Sem loaders/actions, não há motivo para o roteador de dados.)
 */
export function RotasApp() {
  const navigate = useNavigate()
  const rotas = useMemo(criarRotas, [])

  const navegar = useRef(navigate)
  navegar.current = navigate

  // Tem de ser layout effect e rodar uma vez só. As consultas das páginas começam nos efeitos
  // passivos delas, que rodam ANTES dos do App, e o `navigate` muda a cada rota: com useEffect,
  // a primeira consulta de cada tela saía sem token (T009).
  useLayoutEffect(() => {
    ligarClienteHttp((caminho) => navegar.current(caminho, { replace: true }))
    return () => redefinirCliente()
  }, [])

  const tela = useRoutes(rotas)
  return <LimiteDeErro mensagem="Não foi possível exibir o painel.">{tela}</LimiteDeErro>
}

export function App() {
  return (
    <BrowserRouter>
      <RotasApp />
    </BrowserRouter>
  )
}
