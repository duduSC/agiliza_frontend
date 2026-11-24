/**
 * Mapa Leaflet da operação unificada (T004, UC01 HU01; T010, D013 decisão 3 + UC04 HU08).
 * react-leaflet 4 com o OSM claro e sem chave (`CamadaMapaClaro`; Constituição 6.6).
 *
 * - Loja: pino verde com casa.
 * - Pedidos: círculo com o número do card da coluna à direita. Aguardando: borda verde, e clicar
 *   seleciona (a ordem de seleção aparece como "Parada N"). Saiu para entrega: borda azul
 *   tracejada, só consulta.
 * - Entregadores ONLINE e EM_ROTA na última posição: círculo branco com moto e o nome à direita
 *   (HU08), num painel abaixo dos marcadores; borda âmbar tracejada e "Sem sinal" depois de 3 min
 *   sem posição (UC04 A1). Andam pelo tópico de frota, com polling de reserva (quem invalida é
 *   `useTempoRealDespacho`).
 * - Entrega sem coordenada nunca vai ao mapa (HU01). Revisão de localização com coordenada: pino
 *   âmbar arrastável (R04).
 * - O que se clica fica por cima: revisão, depois pedido aguardando, depois entregador.
 * - Cor nunca é o único indicador: número, forma, título, rótulo e legenda (Constituição 7.6).
 */
import { useCallback, useMemo, useState } from 'react'
import { MapContainer, Marker, Pane, Popup, Tooltip } from 'react-leaflet'
import type L from 'leaflet'
import { toast } from 'sonner'
import type { EntregaResponse, MotoboyResponse } from '@/shared/api'
import { LABEL_STATUS_DISPONIBILIDADE_MOTOBOY, LABEL_STATUS_ENTREGA } from '@/shared/dominio'
import { formatarHora, formatarKm, formatarMoeda } from '@/shared/formatacao'
import { CamadaMapaClaro } from '@/shared/ui/mapa/CamadaMapaClaro'
import { EnquadrarMapa } from '@/shared/ui/mapa/EnquadrarMapa'
import type { PontoDoMapa } from '@/shared/ui/mapa/enquadramento'
import { PINO_AMBAR } from '@/shared/ui/mapa/icones'
import { ICONE_LOJA, ICONES_ENTREGADOR, iconePedido } from '@/shared/ui/mapa/iconesOperacao'
import { useAjustarCoordenada, useEntregasEmRevisao } from '../api/hooks'
import { avisarResultadoDoPino } from '../avisos'
import { centroDoMapa, type CoordenadaLoja } from '../mapa'
import { estadoNoMapa, ROTULO_ESTADO_ENTREGADOR, type ItemOperacao } from '../operacao'
import { podeAjustarCoordenada } from '../regras'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro } from '../util'
import 'leaflet/dist/leaflet.css'

/** Camadas: o que se clica ou arrasta fica por cima do que só informa. */
const CAMADA = { entregador: 400, aguardando: 800, revisao: 900 } as const

/**
 * Os nomes dos entregadores ficam num painel abaixo do de marcadores (600 no Leaflet): no painel
 * padrão de tooltips (650) um nome cobria o círculo de um pedido ou o pino da loja.
 */
const PAINEL_ROTULOS = 'rotulosEntregadores'
const ESTILO_PAINEL_ROTULOS = { zIndex: 590 } as const

type Props = {
  /** Coordenada da loja (`GET /api/estabelecimento`); `null` enquanto carrega ou se falhar. */
  coordenadaLoja: CoordenadaLoja
  /** Pedidos numerados do filtro atual (`montarItensOperacao`). */
  itens: readonly ItemOperacao[]
  /** Entregadores ONLINE/EM_ROTA (frota). */
  entregadores: readonly MotoboyResponse[]
  agora: Date
}

export function MapaDespacho({ coordenadaLoja, itens, entregadores, agora }: Props) {
  const { data: revisao } = useEntregasEmRevisao()

  // Sem coordenada nunca vai ao mapa (HU01).
  const itensNoMapa = useMemo(() => itens.filter((i) => i.entrega.coordenada != null), [itens])
  const entregadoresNoMapa = useMemo(() => entregadores.filter((m) => m.ultimaPosicao != null), [entregadores])

  // Revisão de localização com coordenada (arrastável): "Reposicionar pino" (T010).
  const revisaoComCoordenada = useMemo(
    () => (revisao ?? []).filter((e) => podeAjustarCoordenada(e) && e.coordenada != null),
    [revisao],
  )

  // "Enquadrar todos" é todos: loja, pedidos, revisão e entregadores. O enquadramento automático só
  // acontece quando o CONJUNTO muda (EnquadrarMapa), então um entregador andando não tira o zoom
  // que o operador escolheu.
  const pontos = useMemo<PontoDoMapa[]>(
    () => [
      ...(coordenadaLoja ? [{ id: 'loja', ...coordenadaLoja }] : []),
      ...[...itensNoMapa.map((i) => i.entrega), ...revisaoComCoordenada].map((e) => ({
        id: e.id,
        ...e.coordenada!,
      })),
      ...entregadoresNoMapa.map((m) => ({ id: `entregador-${m.id}`, ...m.ultimaPosicao! })),
    ],
    [coordenadaLoja, itensNoMapa, revisaoComCoordenada, entregadoresNoMapa],
  )

  // O `center` só vale na montagem; depois quem posiciona é o EnquadrarMapa.
  const centro = centroDoMapa(
    coordenadaLoja,
    itensNoMapa.map((i) => i.entrega),
  )

  return (
    <div
      className="relative isolate h-[calc(100dvh-15rem)] min-h-[380px] w-full rounded-lg border"
      role="region"
      aria-label="Mapa de entregas e entregadores"
    >
      <MapContainer center={centro} zoom={13} className="h-full w-full rounded-lg" scrollWheelZoom>
        <CamadaMapaClaro />
        <Pane name={PAINEL_ROTULOS} style={ESTILO_PAINEL_ROTULOS} />

        <EnquadrarMapa pontos={pontos} />

        {coordenadaLoja && (
          <Marker position={[coordenadaLoja.latitude, coordenadaLoja.longitude]} icon={ICONE_LOJA} title="Loja">
            <Popup>
              <strong>Loja</strong>
            </Popup>
          </Marker>
        )}

        {entregadoresNoMapa.map((m) => (
          <PinoEntregador key={m.id} entregador={m} agora={agora} />
        ))}

        {itensNoMapa.map((item) =>
          item.emSaida ? (
            <PinoEmSaida key={item.entrega.id} item={item} />
          ) : (
            <PinoAguardando key={item.entrega.id} item={item} />
          ),
        )}

        {revisaoComCoordenada.map((entrega) => (
          <PinoRevisaoArrastavel key={entrega.id} entrega={entrega} />
        ))}
      </MapContainer>
    </div>
  )
}

