/**
 * Estabelecimento do token (T008). `GET /api/estabelecimento` existe no backend
 * (`EstabelecimentoController.meuEstabelecimento`, perfil OPERACAO) e foi conferido contra o
 * backend real em 17/11/2026 e confirmado na S010.
 */
import { useQuery } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { estabelecimentoResponseSchema, type EstabelecimentoResponse } from '@/shared/api/schemas'

export function buscarEstabelecimentoAtual(signal?: AbortSignal): Promise<EstabelecimentoResponse> {
  return requisitar({
    caminho: ENDPOINTS.estabelecimento.atual,
    schema: estabelecimentoResponseSchema,
    signal,
  })
}

export const chavesEstabelecimento = {
  atual: (estabelecimentoId: string | null) => ['estabelecimento', estabelecimentoId] as const,
}

/** So consulta quando a sessao tem estabelecimento (o ADMIN_GERAL nao tem). */
export function useEstabelecimentoAtual() {
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)
  return useQuery({
    queryKey: chavesEstabelecimento.atual(estabelecimentoId),
    queryFn: ({ signal }) => buscarEstabelecimentoAtual(signal),
    enabled: estabelecimentoId !== null,
    staleTime: 5 * 60_000,
  })
}
