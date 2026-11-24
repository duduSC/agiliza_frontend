/**
 * Camada de mapa clara e discreta (T010, referência visual da operação unificada).
 *
 * Tiles do OpenStreetMap padrão, sem chave de API (DVP 1.5.2; Constituição 6.6), com o filtro CSS
 * `.camada-mapa-clara` (`index.css`), que tira quase toda a cor do fundo. Os nomes de bairros e
 * avenidas continuam legíveis e os pinos ficam em evidência. O filtro vale só para os tiles:
 * pinos, rótulos e a atribuição mantêm a cor.
 *
 * O CARTO "light_all" (Positron), citado na tarefa como exemplo, foi descartado: em 23/11/2026 os
 * tiles dele vinham com a imagem "API KEY REQUIRED", e chave no front é proibida.
 */
import { TileLayer } from 'react-leaflet'

/** Servidor de tiles do OSM sem subdomínios, como a política de uso dele pede. Sem chave. */
export const URL_TILES_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
/** A atribuição do OSM é obrigatória. Texto fixo daqui, nunca vindo da API (Constituição 6.5). */
export const ATRIBUICAO_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
export const CLASSE_CAMADA_CLARA = 'camada-mapa-clara'
/** O zoom máximo que o tile.openstreetmap.org serve. */
export const ZOOM_MAXIMO_OSM = 19

export function CamadaMapaClaro() {
  return (
    <TileLayer
      url={URL_TILES_OSM}
      attribution={ATRIBUICAO_OSM}
      maxZoom={ZOOM_MAXIMO_OSM}
      className={CLASSE_CAMADA_CLARA}
    />
  )
}
