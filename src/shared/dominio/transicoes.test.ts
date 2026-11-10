import { STATUS_ENTREGA } from './enums'
import { acoesPermitidas, ehStatusFinal, podeTransicionar, TRANSICOES_ENTREGA } from './transicoes'

describe('acoesPermitidas (AGENT.md 6.2 / DVP 1.4.4)', () => {
  it('AGUARDANDO_DESPACHO: marcar pronto, ajustar pino, incluir em lote, cancelar', () => {
    expect(acoesPermitidas('AGUARDANDO_DESPACHO')).toEqual([
      'MARCAR_PRONTO',
      'AJUSTAR_PINO',
      'INCLUIR_EM_LOTE',
      'CANCELAR',
    ])
  })

  it('DESPACHADA: devolver lote e cancelar', () => {
    expect(acoesPermitidas('DESPACHADA')).toEqual(['DEVOLVER_LOTE', 'CANCELAR'])
  })

  it('EM_ROTA: só cancelar', () => {
    expect(acoesPermitidas('EM_ROTA')).toEqual(['CANCELAR'])
  })

  it.each(['ENTREGUE', 'FALHA', 'CANCELADA'] as const)(
    '%s (estado final): só ajuste de repasse',
    (status) => {
      expect(acoesPermitidas(status)).toEqual(['AJUSTAR_REPASSE'])
    },
  )

  it('cobre todos os 6 status oficiais', () => {
    for (const status of STATUS_ENTREGA) {
      expect(acoesPermitidas(status).length).toBeGreaterThan(0)
    }
    expect(Object.keys(TRANSICOES_ENTREGA)).toHaveLength(6)
  })
})

describe('podeTransicionar / ehStatusFinal', () => {
  it('segue o DVP 1.4.4', () => {
    expect(podeTransicionar('AGUARDANDO_DESPACHO', 'DESPACHADA')).toBe(true)
    expect(podeTransicionar('DESPACHADA', 'AGUARDANDO_DESPACHO')).toBe(true)
    expect(podeTransicionar('EM_ROTA', 'CANCELADA')).toBe(true)
    expect(podeTransicionar('AGUARDANDO_DESPACHO', 'ENTREGUE')).toBe(false)
    expect(podeTransicionar('EM_ROTA', 'AGUARDANDO_DESPACHO')).toBe(false)
    expect(podeTransicionar('ENTREGUE', 'CANCELADA')).toBe(false)
  })

  it('só ENTREGUE, FALHA e CANCELADA são finais', () => {
    expect(STATUS_ENTREGA.filter(ehStatusFinal)).toEqual(['ENTREGUE', 'FALHA', 'CANCELADA'])
  })
})
