/**
 * Fabricas de dados de teste/mocks, no formato dos DTOs do backend.
 * Os valores monetarios aqui sao dados de exemplo -- o frontend nunca os calcula.
 */
import type { CaixaResponse, EntregaResponse, LoteEntregaResponse, MotoboyResponse } from '@/shared/api/schemas'

export const IDS = {
  estabelecimento: '6f1c2a3b-4d5e-4f60-8a71-0b2c3d4e5f60',
  entrega: '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
  caixa: '1b2c3d4e-5f6a-4b7c-9d8e-9f0a1b2c3d4e',
  lote: '2c3d4e5f-6a7b-4c8d-ae9f-0a1b2c3d4e5f',
  motoboy: '3d4e5f6a-7b8c-4d9e-bf0a-1b2c3d4e5f6a',
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

export function criarLoteResponse(sobrescrever: Partial<LoteEntregaResponse> = {}): LoteEntregaResponse {
  return {
    id: IDS.lote,
    estabelecimentoId: IDS.estabelecimento,
    motoboyId: IDS.motoboy,
    usuarioDespachanteId: '4e5f6a7b-8c9d-4e0f-c1a2-3b4c5d6e7f8a',
    status: 'DESPACHADO',
    qtdEntregas: 2,
    criadoEm: '2026-11-11T10:00:00',
    ...sobrescrever,
  }
}

export function criarMotoboyResponse(sobrescrever: Partial<MotoboyResponse> = {}): MotoboyResponse {
  return {
    id: IDS.motoboy,
    usuarioId: '5f6a7b8c-9d0e-4f1a-d2b3-4c5d6e7f8a9b',
    nome: 'Entregador Exemplo',
    telefone: '(11) 99999-0001',
    statusCadastro: 'ATIVO',
    statusDisponibilidade: 'ONLINE',
    criadoEm: '2026-11-09T08:00:00',
    ...sobrescrever,
  }
}
