/**
 * Testes unitarios das regras de exibicao do despacho (T003).
 * Constituicao 5.5: acoes so as permitidas pela maquina de estados.
 */
import { describe, expect, it } from 'vitest'
import type { EntregaResponse } from '@/shared/api'
import {
  descreverCobranca,
  descreverEspera,
  descreverFormaPagamento,
  minutosDeEspera,
  podeAjustarCoordenada,
  podeCancelar,
  podeMarcarPronto,
} from './regras'

type EntregaParcial = Pick<
  EntregaResponse,
  'status' | 'pendenteRevisao' | 'motivoRevisao' | 'prontoParaDespachoEm'
>

function entregaBase(sobrescrever: Partial<EntregaParcial> = {}): EntregaParcial {
  return {
    status: 'AGUARDANDO_DESPACHO',
    pendenteRevisao: false,
    motivoRevisao: undefined,
    prontoParaDespachoEm: undefined,
    ...sobrescrever,
  }
}

describe('podeMarcarPronto', () => {
  it('permite para AGUARDANDO_DESPACHO sem prontoParaDespachoEm', () => {
    expect(podeMarcarPronto(entregaBase())).toBe(true)
  })

  it('nao permite se ja tem prontoParaDespachoEm (padrao restritivo, D006)', () => {
    expect(
      podeMarcarPronto(entregaBase({ prontoParaDespachoEm: '2026-11-09T21:40:00' })),
    ).toBe(false)
  })

  it('nao permite para DESPACHADA', () => {
    expect(podeMarcarPronto(entregaBase({ status: 'DESPACHADA' }))).toBe(false)
  })

  it('nao permite para EM_ROTA', () => {
    expect(podeMarcarPronto(entregaBase({ status: 'EM_ROTA' }))).toBe(false)
  })

  it('nao permite para ENTREGUE', () => {
    expect(podeMarcarPronto(entregaBase({ status: 'ENTREGUE' }))).toBe(false)
  })

  it('nao permite para CANCELADA', () => {
    expect(podeMarcarPronto(entregaBase({ status: 'CANCELADA' }))).toBe(false)
  })
})

describe('podeCancelar', () => {
  it('permite para AGUARDANDO_DESPACHO', () => {
    expect(podeCancelar(entregaBase())).toBe(true)
  })

  it('permite para DESPACHADA', () => {
    expect(podeCancelar(entregaBase({ status: 'DESPACHADA' }))).toBe(true)
  })

  it('permite para EM_ROTA', () => {
    expect(podeCancelar(entregaBase({ status: 'EM_ROTA' }))).toBe(true)
  })

  it('nao permite para ENTREGUE (estado final)', () => {
    expect(podeCancelar(entregaBase({ status: 'ENTREGUE' }))).toBe(false)
  })

  it('nao permite para FALHA (estado final)', () => {
    expect(podeCancelar(entregaBase({ status: 'FALHA' }))).toBe(false)
  })

  it('nao permite para CANCELADA (estado final)', () => {
    expect(podeCancelar(entregaBase({ status: 'CANCELADA' }))).toBe(false)
  })
})

describe('podeAjustarCoordenada', () => {
  it('permite para revisao SEM_COORDENADA + AGUARDANDO_DESPACHO', () => {
    expect(
      podeAjustarCoordenada(
        entregaBase({ pendenteRevisao: true, motivoRevisao: 'SEM_COORDENADA' }),
      ),
    ).toBe(true)
  })

  it('nao permite para SEM_DISTANCIA', () => {
    expect(
      podeAjustarCoordenada(
        entregaBase({ pendenteRevisao: true, motivoRevisao: 'SEM_DISTANCIA' }),
      ),
    ).toBe(false)
  })

  it('nao permite para CONTESTACAO_ENTREGADOR', () => {
    expect(
      podeAjustarCoordenada(
        entregaBase({ pendenteRevisao: true, motivoRevisao: 'CONTESTACAO_ENTREGADOR' }),
      ),
    ).toBe(false)
  })

  it('nao permite se pendenteRevisao === false', () => {
    expect(
      podeAjustarCoordenada(entregaBase({ pendenteRevisao: false, motivoRevisao: 'SEM_COORDENADA' })),
    ).toBe(false)
  })
})

describe('minutosDeEspera', () => {
  it('retorna null se prontoEm e null', () => {
    expect(minutosDeEspera(null, new Date())).toBeNull()
  })

  it('retorna null se prontoEm e undefined', () => {
    expect(minutosDeEspera(undefined, new Date())).toBeNull()
  })

  it('retorna 0 se marcada agora mesmo', () => {
    // prontoEm no horario de Sao Paulo
    const agora = new Date('2026-11-09T21:40:00-03:00')
    expect(minutosDeEspera('2026-11-09T21:40:00', agora)).toBe(0)
  })

  it('retorna minutos positivos se marcada antes', () => {
    // 30 minutos depois
    const agora = new Date('2026-11-09T22:10:00-03:00')
    expect(minutosDeEspera('2026-11-09T21:40:00', agora)).toBe(30)
  })
})

describe('descreverEspera', () => {
  it('diz "Nao marcada como pronta" para null', () => {
    expect(descreverEspera(null, new Date())).toContain('marcada como pronta')
  })

  it('descreve em minutos', () => {
    const agora = new Date('2026-11-09T22:10:00-03:00')
    expect(descreverEspera('2026-11-09T21:40:00', agora)).toContain('30 min')
  })

  it('descreve em horas e minutos', () => {
    const agora = new Date('2026-11-09T23:10:00-03:00')
    const resultado = descreverEspera('2026-11-09T21:40:00', agora)
    expect(resultado).toContain('1 h')
    expect(resultado).toContain('30 min')
  })
})

describe('descreverFormaPagamento', () => {
  it('mostra "--" para null', () => {
    expect(descreverFormaPagamento({ formaPagamento: null })).toBe('—')
  })

  it('mostra "Dinheiro" para DINHEIRO', () => {
    expect(descreverFormaPagamento({ formaPagamento: 'DINHEIRO' })).toBe('Dinheiro')
  })

  it('mostra "PIX" para PIX', () => {
    expect(descreverFormaPagamento({ formaPagamento: 'PIX' })).toBe('PIX')
  })
})

describe('descreverCobranca', () => {
  it('mostra "Pago online" para pagoOnline = true', () => {
    expect(descreverCobranca({ pagoOnline: true, trocoPara: null })).toBe('Pago online')
  })

  it('mostra "Receber na entrega" sem troco', () => {
    expect(descreverCobranca({ pagoOnline: false, trocoPara: null })).toBe('Receber na entrega')
  })

  it('mostra troco quando trocoPara esta preenchido', () => {
    const resultado = descreverCobranca({ pagoOnline: false, trocoPara: 100 })
    expect(resultado).toContain('troco para')
    expect(resultado).toContain('R$')
  })
})
