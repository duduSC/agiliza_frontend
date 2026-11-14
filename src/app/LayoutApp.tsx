/**
 * Layout do Backoffice: cabecalho (usuario, perfil, Sair) + menu com so as telas do perfil.
 * Desktop: menu lateral. Tablet/telas estreitas: menu em faixa horizontal acima do conteudo.
 *
 * T007: removido badge "sessao dev"; logout redireciona para /login.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { CAMINHO_LOGIN, useSessaoStore } from '@/features/auth'
import { LABEL_PERFIL_USUARIO, telasDoPerfil } from '@/shared/dominio'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/lib/utils'

export function LayoutApp() {
  const usuario = useSessaoStore((s) => s.usuario)
  const encerrarSessao = useSessaoStore((s) => s.encerrarSessao)
  const navigate = useNavigate()

  // ExigirSessao garante a sessao; isto so satisfaz o tipo.
  if (!usuario) return null
  const telas = telasDoPerfil(usuario.perfil)

  function sair() {
    encerrarSessao()
    navigate(CAMINHO_LOGIN, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Agiliza Delivery</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm leading-tight">
            <p className="font-medium" data-testid="nome-usuario">
              {usuario.nome}
            </p>
            <p className="text-muted-foreground">{LABEL_PERFIL_USUARIO[usuario.perfil]}</p>
          </div>
          <Button variant="outline" size="sm" onClick={sair}>
            <LogOut aria-hidden="true" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav
          aria-label="Menu principal"
          className="border-b bg-slate-50 md:w-56 md:shrink-0 md:border-r md:border-b-0"
        >
          <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col">
            {telas.map((tela) => (
              <li key={tela.chave}>
                <NavLink
                  to={tela.caminho}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-200',
                      isActive && 'bg-slate-900 font-semibold text-white hover:bg-slate-800',
                    )
                  }
                >
                  {tela.titulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
