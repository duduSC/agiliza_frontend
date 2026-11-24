/**
 * "Banco" em memoria dos lotes para os handlers MSW (T004).
 */
import type { LoteEntregaResponse } from '@/shared/api/schemas'
import { criarLoteResponse } from '@/test/fabricas'

export const IDS_LOTES = {
  despachado: '88888888-8888-4888-8888-888888888888',
  emRota: '99999999-9999-4999-8999-999999999999',
} as const

function criarLote(sobrescrever: Partial<LoteEntregaResponse> & { id: string }): LoteEntregaResponse {
  return criarLoteResponse({
    // Quem tem lote fica EM_ROTA no backend (LoteEntregaServiceImpl.despachar).
    motoboyId: 'ee555555-5555-4555-8555-eee555555555',
    ...sobrescrever,
  })
}

export function sementeLotes(): LoteEntregaResponse[] {
  return [
    criarLote({
      id: IDS_LOTES.despachado,
      status: 'DESPACHADO',
      qtdEntregas: 2,
      valorTotalRepasse: 18,
      despachadoEm: '2026-11-11T10:00:00',
    }),
    criarLote({
      id: IDS_LOTES.emRota,
      status: 'EM_ROTA',
      qtdEntregas: 1,
      valorTotalRepasse: 9,
    }),
  ]
}

let lotes: LoteEntregaResponse[] = sementeLotes()

export const dbLotes = {
  todos: (): LoteEntregaResponse[] => lotes,
  buscar: (id: string) => lotes.find((l) => l.id === id),
  inserir: (lote: LoteEntregaResponse) => {
    lotes = [...lotes, lote]
  },
  atualizar: (id: string, mudancas: Partial<LoteEntregaResponse>): LoteEntregaResponse | undefined => {
    let atualizado: LoteEntregaResponse | undefined
    lotes = lotes.map((l) => {
      if (l.id !== id) return l
      atualizado = { ...l, ...mudancas }
      return atualizado
    })
    return atualizado
  },
}

export function redefinirLotes(): void {
  lotes = sementeLotes()
}
