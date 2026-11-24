/**
 * "Banco" em memória das entregas para os handlers MSW (T003). Usado nos testes (Node) e no
 * modo dev com mocks. `redefinirEntregas()` volta à semente; os testes chamam no `afterEach`.
 *
 * Os valores monetários são dados de exemplo — o frontend nunca os calcula.
 */
import type { EntregaResponse } from '@/shared/api/schemas'
import { criarEntregaResponse } from '@/test/fabricas'

export const IDS_ENTREGAS = {
  pendenteComRepasse: '11111111-1111-4111-8111-111111111111',
  pendenteSemRepasse: '22222222-2222-4222-8222-222222222222',
  pendentePronta: '33333333-3333-4333-8333-333333333333',
  revisaoSemCoordenada: '44444444-4444-4444-8444-444444444444',
  revisaoSemDistancia: '55555555-5555-4555-8555-555555555555',
  revisaoContestacao: '66666666-6666-4666-8666-666666666666',
  despachada: '77777777-7777-4777-8777-777777777777',
  despachada2: '7a777777-7777-4777-8777-777777777777',
} as const

export function sementeEntregas(): EntregaResponse[] {
  return [
    criarEntregaResponse({
      id: IDS_ENTREGAS.pendenteComRepasse,
      nomeCliente: 'Ana Souza',
      bairro: 'Centro',
      coordenada: { latitude: -23.55, longitude: -46.63 },
      distanciaKm: 3.2,
      valorRepasse: 9,
      formaPagamento: 'DINHEIRO',
      pagoOnline: false,
      trocoPara: 100,
      valorPedido: 72.5,
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.pendenteSemRepasse,
      nomeCliente: 'Bruno Lima',
      bairro: 'Vila Nova',
      coordenada: { latitude: -23.56, longitude: -46.64 },
      distanciaKm: null,
      valorRepasse: null,
      formaPagamento: 'PIX',
      pagoOnline: true,
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.pendentePronta,
      nomeCliente: 'Carla Dias',
      bairro: 'Jardim',
      coordenada: { latitude: -23.57, longitude: -46.65 },
      distanciaKm: 5.75,
      valorRepasse: 12.5,
      formaPagamento: 'CREDITO',
      pagoOnline: false,
      prontoParaDespachoEm: '2026-11-09T21:40:00',
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.revisaoSemCoordenada,
      nomeCliente: 'Diego Alves',
      enderecoCompleto: 'Rua Sem Número, s/n',
      pendenteRevisao: true,
      motivoRevisao: 'SEM_COORDENADA',
      coordenada: null,
      distanciaKm: null,
      valorRepasse: null,
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.revisaoSemDistancia,
      nomeCliente: 'Elisa Rocha',
      pendenteRevisao: true,
      motivoRevisao: 'SEM_DISTANCIA',
      coordenada: { latitude: -23.58, longitude: -46.66 },
      distanciaKm: null,
      valorRepasse: null,
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.revisaoContestacao,
      nomeCliente: 'Fábio Nunes',
      status: 'ENTREGUE',
      pendenteRevisao: true,
      motivoRevisao: 'CONTESTACAO_ENTREGADOR',
      coordenada: { latitude: -23.59, longitude: -46.67 },
      distanciaKm: 4.1,
      valorRepasse: 10,
      finalizadaEm: '2026-11-09T20:10:00',
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.despachada,
      nomeCliente: 'Gabi Torres',
      status: 'DESPACHADA',
      loteId: '88888888-8888-4888-8888-888888888888',
      coordenada: { latitude: -23.6, longitude: -46.68 },
      distanciaKm: 2,
      valorRepasse: 8,
    }),
    criarEntregaResponse({
      id: IDS_ENTREGAS.despachada2,
      nomeCliente: 'Hugo Prado',
      status: 'DESPACHADA',
      loteId: '88888888-8888-4888-8888-888888888888',
      coordenada: { latitude: -23.61, longitude: -46.69 },
      distanciaKm: 3,
      valorRepasse: 10,
    }),
  ]
}

let entregas: EntregaResponse[] = sementeEntregas()

export const dbEntregas = {
  todas: (): EntregaResponse[] => entregas,
  substituir: (novas: EntregaResponse[]) => {
    entregas = novas
  },
  buscar: (id: string) => entregas.find((e) => e.id === id),
  inserir: (entrega: EntregaResponse) => {
    entregas = [...entregas, entrega]
  },
  atualizar: (id: string, mudancas: Partial<EntregaResponse>): EntregaResponse | undefined => {
    let atualizada: EntregaResponse | undefined
    entregas = entregas.map((e) => {
      if (e.id !== id) return e
      atualizada = { ...e, ...mudancas }
      return atualizada
    })
    return atualizada
  },
}

export function redefinirEntregas(): void {
  entregas = sementeEntregas()
}
