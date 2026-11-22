/** T009, parte D: tempo real. Tópicos exatos (S013), sem vazamento, reconexão e polling de reserva. */
import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { useSessaoStore } from '@/features/auth'
import { useEntregasPendentes } from '@/features/despacho/api/hooks'
import { useTempoRealFrota } from '@/features/monitoramento/api/useTempoRealFrota'
import { server } from '@/test/msw/server'
import { entrarComo, redefinirSessao } from '@/test/sessao'
import { Client, ReconnectionTimeMode } from '@/test/stompFalso'
import * as tempoReal from '.'

const LOJA = 'a1b2c3d4-0001-4a00-8a00-00000000d001'
const ENTREGAS = `/topic/estabelecimento/${LOJA}/entregas`
const FROTA = `/topic/estabelecimento/${LOJA}/frota`

function novoCliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function montar(componente: React.ReactNode, qc = novoCliente()) {
  return { qc, ...render(<QueryClientProvider client={qc}>{componente}</QueryClientProvider>) }
}

function Despacho() {
  tempoReal.useTempoRealDespacho()
  return null
}
function Frota() {
  useTempoRealFrota()
  return null
}
function DespachoComLista() {
  tempoReal.useTempoRealDespacho()
  useEntregasPendentes()
  return null
}

const ultimo = () => Client.instancias[Client.instancias.length - 1]!
const conectar = () => act(() => ultimo().simularConexao())

beforeEach(() => {
  tempoReal.desconectarStomp()
  Client.instancias.length = 0
  redefinirSessao()
  entrarComo('OPERADOR', 'token-1')
})
afterEach(() => vi.useRealTimers())

describe('inscrições', () => {
  it('despacho assina só entregas e frota: outro destino derruba a sessão (S013)', async () => {
    montar(<Despacho />)
    await conectar()
    expect(ultimo().destinos()).toEqual([ENTREGAS, FROTA])
    expect('topicoIntegracao' in tempoReal).toBe(false)
  })

  it('trocar de tela não vaza: reconectar só reinscreve a tela montada', async () => {
    const despacho = montar(<Despacho />)
    await conectar()
    despacho.unmount()
    expect(ultimo().destinos()).toEqual([])

    montar(<Frota />)
    act(() => ultimo().simularQueda())
    await conectar()
    expect(ultimo().destinos()).toEqual([FROTA])
  })

  it('voltar à mesma tela várias vezes não duplica inscrição', async () => {
    montar(<Despacho />).unmount()
    montar(<Despacho />).unmount()
    montar(<Despacho />)
    await conectar()
    act(() => ultimo().simularQueda())
    await conectar()
    expect(ultimo().destinos()).toEqual([ENTREGAS, FROTA])
  })
})

describe('reconexão', () => {
  it('usa recuo exponencial com teto', () => {
    montar(<Despacho />)
    expect(ultimo().reconnectTimeMode).toBe(ReconnectionTimeMode.EXPONENTIAL)
    expect(ultimo().maxReconnectDelay).toBeLessThanOrEqual(60_000)
  })

  it('reconecta com o token renovado, não com o vencido', async () => {
    montar(<Despacho />)
    await conectar()
    act(() => useSessaoStore.getState().atualizarTokens('token-2', 'refresh-2'))
    act(() => ultimo().simularQueda())
    await conectar()
    expect(ultimo().connectHeaders.Authorization).toBe('Bearer token-2')
  })

  it('logout encerra a conexão', async () => {
    montar(<Despacho />)
    await conectar()
    const cliente = ultimo()
    act(() => useSessaoStore.getState().encerrarSessao())
    expect(cliente.active).toBe(false)
    expect(tempoReal.obterEstadoConexao()).toBe('desconectado')
  })
})

describe('eventos', () => {
  it('evento de entregas atualiza entregas e lotes; o de frota, só os entregadores', async () => {
    const { qc } = montar(<Despacho />)
    await conectar()
    const chaves = { entregas: ['entregas', LOJA], lotes: ['lotes', LOJA], motoboys: ['motoboys', LOJA] }
    const semear = () => Object.values(chaves).forEach((k) => qc.setQueryData(k, []))
    const invalidas = () =>
      Object.entries(chaves)
        .filter(([, k]) => qc.getQueryState(k)?.isInvalidated)
        .map(([nome]) => nome)

    semear()
    act(() => ultimo().emitir(ENTREGAS))
    expect(invalidas()).toEqual(['entregas', 'lotes'])

    semear()
    act(() => ultimo().emitir(FROTA))
    expect(invalidas()).toEqual(['motoboys'])
  })

  it('reconexão ressincroniza o que pode ter mudado enquanto estava fora', async () => {
    const { qc } = montar(<Despacho />)
    await conectar()
    act(() => ultimo().simularQueda())
    qc.setQueryData(['entregas', LOJA], [])
    await conectar()
    expect(qc.getQueryState(['entregas', LOJA])?.isInvalidated).toBe(true)
  })
})

describe('polling de reserva', () => {
  it('para com o socket ativo e volta a cada 15 s quando ele cai', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let chamadas = 0
    server.use(
      http.get('*/api/entregas', () => {
        chamadas++
        return HttpResponse.json([])
      }),
    )
    montar(<DespachoComLista />)
    await waitFor(() => expect(chamadas).toBeGreaterThan(0))
    await conectar()
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    const comSocket = chamadas

    await act(() => vi.advanceTimersByTimeAsync(31_000))
    expect(chamadas).toBe(comSocket)

    act(() => ultimo().simularQueda())
    await act(() => vi.advanceTimersByTimeAsync(15_500))
    await waitFor(() => expect(chamadas).toBeGreaterThan(comSocket))
  })
})
