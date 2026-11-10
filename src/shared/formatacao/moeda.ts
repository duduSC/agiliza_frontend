/**
 * Formatação de dinheiro (Constituição, Artigo 5.1). O frontend só EXIBE valores que
 * vieram do backend; nunca soma para mostrar total oficial.
 */

/** Placeholder para valor ainda não calculado pelo backend — nunca "R$ 0,00". */
export const VALOR_INDEFINIDO = '—'

const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * `formatarMoeda(9)` → "R$ 9,00" (o Intl usa espaço não separável U+00A0 entre "R$" e o número).
 * `null`/`undefined`/não finito → "—".
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return VALOR_INDEFINIDO
  return formatadorBRL.format(valor)
}

/** Para ENVIAR ao backend: no máximo 2 casas decimais (AGENT.md 6.6). */
export function paraValorMonetarioBackend(valor: number): number {
  return Math.round(valor * 100) / 100
}
