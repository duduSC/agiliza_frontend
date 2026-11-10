import { QueryClient } from '@tanstack/react-query'
import { ehErroApi } from '@/shared/api/erros'

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        // Não repete 4xx (regra de negócio, auth, validação): só falha de rede/5xx.
        retry: (tentativas, erro) => {
          if (ehErroApi(erro) && erro.status >= 400 && erro.status < 500) return false
          return tentativas < 2
        },
      },
      mutations: {
        // Escritas (em especial as que movem dinheiro) nunca são repetidas automaticamente.
        retry: false,
      },
    },
  })
}
