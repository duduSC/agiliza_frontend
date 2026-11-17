/** Regras puras do mapa de despacho (T008), fora do componente para o fast refresh. */
import type { EntregaResponse } from '@/shared/api'

export type CoordenadaLoja = { latitude: number; longitude: number } | null

/** Centro neutro so quando nao ha loja nem entrega com coordenada. */
const CENTRO_PADRAO: [number, number] = [-15.78, -47.93]

/**
 * Centro do mapa: a loja; sem ela, a primeira entrega com coordenada; sem nenhuma, um centro
 * neutro. Antes da T008 o centro era fixo em Sao Paulo e, com o backend real (loja em Passo
 * Fundo/RS), os pinos ficavam fora da area visivel.
 */
export function centroDoMapa(
  coordenadaLoja: CoordenadaLoja,
  entregas: readonly EntregaResponse[],
): [number, number] {
  if (coordenadaLoja) return [coordenadaLoja.latitude, coordenadaLoja.longitude]
  const primeira = entregas.find((e) => e.coordenada != null)?.coordenada
  if (primeira) return [primeira.latitude, primeira.longitude]
  return CENTRO_PADRAO
}
