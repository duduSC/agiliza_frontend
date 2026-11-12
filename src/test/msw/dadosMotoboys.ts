/**
 * "Banco" em memoria dos entregadores para os handlers MSW (T004).
 */
import type { MotoboyResponse } from '@/shared/api/schemas'

export const IDS_MOTOBOYS = {
  online1: 'aa111111-1111-4111-8111-aaa111111111',
  online2: 'bb222222-2222-4222-8222-bbb222222222',
  offline: 'cc333333-3333-4333-8333-ccc333333333',
  bloqueado: 'dd444444-4444-4444-8444-ddd444444444',
} as const

function criarMotoboy(sobrescrever: Partial<MotoboyResponse> & { id: string; nome: string }): MotoboyResponse {
  return {
    usuarioId: `usr-${sobrescrever.id}`,
    telefone: '(11) 99999-0001',
    statusCadastro: 'ATIVO',
    statusDisponibilidade: 'ONLINE',
    criadoEm: '2026-11-09T08:00:00',
    ...sobrescrever,
  }
}

export function sementeMotoboys(): MotoboyResponse[] {
  return [
    criarMotoboy({
      id: IDS_MOTOBOYS.online1,
      nome: 'Ricardo Silva',
      telefone: '(11) 99999-0001',
      placaVeiculo: 'ABC-1234',
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.online2,
      nome: 'Marcos Oliveira',
      telefone: '(11) 99999-0002',
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.offline,
      nome: 'Pedro Costa',
      telefone: '(11) 99999-0003',
      statusDisponibilidade: 'OFFLINE',
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.bloqueado,
      nome: 'Jose Bloqueado',
      telefone: '(11) 99999-0004',
      statusCadastro: 'BLOQUEADO',
      statusDisponibilidade: 'ONLINE',
    }),
  ]
}

let motoboys: MotoboyResponse[] = sementeMotoboys()

export const dbMotoboys = {
  todos: (): MotoboyResponse[] => motoboys,
}

export function redefinirMotoboys(): void {
  motoboys = sementeMotoboys()
}
