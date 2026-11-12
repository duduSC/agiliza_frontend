/**
 * "Banco" em memoria dos lotes para os handlers MSW (T004).
 */
import type { LoteEntregaResponse } from '@/shared/api/schemas'

export const IDS_LOTES = {
  despachado: '88888888-8888-4888-8888-888888888888',
  emRota: '99999999-9999-4999-8999-999999999999',
} as const

function criarLote(sobrescrever: Partial<LoteEntregaResponse> & { id: string }): LoteEntregaResponse {
  return {
    estabelecimentoId: '6f1c2a3b-4d5e-4f60-8a71-0b2c3d4e5f60',
    motoboyId: 'aa111111-1111-4111-8111-aaa111111111',
    usuarioDespachanteId: 'b1b2c3d4-0003-4b00-8b00-00000000e003',
    status: 'DESPACHADO',
    qtdEntregas: 2,
    criadoEm: '2026-11-11T10:00:00',
    ...sobrescrever,
  }
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
