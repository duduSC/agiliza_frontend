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
import { MapContainer, Marker, Popup, Tooltip } from 'react-leaflet'
import type L from 'leaflet'
import type { MotoboyResponse } from '@/shared/api/schemas'
import type { StatusDisponibilidadeMotoboy } from '@/shared/dominio/enums'
import { LABEL_STATUS_DISPONIBILIDADE_MOTOBOY } from '@/shared/dominio/enums'
import { formatarHora } from '@/shared/formatacao'
import { CamadaMapaClaro } from '@/shared/ui/mapa/CamadaMapaClaro'
import { EnquadrarMapa } from '@/shared/ui/mapa/EnquadrarMapa'
import type { PontoDoMapa } from '@/shared/ui/mapa/enquadramento'
import { PINO_AMBAR, PINO_AZUL, PINO_VERDE, PINO_VERMELHO } from '@/shared/ui/mapa/icones'
import { posicaoDesatualizada } from '../util'
import 'leaflet/dist/leaflet.css'

function iconeDoEntregador(status: StatusDisponibilidadeMotoboy, desatualizado: boolean): L.Icon {
  if (desatualizado) return PINO_AMBAR
  if (status === 'EM_ROTA') return PINO_VERDE
  return PINO_AZUL
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
    // Centrar no primeiro entregador com posicao, ou num centro neutro
    const comPosicao = entregadores.find((e) => e.ultimaPosicao)
    if (comPosicao?.ultimaPosicao) {
      return [comPosicao.ultimaPosicao.latitude, comPosicao.ultimaPosicao.longitude]
    }
    return [-15.78, -47.93]
  }, [coordenadaLoja, entregadores])

  const entregadoresComPosicao = useMemo(
    () => entregadores.filter((e) => e.ultimaPosicao != null),
    [entregadores],
  )

  const pontos = useMemo<PontoDoMapa[]>(
    () => [
      ...(coordenadaLoja ? [{ id: 'loja', ...coordenadaLoja }] : []),
      ...entregadoresComPosicao.map((e) => ({ id: e.id, ...e.ultimaPosicao! })),
    ],
    [coordenadaLoja, entregadoresComPosicao],
  )

  return (
    <div
      className="relative isolate h-[calc(100dvh-15rem)] min-h-[340px] w-full rounded-lg border"
      role="region"
      aria-label="Mapa da frota em tempo real"
    >
      <MapContainer
        center={centro}
        zoom={13}
        className="h-full w-full rounded-lg"
        scrollWheelZoom
      >
        <CamadaMapaClaro />

        <EnquadrarMapa pontos={pontos} />

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
          </Marker>
        )}

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
      title={`${entregador.nome}: ${labelStatus}`}
      alt={`${entregador.nome}: ${labelStatus}`}
    >
      <Tooltip permanent direction="top">
        {entregador.nome.split(' ')[0]} · {desatualizado ? 'Sem sinal' : labelStatus}
      </Tooltip>
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
            <span className="text-muted-foreground">Última posição: </span>
            {formatarHora(entregador.ultimaPosicaoEm)}
          </p>
          {desatualizado && (
            <p className="mt-1 font-medium text-amber-700" role="alert">
              Posição desatualizada (mais de 3 min)
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
