import { vi } from 'vitest'

/** Mapa devolvido pelo `useMap()` falso: registra o enquadramento pedido. */
export const mapaFalso = { fitBounds: vi.fn(), invalidateSize: vi.fn() }
