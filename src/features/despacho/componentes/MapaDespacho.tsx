/**
 * Mapa Leaflet do despacho (T004, UC01 HU01). react-leaflet 4 + OpenStreetMap (sem chave).
 *
 * - Pino da loja no centro.
 * - Um pino para cada entrega AGUARDANDO_DESPACHO com coordenada.
 * - Entrega sem coordenada (revisao SEM_COORDENADA) NAO aparece no mapa (HU01).
 * - Clicar no pino seleciona/desseleciona a entrega.
 * - Popup com resumo (cliente, bairro, distancia, repasse ou "--").
 * - Pino arrastavel para entregas em revisao SEM_COORDENADA (UC01 A1).
 * - Enquadra a loja e todos os pinos; rotulo de texto alem da cor (T009).
 */
import { useCallback, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet'
import type L from 'leaflet'
import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { formatarKm, formatarMoeda } from '@/shared/formatacao'
import { useAjustarCoordenada, useEntregasPendentes, useEntregasEmRevisao } from '../api/hooks'
import { centroDoMapa, type CoordenadaLoja } from '../mapa'
import { EnquadrarMapa } from '@/shared/ui/mapa/EnquadrarMapa'
import type { PontoDoMapa } from '@/shared/ui/mapa/enquadramento'
import { PINO_AMBAR, PINO_AZUL, PINO_VERDE_GRANDE, PINO_VERMELHO } from '@/shared/ui/mapa/icones'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro } from '../util'
import 'leaflet/dist/leaflet.css'

type Props = {
  /** Coordenada da loja (`GET /api/estabelecimento`); `null` enquanto carrega ou se falhar. */
  coordenadaLoja: CoordenadaLoja
}

export function MapaDespacho({ coordenadaLoja }: Props) {
  const { data: pendentes } = useEntregasPendentes()
  const { data: revisao } = useEntregasEmRevisao()

  // Entregas com coordenada (pendentes). Sem coordenada nunca vai ao mapa (HU01).
  const entregasNoMapa = useMemo(
    () => (pendentes ?? []).filter((e) => e.coordenada != null),
    [pendentes],
  )

  // Entregas em revisao SEM_COORDENADA que ja receberam coordenada (arrastavel).
  const revisaoComCoordenada = useMemo(
    () =>
      (revisao ?? []).filter(
        (e) => e.motivoRevisao === 'SEM_COORDENADA' && e.coordenada != null,
      ),
    [revisao],
  )

  const pontos = useMemo<PontoDoMapa[]>(
    () => [
      ...(coordenadaLoja ? [{ id: 'loja', ...coordenadaLoja }] : []),
      ...[...entregasNoMapa, ...revisaoComCoordenada].map((e) => ({ id: e.id, ...e.coordenada! })),
    ],
    [coordenadaLoja, entregasNoMapa, revisaoComCoordenada],
  )

  // O `center` so vale na montagem; depois quem posiciona e o EnquadrarMapa.
  const centro = centroDoMapa(coordenadaLoja, entregasNoMapa)

  return (
    <div
      className="relative isolate h-[50vh] min-h-[320px] w-full rounded-lg border"
      role="region"
      aria-label="Mapa de entregas"
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

        <EnquadrarMapa pontos={pontos} />

        {/* Pino da loja */}
        {coordenadaLoja && (
          <Marker
            position={[coordenadaLoja.latitude, coordenadaLoja.longitude]}
            icon={PINO_VERMELHO}
            title="Loja"
            alt="Loja"
          >
            <Tooltip permanent direction="top">
              Loja
            </Tooltip>
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
  const posicao = useSelecaoStore((s) => [...s.selecionadas].indexOf(entrega.id) + 1)

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
      icon={estaSelecionada ? PINO_VERDE_GRANDE : PINO_AZUL}
      title={`Entrega de ${entrega.nomeCliente}`}
      alt={`Entrega de ${entrega.nomeCliente}`}
      eventHandlers={{ click: aoClicar }}
    >
      {posicao > 0 && (
        <Tooltip permanent direction="top">
          <strong>{posicao}</strong>
        </Tooltip>
      )}
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entrega.nomeCliente}</p>
          {entrega.bairro && <p className="text-muted-foreground">{entrega.bairro}</p>}
          <p>Distância: {formatarKm(entrega.distanciaKm)}</p>
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
  // O Leaflet ja moveu o pino: na recusa, remonta para ele voltar ao que o servidor tem.
  const [recusas, setRecusas] = useState(0)

  const aoArrastarFim = useCallback(
    (evento: L.DragEndEvent) => {
      const marcador = evento.target as L.Marker
      const pos = marcador.getLatLng()
      ajustar.mutate(
        { id: entrega.id, coordenada: { latitude: Number(pos.lat.toFixed(7)), longitude: Number(pos.lng.toFixed(7)) } },
        {
          onSuccess: () =>
            toast.success(
              `Coordenada de ${entrega.nomeCliente} atualizada. A distância é recalculada pelo sistema.`,
            ),
          onError: (erro) => {
            setRecusas((n) => n + 1)
            toast.error(mensagemDoErro(erro))
          },
        },
      )
    },
    [entrega.id, entrega.nomeCliente, ajustar],
  )

  if (!entrega.coordenada) return null

  return (
    <Marker
      key={recusas}
      position={[entrega.coordenada.latitude, entrega.coordenada.longitude]}
      icon={PINO_AMBAR}
      title={`Em revisão: entrega de ${entrega.nomeCliente}`}
      draggable
      eventHandlers={{ dragend: aoArrastarFim }}
    >
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entrega.nomeCliente}</p>
          <p className="text-amber-700">Revisão: sem coordenada</p>
          <p className="text-xs">Arraste o pino para definir a posição</p>
        </div>
      </Popup>
    </Marker>
  )
}
