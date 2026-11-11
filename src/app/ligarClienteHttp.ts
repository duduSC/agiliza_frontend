/**
 * Liga o cliente HTTP único (`shared/api/client.ts`) à sessão em memória e ao roteador
 * (Constituição, Artigo 6.3): 401 → encerra a sessão (a guarda mostra "Sem sessão");
 * 403 → `/acesso-negado`.
 */
import { CAMINHO_ACESSO_NEGADO, obterTokenDaSessao, useSessaoStore } from '@/features/auth'
import { configurarCliente } from '@/shared/api/client'

export function ligarClienteHttp(navegar: (caminho: string) => void): void {
  configurarCliente({
    obterToken: obterTokenDaSessao,
    aoNaoAutenticado: () => useSessaoStore.getState().encerrarSessao(),
    aoAcessoNegado: () => navegar(CAMINHO_ACESSO_NEGADO),
  })
}
