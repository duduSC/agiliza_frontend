/**
 * Mapa Leaflet do despacho (T004, UC01 HU01). react-leaflet 4 + OpenStreetMap (sem chave).
 *
 * - Pino da loja no centro.
 * - Um pino para cada entrega AGUARDANDO_DESPACHO com coordenada.
 * - Entrega sem coordenada (revisao SEM_COORDENADA) NAO aparece no mapa (HU01).
 * - Clicar no pino seleciona/desseleciona a entrega.
 * - Popup com resumo (cliente, bairro, distancia, repasse ou "--").
 * - Pino arrastavel para entregas em revisao SEM_COORDENADA (UC01 A1).
 */
import { useCallback, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { formatarKm, formatarMoeda } from '@/shared/formatacao'
import { useAjustarCoordenada, useEntregasPendentes, useEntregasEmRevisao } from '../api/hooks'
import { useSelecaoStore } from '../selecaoStore'
import 'leaflet/dist/leaflet.css'

// Corrigir icones padrao do Leaflet em builds com bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const ICONE_LOJA = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[200deg] saturate-150',
})

const ICONE_SELECIONADO = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
  className: 'hue-rotate-[120deg] saturate-200',
})

const ICONE_REVISAO = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[40deg] saturate-200',
})

type CoordenadaLoja = { latitude: number; longitude: number } | null

type Props = {
  coordenadaLoja: CoordenadaLoja
}

export function MapaDespacho({ coordenadaLoja }: Props) {
  const { data: pendentes } = useEntregasPendentes()
  const { data: revisao } = useEntregasEmRevisao()

  // Centro: coordenada da loja ou padrao (Sao Paulo)
  const centro = useMemo<[number, number]>(() => {
    if (coordenadaLoja) return [coordenadaLoja.latitude, coordenadaLoja.longitude]
    return [-23.55, -46.63]
  }, [coordenadaLoja])

  // Entregas com coordenada (pendentes)
  const entregasNoMapa = useMemo(
    () => (pendentes ?? []).filter((e) => e.coordenada != null),
    [pendentes],
  )

  // Entregas em revisao SEM_COORDENADA que ja receberam coordenada (arrastavel)
  // Na verdade, SEM_COORDENADA nao tem coordenada -- entao nao aparece no mapa (HU01).
  // So aparece no mapa se o operador definir via arrastar.
  // Para isso, mostramos as revisao SEM_COORDENADA com coordenada (que ja foi ajustada).
  const revisaoComCoordenada = useMemo(
    () =>
      (revisao ?? []).filter(
        (e) => e.motivoRevisao === 'SEM_COORDENADA' && e.coordenada != null,
      ),
    [revisao],
  )

  return (
    <div className="relative h-[500px] w-full rounded-lg border" role="application" aria-label="Mapa de entregas">
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

        {/* Pino da loja */}
        {coordenadaLoja && (
          <Marker
            position={[coordenadaLoja.latitude, coordenadaLoja.longitude]}
            icon={ICONE_LOJA}
          >
            <Popup>
              <strong>Estabelecimento</strong>
            </Popup>
          </Marker>
        )}

        {/* Pinos das entregas pendentes */}
        {entregasNoMapa.map((entrega) => (
          <PinoEntrega key={entrega.id} entrega={entrega} />
        ))}

        {/* Pinos arrastaveis das entregas em revisao SEM_COORDENADA (ja ajustadas) */}
        {revisaoComCoordenada.map((entrega) => (
          <PinoRevisaoArrastavel key={entrega.id} entrega={entrega} />
        ))}
      </MapContainer>
    </div>
  )
}

function PinoEntrega({ entrega }: { entrega: EntregaResponse }) {
  const estaSelecionada = useSelecaoStore((s) => s.selecionadas.has(entrega.id))
  const alternarSelecao = useSelecaoStore((s) => s.alternarSelecao)
  const limiteAtingido = useSelecaoStore((s) => s.limiteAtingido)
  const maxPedidosPorLote = useSelecaoStore((s) => s.maxPedidosPorLote)

  const aoClicar = useCallback(() => {
    const sucesso = alternarSelecao(entrega.id)
    if (!sucesso) {
      toast.error(
        `Limite de ${maxPedidosPorLote} entregas por lote atingido. Remova uma entrega antes de adicionar outra.`,
      )
    }
  }, [entrega.id, alternarSelecao, maxPedidosPorLote])

  if (!entrega.coordenada) return null

  return (
    <Marker
      position={[entrega.coordenada.latitude, entrega.coordenada.longitude]}
      icon={estaSelecionada ? ICONE_SELECIONADO : undefined}
      eventHandlers={{ click: aoClicar }}
    >
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entrega.nomeCliente}</p>
          {entrega.bairro && <p className="text-muted-foreground">{entrega.bairro}</p>}
          <p>Distancia: {formatarKm(entrega.distanciaKm)}</p>
          <p>Repasse: {formatarMoeda(entrega.valorRepasse)}</p>
          <p className="mt-1 text-xs">
            {estaSelecionada ? 'Selecionada' : limiteAtingido() ? 'Limite atingido' : 'Clique para selecionar'}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}

function PinoRevisaoArrastavel({ entrega }: { entrega: EntregaResponse }) {
  const ajustar = useAjustarCoordenada()

  const aoArrastarFim = useCallback(
    (evento: L.DragEndEvent) => {
      const marcador = evento.target as L.Marker
      const pos = marcador.getLatLng()
      ajustar.mutate(
        { id: entrega.id, coordenada: { latitude: pos.lat, longitude: pos.lng } },
        {
          onSuccess: () =>
            toast.success(
              `Coordenada de ${entrega.nomeCliente} atualizada. A distancia e recalculada pelo sistema.`,
            ),
          onError: () =>
            toast.error('Nao foi possivel atualizar a coordenada. Tente novamente.'),
        },
      )
    },
    [entrega.id, entrega.nomeCliente, ajustar],
  )

  if (!entrega.coordenada) return null

  return (
    <Marker
      position={[entrega.coordenada.latitude, entrega.coordenada.longitude]}
      icon={ICONE_REVISAO}
      draggable
      eventHandlers={{ dragend: aoArrastarFim }}
    >
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entrega.nomeCliente}</p>
          <p className="text-amber-700">Revisao: sem coordenada</p>
          <p className="text-xs">Arraste o pino para definir a posicao</p>
        </div>
      </Popup>
    </Marker>
  )
}
