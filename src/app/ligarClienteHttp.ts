/**
 * Liga o cliente HTTP unico (`shared/api/client.ts`) a sessao em memoria e ao roteador
 * (Constituicao, Artigo 6.3): 401 -> tenta refresh, se falhar encerra sessao e vai para /login;
 * 403 -> `/acesso-negado`.
 *
 * T007: refresh automatico com mutex para evitar multiplas renovacoes simultaneas.
 */
import {
  CAMINHO_ACESSO_NEGADO,
  CAMINHO_LOGIN,
  obterRefreshTokenDaSessao,
  obterTokenDaSessao,
  renovarToken,
  useSessaoStore,
} from '@/features/auth'
import { configurarCliente } from '@/shared/api/client'
import { ehErroApi } from '@/shared/api/erros'

/** Mutex: so uma tentativa de refresh por vez. */
let refreshEmAndamento: Promise<string | null> | null = null

async function tentarRefresh(): Promise<string | null> {
  // Reutiliza a promessa em andamento para evitar multiplas chamadas simultaneas
  if (refreshEmAndamento) return refreshEmAndamento

  const rt = obterRefreshTokenDaSessao()
  if (!rt) return null

  refreshEmAndamento = (async () => {
    try {
      const resposta = await renovarToken(rt)
      // Saiu ou trocou de usuário durante a renovação: não ressuscita a sessão antiga.
      if (obterRefreshTokenDaSessao() !== rt) return null
      useSessaoStore.getState().atualizarTokens(resposta.token, resposta.refreshToken)
      return resposta.token
    } catch (erro) {
      // Só recusa do servidor encerra a sessão. Rede fora ou 5xx é falha passageira.
      if (ehErroApi(erro) && (erro.tipo === 'rede' || erro.status >= 500)) throw erro
      return null
    } finally {
      refreshEmAndamento = null
    }
  })()

  return refreshEmAndamento
}

export function ligarClienteHttp(navegar: (caminho: string) => void): void {
  configurarCliente({
    obterToken: obterTokenDaSessao,
    obterSessao: () => useSessaoStore.getState().usuario?.usuarioId ?? null,
    tentarRefresh,
    aoNaoAutenticado: () => {
      useSessaoStore.getState().encerrarSessao()
      navegar(CAMINHO_LOGIN)
    },
    aoAcessoNegado: () => navegar(CAMINHO_ACESSO_NEGADO),
  })
}
