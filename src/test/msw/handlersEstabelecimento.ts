/**
 * Handler MSW de `GET /api/estabelecimento` (T008). Formato conferido contra o backend real em
 * 17/11/2026 (`EstabelecimentoResponse`). Os valores sao dados de exemplo.
 */
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { EstabelecimentoResponse } from '@/shared/api/schemas'

export const ID_ESTABELECIMENTO_MOCK = 'a1b2c3d4-0001-4a00-8a00-00000000d001'

export function criarEstabelecimentoMock(
  sobrescrever: Partial<EstabelecimentoResponse> = {},
): EstabelecimentoResponse {
  return {
    id: ID_ESTABELECIMENTO_MOCK,
    razaoSocial: 'Pizzaria Demonstracao Ltda',
    nomeFantasia: 'Pizzaria Demo',
    cnpj: '11222333000181',
    telefone: '5433110000',
    enderecoCompleto: 'Av. Exemplo, 500 - Centro',
    coordenada: { latitude: -23.555, longitude: -46.635 },
    status: 'ATIVO',
    maxPedidosPorLote: 5,
    valorRepasseForaDeArea: 20,
    criadoEm: '2026-11-17T18:52:59.056815',
    atualizadoEm: '2026-11-17T18:52:59.056815',
    ...sobrescrever,
  }
}

export const handlersEstabelecimento = [
  http.get(`*${ENDPOINTS.estabelecimento.atual}`, () => HttpResponse.json(criarEstabelecimentoMock())),
]
