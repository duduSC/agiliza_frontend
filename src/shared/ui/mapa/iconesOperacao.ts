import L from 'leaflet'

/**
 * Ícones da operação unificada (T010, referência visual): loja em pino verde com casa, entregador
 * em círculo branco com moto, pedido em círculo branco de borda verde com o número do card.
 *
 * O HTML é montado só com constantes deste arquivo e com o número do item, um inteiro gerado no
 * cliente: nenhum texto vindo da API entra nele (Constituição 6.5). A cor nunca é o único
 * indicador (Constituição 7.6): há número, forma (borda tracejada), título do marcador, rótulo e
 * legenda. Os desenhos da casa e da moto são os mesmos traços dos ícones `House` e `Motorbike` do
 * lucide-react (licença ISC), que a legenda usa como componente.
 */

const TRACOS_CASA =
  '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' +
  '<path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'

const TRACOS_MOTO =
  '<path d="m18 14-1-3"/>' +
  '<path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/>' +
  '<path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/>' +
  '<circle cx="19" cy="17" r="3"/>' +
  '<circle cx="5" cy="17" r="3"/>'

const SVG_MOTO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
  `aria-hidden="true" focusable="false">${TRACOS_MOTO}</svg>`

/**
 * Pino em gota (viewBox 0 0 36 47): a ponta fica em (18, 44) e o centro do círculo em (18, 18),
 * onde vai a casa (24 unidades × 0,75 = 18 px, de 9 a 27). A legenda usa o mesmo caminho.
 */
export const CAMINHO_PINO = 'M18 44C18 44 33 29.5 33 18A15 15 0 0 0 3 18C3 29.5 18 44 18 44Z'

const SVG_PINO_LOJA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 47" width="36" height="47" ' +
  'class="drop-shadow-md" aria-hidden="true" focusable="false">' +
  `<path d="${CAMINHO_PINO}" ` +
  'fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<g transform="translate(9 9) scale(0.75)" fill="none" stroke="#fff" stroke-width="2.6" ' +
  `stroke-linecap="round" stroke-linejoin="round">${TRACOS_CASA}</g>` +
  '</svg>'

/** Classe dos divIcon (`index.css`): sem o quadrado branco padrão do Leaflet. */
const CLASSE = 'icone-operacao'

export const ICONE_LOJA = L.divIcon({
  className: `${CLASSE} text-emerald-600`,
  html: SVG_PINO_LOJA,
  iconSize: [36, 47],
  iconAnchor: [18, 44],
  tooltipAnchor: [0, -40],
  popupAnchor: [0, -40],
})

/** Como o entregador aparece no mapa: disponível, em rota ou sem sinal há mais de 3 min (UC04 A1). */
export type EstadoEntregadorNoMapa = 'ONLINE' | 'EM_ROTA' | 'SEM_SINAL'

const BORDA_ENTREGADOR: Record<EstadoEntregadorNoMapa, string> = {
  ONLINE: 'border-slate-400',
  EM_ROTA: 'border-sky-600',
  SEM_SINAL: 'border-amber-500 border-dashed',
}

function iconeEntregador(estado: EstadoEntregadorNoMapa): L.DivIcon {
  return L.divIcon({
    className: CLASSE,
    html:
      `<span class="flex size-9 items-center justify-center rounded-full border-[3px] ${BORDA_ENTREGADOR[estado]} ` +
      `bg-white text-slate-800 shadow-md">${SVG_MOTO}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    // O rótulo com o nome fica à direita do círculo (HU08: ícone identificado com o nome). Embaixo,
    // ele cobria o pino da loja quando o entregador esperava logo acima dela.
    tooltipAnchor: [16, 0],
    popupAnchor: [0, -18],
  })
}

export const ICONES_ENTREGADOR: Readonly<Record<EstadoEntregadorNoMapa, L.DivIcon>> = {
  ONLINE: iconeEntregador('ONLINE'),
  EM_ROTA: iconeEntregador('EM_ROTA'),
  SEM_SINAL: iconeEntregador('SEM_SINAL'),
}

export type VarianteIconePedido = 'aguardando' | 'selecionado' | 'emSaida'

/** Também usado nos cards, para o círculo da lista ser igual ao do mapa. */
export const ESTILO_NUMERO_PEDIDO: Readonly<Record<VarianteIconePedido, string>> = {
  aguardando: 'border-emerald-600 bg-white text-emerald-800',
  selecionado: 'border-emerald-700 bg-emerald-600 text-white',
  emSaida: 'border-sky-600 border-dashed bg-white text-sky-800',
}

const cache = new Map<string, L.DivIcon>()

/** Círculo com o número do card. `numero` é sempre um inteiro positivo gerado no cliente. */
export function iconePedido(numero: number, variante: VarianteIconePedido): L.DivIcon {
  const n = Math.max(0, Math.trunc(numero))
  const chave = `${n}-${variante}`
  let icone = cache.get(chave)
  if (!icone) {
    icone = L.divIcon({
      className: CLASSE,
      html:
        '<span class="flex size-8 items-center justify-center rounded-full border-[3px] text-sm font-bold ' +
        `shadow-md ${ESTILO_NUMERO_PEDIDO[variante]}">${n}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      tooltipAnchor: [0, -16],
      popupAnchor: [0, -16],
    })
    cache.set(chave, icone)
  }
  return icone
}