function PinoEntregador({ entregador, agora }: { entregador: MotoboyResponse; agora: Date }) {
  if (!entregador.ultimaPosicao) return null
  const estado = estadoNoMapa(entregador, agora)
  const rotulo = ROTULO_ESTADO_ENTREGADOR[estado]
  const primeiroNome = entregador.nome.trim().split(/\s+/)[0]
  return (
    <Marker
      position={[entregador.ultimaPosicao.latitude, entregador.ultimaPosicao.longitude]}
      icon={ICONES_ENTREGADOR[estado]}
      title={`Entregador ${entregador.nome}: ${rotulo}`}
      zIndexOffset={CAMADA.entregador}
    >
      {/* HU08: o ícone é identificado com o nome; o estado vai junto, em texto. */}
      <Tooltip permanent direction="right" className="rotulo-entregador" pane={PAINEL_ROTULOS}>
        {primeiroNome} · {rotulo}
      </Tooltip>
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entregador.nome}</p>
          <p>Status: {LABEL_STATUS_DISPONIBILIDADE_MOTOBOY[entregador.statusDisponibilidade]}</p>
          <p>Última posição: {formatarHora(entregador.ultimaPosicaoEm)}</p>
          {estado === 'SEM_SINAL' && (
            <p className="font-medium text-amber-700">Posição desatualizada (mais de 3 min)</p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

function PinoEmSaida({ item }: { item: ItemOperacao }) {
  const { entrega, numero } = item
  if (!entrega.coordenada) return null
  const status = LABEL_STATUS_ENTREGA[entrega.status]
  return (
    <Marker
      position={[entrega.coordenada.latitude, entrega.coordenada.longitude]}
      icon={iconePedido(numero, 'emSaida')}
      title={`Pedido ${numero}: entrega de ${entrega.nomeCliente} (${status})`}
    >
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">
            {numero}. {entrega.nomeCliente}
          </p>
          {entrega.bairro && <p className="text-muted-foreground">{entrega.bairro}</p>}
          <p>{status}</p>
          <p>Entregador: {item.entregador ?? '—'}</p>
        </div>
      </Popup>
    </Marker>
  )
}

function PinoAguardando({ item }: { item: ItemOperacao }) {
  const { entrega, numero } = item
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
      icon={iconePedido(numero, estaSelecionada ? 'selecionado' : 'aguardando')}
      title={`Pedido ${numero}: entrega de ${entrega.nomeCliente}${estaSelecionada ? ' (selecionada)' : ''}`}
      zIndexOffset={CAMADA.aguardando}
      eventHandlers={{ click: aoClicar }}
    >
      {posicao > 0 && (
        <Tooltip permanent direction="top">
          Parada <strong>{posicao}</strong>
        </Tooltip>
      )}
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">
            {numero}. {entrega.nomeCliente}
          </p>
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
  // O Leaflet já moveu o pino: na recusa, remonta para ele voltar ao que o servidor tem.
  const [recusas, setRecusas] = useState(0)

  const aoArrastarFim = useCallback(
    (evento: L.DragEndEvent) => {
      const marcador = evento.target as L.Marker
      const pos = marcador.getLatLng()
      ajustar.mutate(
        { id: entrega.id, coordenada: { latitude: Number(pos.lat.toFixed(7)), longitude: Number(pos.lng.toFixed(7)) } },
        {
          onSuccess: (atualizada) => avisarResultadoDoPino(atualizada),
          onError: (erro) => {
            setRecusas((n) => n + 1)
            toast.error(mensagemDoErro(erro))
          },
        },
      )
    },
    [entrega.id, ajustar],
  )

  if (!entrega.coordenada) return null

  return (
    <Marker
      key={recusas}
      position={[entrega.coordenada.latitude, entrega.coordenada.longitude]}
      icon={PINO_AMBAR}
      title={`Em revisão: entrega de ${entrega.nomeCliente}`}
      draggable
      zIndexOffset={CAMADA.revisao}
      eventHandlers={{ dragend: aoArrastarFim }}
    >
      <Popup>
        <div className="min-w-[160px] text-sm">
          <p className="font-semibold">{entrega.nomeCliente}</p>
          <p className="text-amber-700">
            Revisão: {entrega.motivoRevisao === 'SEM_DISTANCIA' ? 'distância não calculada' : 'sem coordenada'}
          </p>
          <p className="text-xs">Arraste o pino para definir a posição</p>
        </div>
      </Popup>
    </Marker>
  )
}
