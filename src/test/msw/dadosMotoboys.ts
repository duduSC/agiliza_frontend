/**
 * "Banco" em memoria dos entregadores para os handlers MSW (T004 + T005).
 */
import type { MotoboyResponse } from '@/shared/api/schemas'
import { IDS, criarMotoboyResponse } from '@/test/fabricas'

export const IDS_MOTOBOYS = {
  online1: 'aa111111-1111-4111-8111-aaa111111111',
  online2: 'bb222222-2222-4222-8222-bbb222222222',
  emRota: 'ee555555-5555-4555-8555-eee555555555',
  emRotaDesatualizado: 'ff666666-6666-4666-8666-fff666666666',
  offline: 'cc333333-3333-4333-8333-ccc333333333',
  bloqueado: 'dd444444-4444-4444-8444-ddd444444444',
} as const

function criarMotoboy(sobrescrever: Partial<MotoboyResponse> & { id: string; nome: string }): MotoboyResponse {
  return criarMotoboyResponse({
    usuarioId: `d0000000-0000-4000-8000-${sobrescrever.id.slice(-12)}`,
    ...sobrescrever,
  })
}

export function sementeMotoboys(): MotoboyResponse[] {
  // Data "recente" para posicoes atualizadas (dentro de 3 min)
  const agoraRecente = '2026-11-13T14:00:00'
  // Data "antiga" para posicao desatualizada (mais de 3 min)
  const antigaDesatualizada = '2026-11-13T13:50:00'

  return [
    criarMotoboy({
      id: IDS_MOTOBOYS.online1,
      nome: 'Ricardo Silva',
      telefone: '(11) 99999-0001',
      placaVeiculo: 'ABC-1234',
      ultimaPosicao: { latitude: -23.5505, longitude: -46.6340 },
      ultimaPosicaoEm: agoraRecente,
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.online2,
      nome: 'Marcos Oliveira',
      telefone: '(11) 99999-0002',
      ultimaPosicao: { latitude: -23.5550, longitude: -46.6390 },
      ultimaPosicaoEm: agoraRecente,
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.emRota,
      nome: 'Julio Fernandes',
      telefone: '(11) 99999-0005',
      placaVeiculo: 'DEF-5678',
      statusDisponibilidade: 'EM_ROTA',
      ultimaPosicao: { latitude: -23.5600, longitude: -46.6450 },
      ultimaPosicaoEm: agoraRecente,
    }),
    criarMotoboy({
      id: IDS_MOTOBOYS.emRotaDesatualizado,
      nome: 'Paulo Santos',
      telefone: '(11) 99999-0006',
      placaVeiculo: 'GHI-9012',
      statusDisponibilidade: 'EM_ROTA',
      ultimaPosicao: { latitude: -23.5650, longitude: -46.6500 },
      ultimaPosicaoEm: antigaDesatualizada,
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
    // O entregador do extrato de exemplo do acerto.
    criarMotoboy({ id: IDS.motoboy, nome: 'Entregador Exemplo', statusDisponibilidade: 'OFFLINE' }),
  ]
}

let motoboys: MotoboyResponse[] = sementeMotoboys()

export const dbMotoboys = {
  todos: (): MotoboyResponse[] => motoboys,
  buscar: (id: string) => motoboys.find((m) => m.id === id),
  atualizar: (id: string, mudancas: Partial<MotoboyResponse>) => {
    motoboys = motoboys.map((m) => (m.id === id ? { ...m, ...mudancas } : m))
  },
}

export function redefinirMotoboys(): void {
  motoboys = sementeMotoboys()
}
