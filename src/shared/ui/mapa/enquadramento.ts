export type PontoDoMapa = { id: string; latitude: number; longitude: number }

export type Limites = [sudoeste: [number, number], nordeste: [number, number]]

/** Menor retângulo com todos os pontos; `null` sem pontos. */
export function limitesDoMapa(pontos: readonly PontoDoMapa[]): Limites | null {
  if (pontos.length === 0) return null
  const latitudes = pontos.map((p) => p.latitude)
  const longitudes = pontos.map((p) => p.longitude)
  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ]
}
