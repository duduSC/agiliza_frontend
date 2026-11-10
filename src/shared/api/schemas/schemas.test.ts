import { criarCaixaResponse, criarEntregaResponse } from '@/test/fabricas'
import { caixaResponseSchema, entregaResponseSchema } from '.'

describe('entregaResponseSchema', () => {
  it('aceita campos opcionais ausentes', () => {
    const resultado = entregaResponseSchema.safeParse(criarEntregaResponse())
    expect(resultado.success).toBe(true)
  })

  it('aceita campos opcionais vindo como null', () => {
    const resultado = entregaResponseSchema.safeParse({
      ...criarEntregaResponse(),
      pedidoExternoId: null,
      loteId: null,
      reciboId: null,
      coordenada: null,
      valorRepasse: null,
      distanciaKm: null,
      formaPagamento: null,
      motivoRevisao: null,
      prontoParaDespachoEm: null,
      atualizadoEm: null,
    })
    expect(resultado.success).toBe(true)
    if (resultado.success) expect(resultado.data.valorRepasse).toBeNull()
  })

  it('rejeita status inválido', () => {
    const resultado = entregaResponseSchema.safeParse({
      ...criarEntregaResponse(),
      status: 'EM_PREPARO',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita motivoRevisao fora dos 3 oficiais', () => {
    const resultado = entregaResponseSchema.safeParse({
      ...criarEntregaResponse(),
      pendenteRevisao: true,
      motivoRevisao: 'OUTRO',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita data com fuso (o backend manda LocalDateTime sem fuso)', () => {
    const resultado = entregaResponseSchema.safeParse({
      ...criarEntregaResponse(),
      criadoEm: '2026-11-09T21:30:00Z',
    })
    expect(resultado.success).toBe(false)
  })
})

describe('caixaResponseSchema', () => {
  it('aceita o caixa de exemplo e rejeita status inexistente', () => {
    expect(caixaResponseSchema.safeParse(criarCaixaResponse()).success).toBe(true)
    expect(
      caixaResponseSchema.safeParse({ ...criarCaixaResponse(), status: 'PENDENTE' }).success,
    ).toBe(false)
  })
})
