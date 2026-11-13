/**
 * Mapa Leaflet do monitoramento da frota (T005, UC04 HU08).
 *
 * - Um marcador para cada entregador ONLINE ou EM_ROTA na ultimaPosicao.
 * - Identificacao por nome e indicador visual de disponibilidade.
 * - Cor NAO e o unico indicador de status (Constituicao 7.6): texto e icone acompanham.
 * - Entregador sem posicao ha mais de 3 min: icone de alerta (UC04 A1).
 * - Somente consulta: nenhuma acao altera estado.
 */
import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { MotoboyResponse } from '@/shared/api/schemas'
import type { StatusDisponibilidadeMotoboy } from '@/shared/dominio/enums'
import { LABEL_STATUS_DISPONIBILIDADE_MOTOBOY } from '@/shared/dominio/enums'
import { formatarHora } from '@/shared/formatacao'
import { posicaoDesatualizada } from '../util'
import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/** Icone azul para ONLINE (cor de fundo padrao do Leaflet, sem filtro). */
const ICONE_ONLINE = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** Icone verde para EM_ROTA. */
const ICONE_EM_ROTA = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[120deg] saturate-200',
})

/** Icone vermelho/alaranjado para posicao desatualizada (> 3 min). */
const ICONE_ALERTA = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[-30deg] saturate-200',
})

function iconeDoEntregador(status: StatusDisponibilidadeMotoboy, desatualizado: boolean): L.Icon {
  if (desatualizado) return ICONE_ALERTA
  if (status === 'EM_ROTA') return ICONE_EM_ROTA
  return ICONE_ONLINE
}

type CoordenadaLoja = { latitude: number; longitude: number } | null

type Props = {
  entregadores: MotoboyResponse[]
  coordenadaLoja: CoordenadaLoja
  agora: Date
}

export function MapaFrota({ entregadores, coordenadaLoja, agora }: Props) {
  const centro = useMemo<[number, number]>(() => {
    if (coordenadaLoja) return [coordenadaLoja.latitude, coordenadaLoja.longitude]
    // Centrar no primeiro entregador com posicao, ou Sao Paulo
    const comPosicao = entregadores.find((e) => e.ultimaPosicao)
    if (comPosicao?.ultimaPosicao) {
      return [comPosicao.ultimaPosicao.latitude, comPosicao.ultimaPosicao.longitude]
    }
    return [-23.55, -46.63]
  }, [coordenadaLoja, entregadores])

  const entregadoresComPosicao = useMemo(
    () => entregadores.filter((e) => e.ultimaPosicao != null),
    [entregadores],
  )

  return (
    <div
      className="relative h-[500px] w-full rounded-lg border"
      role="application"
      aria-label="Mapa da frota em tempo real"
    >
      <MapContainer
        center={centro}
        zoom={13}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {entregadoresComPosicao.map((entregador) => (
          <MarcadorEntregador
            key={entregador.id}
            entregador={entregador}
            agora={agora}
          />
        ))}
      </MapContainer>
    </div>
  )
}

function MarcadorEntregador({ entregador, agora }: { entregador: MotoboyResponse; agora: Date }) {
  if (!entregador.ultimaPosicao) return null

  const desatualizado = posicaoDesatualizada(entregador.ultimaPosicaoEm, agora)
  const icone = iconeDoEntregador(entregador.statusDisponibilidade, desatualizado)
  const labelStatus = LABEL_STATUS_DISPONIBILIDADE_MOTOBOY[entregador.statusDisponibilidade]

  return (
    <Marker
      position={[entregador.ultimaPosicao.latitude, entregador.ultimaPosicao.longitude]}
      icon={icone}
    >
      <Popup>
        <div className="min-w-[180px] text-sm">
          <p className="font-semibold">{entregador.nome}</p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {labelStatus}
          </p>
          {entregador.placaVeiculo && (
            <p>
              <span className="text-muted-foreground">Placa: </span>
              {entregador.placaVeiculo}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Ultima posicao: </span>
            {formatarHora(entregador.ultimaPosicaoEm)}
          </p>
          {desatualizado && (
            <p className="mt-1 font-medium text-amber-700" role="alert">
              Posicao desatualizada (mais de 3 min)
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
