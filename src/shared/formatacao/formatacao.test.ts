import {
  formatarData,
  formatarDataHora,
  formatarHora,
  formatarKm,
  formatarMoeda,
  instanteDeLocalDateTime,
  paraLocalDateBackend,
  paraLocalDateTimeBackend,
  paraValorMonetarioBackend,
} from '.'

/** O Intl separa "R$" do número com U+00A0; normaliza para comparar com o texto do critério. */
const normalizarEspacos = (texto: string) => texto.replace(/\s/g, ' ')

describe('formatarMoeda (Constituição 5.1)', () => {
  it('formatarMoeda(9) → "R$ 9,00"', () => {
    expect(normalizarEspacos(formatarMoeda(9))).toBe('R$ 9,00')
  })

  it('formata milhar e centavos em pt-BR', () => {
    expect(normalizarEspacos(formatarMoeda(1234.5))).toBe('R$ 1.234,50')
  })

  it('null → "—", nunca R$ 0,00', () => {
    expect(formatarMoeda(null)).toBe('—')
  })

  it('undefined e NaN → "—"', () => {
    expect(formatarMoeda(undefined)).toBe('—')
    expect(formatarMoeda(Number.NaN)).toBe('—')
  })

  it('zero de verdade continua R$ 0,00', () => {
    expect(normalizarEspacos(formatarMoeda(0))).toBe('R$ 0,00')
  })

  it('paraValorMonetarioBackend limita a 2 casas', () => {
    expect(paraValorMonetarioBackend(12.345)).toBe(12.35)
    expect(paraValorMonetarioBackend(7)).toBe(7)
  })
})

describe('formatarKm', () => {
  it('formata em pt-BR com sufixo km', () => {
    expect(formatarKm(3.25)).toBe('3,25 km')
    expect(formatarKm(4)).toBe('4,0 km')
  })

  it('null → "—"', () => {
    expect(formatarKm(null)).toBe('—')
  })
})

describe('datas (AGENT.md 6.6)', () => {
  it('formatarDataHora não desloca o horário do LocalDateTime', () => {
    expect(formatarDataHora('2026-11-09T21:30:00')).toBe('09/11/2026 21:30')
    expect(formatarDataHora('2026-11-09T23:59:59.123456')).toBe('09/11/2026 23:59')
    expect(formatarDataHora('2026-01-01T00:05')).toBe('01/01/2026 00:05')
    expect(formatarHora('2026-11-09T07:00:00')).toBe('07:00')
  })

  it('formatarDataHora(null) → "—"', () => {
    expect(formatarDataHora(null)).toBe('—')
  })

  it('rejeita string com fuso na entrada (não é LocalDateTime)', () => {
    expect(() => formatarDataHora('2026-11-09T21:30:00Z')).toThrow()
  })

  it('interpreta o LocalDateTime como horário de São Paulo (UTC-3)', () => {
    expect(instanteDeLocalDateTime('2026-11-09T21:30:00').toISOString()).toBe(
      '2026-11-10T00:30:00.000Z',
    )
  })

  it('formatarData de LocalDate', () => {
    expect(formatarData('2026-11-09')).toBe('09/11/2026')
  })

  it('saída para o backend não tem Z nem offset', () => {
    const saida = paraLocalDateTimeBackend(new Date('2026-11-10T00:30:00.000Z'))
    expect(saida).toBe('2026-11-09T21:30:00')
    expect(saida).not.toMatch(/Z|[+-]\d{2}:?\d{2}$/)
    expect(paraLocalDateBackend(new Date('2026-11-10T00:30:00.000Z'))).toBe('2026-11-09')
  })

  it('ida e volta preserva o valor', () => {
    const original = '2026-11-09T21:30:00'
    expect(paraLocalDateTimeBackend(instanteDeLocalDateTime(original))).toBe(original)
  })
})
