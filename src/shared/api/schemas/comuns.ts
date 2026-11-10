import { z } from 'zod'

/** UUID (java.util.UUID). */
export const uuid = z.uuid()

/** `LocalDateTime` do Java: sem fuso, ex. "2026-11-09T21:30:00" (AGENT.md 6.6). */
export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/, 'LocalDateTime inválido')

/** `LocalDate` do Java, ex. "2026-11-09". */
export const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'LocalDate inválido')

/** BigDecimal serializado como número pelo Jackson. */
export const decimal = z.number()

/** Short/Integer. */
export const inteiro = z.number().int()

/**
 * Campo opcional de resposta: aceita ausente ou `null` (AGENT.md 6.3, último parágrafo).
 */
export function opcional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional()
}
