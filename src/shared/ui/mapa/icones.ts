import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

/**
 * Ícones sempre explícitos (T008): `icon={undefined}` no `<Marker>` quebra o Leaflet em
 * "reading 'createIcon'". O pino original é azul; os filtros giram o matiz dele.
 */
function pino(className?: string, escala = 1): L.Icon {
  return new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25 * escala, 41 * escala],
    iconAnchor: [12.5 * escala, 41 * escala],
    popupAnchor: [1, -34 * escala],
    tooltipAnchor: [0, -38 * escala],
    shadowSize: [41, 41],
    ...(className ? { className } : {}),
  })
}

export const PINO_AZUL = pino()
export const PINO_VERDE = pino('hue-rotate-[280deg] saturate-200')
export const PINO_VERDE_GRANDE = pino('hue-rotate-[280deg] saturate-200', 1.2)
export const PINO_AMBAR = pino('hue-rotate-[200deg] saturate-[3] brightness-110')
export const PINO_VERMELHO = pino('hue-rotate-[155deg] saturate-200')
