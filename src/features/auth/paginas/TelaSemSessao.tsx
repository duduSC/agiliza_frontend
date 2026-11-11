/**
 * Mostrada em qualquer rota protegida sem sessão (e após um 401). NÃO é a tela de login (F7).
 * Em desenvolvimento/mocks, oferece o seletor de sessão PROVISÓRIO.
 */
import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { primeiraTelaDoPerfil, type PerfilUsuario } from '@/shared/dominio'
import { EstadoCarregando } from '@/shared/ui/estados'
import { SESSAO_DEV_HABILITADA } from '../sessaoDevHabilitada'

// Em produção SESSAO_DEV_HABILITADA vira `false` em tempo de build e o import() some do bundle.
const SeletorSessaoDev = SESSAO_DEV_HABILITADA ? lazy(() => import('../dev/SeletorSessaoDev')) : null

type Props = {
  /** Injetável só para testes; o padrão vem do ambiente de build. */
  sessaoDevHabilitada?: boolean
}

export function TelaSemSessao({ sessaoDevHabilitada = SESSAO_DEV_HABILITADA }: Props) {
  const navigate = useNavigate()

  function aoIniciar(perfil: PerfilUsuario) {
    const destino = primeiraTelaDoPerfil(perfil)
    if (destino) navigate(destino, { replace: true })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sem sessão</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Você não está com uma sessão ativa no Backoffice do Agiliza Delivery.
      </p>
      {sessaoDevHabilitada && SeletorSessaoDev ? (
        <Suspense fallback={<EstadoCarregando />}>
          <SeletorSessaoDev aoIniciar={aoIniciar} />
        </Suspense>
      ) : (
        <p className="max-w-md text-sm">O acesso com e-mail e senha estará disponível em breve.</p>
      )}
    </main>
  )
}
