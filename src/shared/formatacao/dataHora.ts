/**
 * Datas (AGENT.md 6.6): o backend usa `LocalDateTime`/`LocalDate` SEM fuso, sempre no
 * horário de America/Sao_Paulo. Recebendo: interpretar como horário de São Paulo.
 * Enviando: mesmo formato, sem `Z` e sem offset.
 *
 * Tudo aqui passa por `date-fns-tz` com o fuso explícito, então o resultado não depende
 * do fuso do navegador/da máquina.
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { VALOR_INDEFINIDO } from './moeda'

export const FUSO_PADRAO = 'America/Sao_Paulo'

const REGEX_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/
const REGEX_LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Converte um `LocalDateTime` do backend (horário de São Paulo) no instante real. */
export function instanteDeLocalDateTime(valor: string): Date {
  if (!REGEX_LOCAL_DATE_TIME.test(valor)) {
    throw new Error('LocalDateTime inválido (esperado sem fuso, ex.: 2026-11-09T21:30:00)')
  }
  return fromZonedTime(valor, FUSO_PADRAO)
}

/** "2026-11-09T21:30:00" → "09/11/2026 21:30". `null`/`undefined` → "—". */
export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return VALOR_INDEFINIDO
  return formatInTimeZone(instanteDeLocalDateTime(valor), FUSO_PADRAO, 'dd/MM/yyyy HH:mm')
}

/** "2026-11-09T21:30:00" → "21:30". */
export function formatarHora(valor: string | null | undefined): string {
  if (!valor) return VALOR_INDEFINIDO
  return formatInTimeZone(instanteDeLocalDateTime(valor), FUSO_PADRAO, 'HH:mm')
}

/** `LocalDate` "2026-11-09" → "09/11/2026" (sem conversão de fuso: é uma data de calendário). */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return VALOR_INDEFINIDO
  const partes = REGEX_LOCAL_DATE.exec(valor)
  if (!partes) throw new Error('LocalDate inválido (esperado ex.: 2026-11-09)')
  const [, ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}

/** Saída para o backend: instante → `LocalDateTime` de São Paulo, sem `Z` nem offset. */
export function paraLocalDateTimeBackend(instante: Date): string {
  return formatInTimeZone(instante, FUSO_PADRAO, "yyyy-MM-dd'T'HH:mm:ss")
}

/** Saída para o backend: instante → `LocalDate` de São Paulo. */
export function paraLocalDateBackend(instante: Date): string {
  return formatInTimeZone(instante, FUSO_PADRAO, 'yyyy-MM-dd')
}
