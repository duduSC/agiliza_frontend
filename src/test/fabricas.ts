/**
 * Fábricas de dados de teste/mocks, no formato dos DTOs do backend.
 * Os valores monetários aqui são dados de exemplo — o frontend nunca os calcula.
 */
import type { CaixaResponse, EntregaResponse } from '@/shared/api/schemas'

export const IDS = {
  estabelecimento: '6f1c2a3b-4d5e-4f60-8a71-0b2c3d4e5f60',
  entrega: '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
  caixa: '1b2c3d4e-5f6a-4b7c-9d8e-9f0a1b2c3d4e',
} as const

export function criarEntregaResponse(sobrescrever: Partial<EntregaResponse> = {}): EntregaResponse {
  return {
    id: IDS.entrega,
    estabelecimentoId: IDS.estabelecimento,
    nomeCliente: 'Cliente Exemplo',
    enderecoCompleto: 'Rua Exemplo, 100 - Centro',
    pagoOnline: false,
    status: 'AGUARDANDO_DESPACHO',
    pendenteRevisao: false,
    criadoEm: '2026-11-09T21:30:00',
    ...sobrescrever,
  }
}

export function criarCaixaResponse(sobrescrever: Partial<CaixaResponse> = {}): CaixaResponse {
  return {
    id: IDS.caixa,
    estabelecimentoId: IDS.estabelecimento,
    dataReferencia: '2026-11-09',
    abertoEm: '2026-11-09T08:00:00',
    status: 'ABERTO',
    criadoEm: '2026-11-09T08:00:00',
    ...sobrescrever,
  }
}
