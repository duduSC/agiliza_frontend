/**
 * Tela de login (UC07, HU13, T007).
 *
 * - Erro sempre generico para CREDENCIAIS_INVALIDAS (Constituicao 6.7).
 * - ESTABELECIMENTO_INATIVO e USUARIO_BLOQUEADO tem mensagens proprias.
 * - ENTREGADOR recusado com mensagem especifica (UC07 E4).
 * - Loading no botao, bloqueio de duplo clique.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ehErroApi } from '@/shared/api/erros'
import { MENSAGENS_ERRO } from '@/shared/api/erros'
import { primeiraTelaDoPerfil } from '@/shared/dominio'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { fazerLogin } from '../api/authApi'
import { useSessaoStore, MENSAGEM_PERFIL_SEM_ACESSO } from '../sessaoStore'

const loginSchema = z.object({
  loginEmail: z.string().email('Informe um e-mail valido.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

export function LoginPagina() {
  const iniciarSessao = useSessaoStore((s) => s.iniciarSessao)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [errosCampo, setErrosCampo] = useState<{ email?: string; senha?: string }>({})
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setErrosCampo({})

    // Validacao local
    const resultado = loginSchema.safeParse({ loginEmail: email, senha })
    if (!resultado.success) {
      const erros: { email?: string; senha?: string } = {}
      for (const issue of resultado.error.issues) {
        if (issue.path[0] === 'loginEmail') erros.email = issue.message
        if (issue.path[0] === 'senha') erros.senha = issue.message
      }
      setErrosCampo(erros)
      return
    }

    setEnviando(true)
    try {
      const resposta = await fazerLogin({ loginEmail: email, senha })

      const resultadoSessao = iniciarSessao({
        usuario: resposta.usuario,
        token: resposta.token,
        refreshToken: resposta.refreshToken,
      })

      if (!resultadoSessao.ok) {
        // ENTREGADOR ou sem estabelecimento
        setErro(resultadoSessao.mensagem)
        return
      }

      // Redirecionar para a primeira tela do perfil
      const destino = primeiraTelaDoPerfil(resposta.usuario.perfil)
      navigate(destino ?? '/', { replace: true })
    } catch (err) {
      if (ehErroApi(err)) {
        switch (err.codigo) {
          case 'CREDENCIAIS_INVALIDAS':
            // Sempre generico (Constituicao 6.7)
            setErro(MENSAGENS_ERRO.CREDENCIAIS_INVALIDAS)
            break
          case 'ESTABELECIMENTO_INATIVO':
            setErro(MENSAGENS_ERRO.ESTABELECIMENTO_INATIVO)
            break
          case 'USUARIO_BLOQUEADO':
            setErro(MENSAGENS_ERRO.USUARIO_BLOQUEADO)
            break
          case 'ACESSO_NEGADO':
            // Canal errado (improvavel no backoffice, mas tratar)
            setErro(MENSAGEM_PERFIL_SEM_ACESSO)
            break
          default:
            setErro(err.mensagem)
        }
      } else {
        setErro('Erro de conexao. Verifique sua internet e tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Agiliza Delivery</h1>
          <p className="text-sm text-muted-foreground">
            Acesse o painel administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Login">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errosCampo.email}
              aria-describedby={errosCampo.email ? 'erro-email' : undefined}
              disabled={enviando}
            />
            {errosCampo.email && (
              <p id="erro-email" className="text-xs text-destructive">{errosCampo.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-senha">Senha</Label>
            <Input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={!!errosCampo.senha}
              aria-describedby={errosCampo.senha ? 'erro-senha' : undefined}
              disabled={enviando}
            />
            {errosCampo.senha && (
              <p id="erro-senha" className="text-xs text-destructive">{errosCampo.senha}</p>
            )}
          </div>

          {erro && (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  )
}
