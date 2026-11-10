import { VALOR_INDEFINIDO } from './moeda'

const formatadorKm = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

/** `formatarKm(3.25)` → "3,25 km"; `null`/`undefined` → "—" (distância ainda não calculada). */
export function formatarKm(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return VALOR_INDEFINIDO
  return `${formatadorKm.format(km)} km`
}
