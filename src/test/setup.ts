import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, configure } from '@testing-library/react'
import { toast } from 'sonner'
import { vi } from 'vitest'
import { useFiltroAcertoStore } from '@/features/acerto/filtroStore'
import { useSelecaoStore } from '@/features/despacho/selecaoStore'
import { mapaFalso } from './mapaFalso'
import { redefinirAcerto } from './msw/dadosAcerto'
import { redefinirEntregas } from './msw/dadosEntregas'
import { redefinirLotes } from './msw/dadosLotes'
import { redefinirMotoboys } from './msw/dadosMotoboys'
import { server } from './msw/server'

// Mock do Leaflet: o jsdom não tem layout. O mock LANÇA onde o Leaflet real lança (ícone
// indefinido, coordenada inválida); o enquadramento real é conferido no E2E (Playwright).
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mapa-leaflet' }, children),
  TileLayer: () => null,
  useMap: () => mapaFalso,
  Marker: (props: {
    children: React.ReactNode
    position: [number, number]
    icon?: unknown
    title?: string
    eventHandlers?: { click?: () => void; dragend?: (evento: unknown) => void }
  }) => {
    // Reproduz o Leaflet real (T008): `icon` presente porem `undefined` sobrescreve o icone
    // padrao e o Leaflet quebra em `options.icon.createIcon()`.
    if ('icon' in props && props.icon == null) {
      throw new TypeError("Cannot read properties of undefined (reading 'createIcon')")
    }
    if (!props.position.every((n) => Number.isFinite(n))) {
      throw new Error(`Invalid LatLng object: (${props.position.join(', ')})`)
    }
    return React.createElement(
      'div',
      {
        'data-testid': 'pino-mapa',
        title: props.title,
        onClick: props.eventHandlers?.click,
        // Arrastar: o teste dispara `dragEnd` e o pino "cai" 0,001 grau ao norte e a leste.
        onDragEnd: props.eventHandlers?.dragend
          ? () =>
              props.eventHandlers?.dragend?.({
                target: { getLatLng: () => ({ lat: props.position[0] + 0.001, lng: props.position[1] + 0.001 }) },
              })
          : undefined,
      },
      props.children,
    )
  },
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'rotulo-pino' }, children),
  Popup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

vi.mock('leaflet', () => {
  class Icon {
    static Default = class {
      static mergeOptions() {}
    }
  }
  return {
    default: { Icon, icon: () => ({}) },
    Icon,
    icon: () => ({}),
  }
})

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }))

// Não há WebSocket no jsdom. O falso segue o contrato do stompjs e é controlado pelo teste.
vi.mock('@stomp/stompjs', () => import('./stompFalso'))

/**
 * O `fetch`/`Request` do Node recusa o `AbortSignal` do jsdom, que é de outra classe. Sem este
 * adaptador toda consulta do TanStack Query virava erro de rede nos testes. Ele tira o sinal da
 * chamada e mantém o contrato do navegador: cancelar rejeita com `AbortError`.
 */
function instalarAdaptadorDeSinal(): void {
  const fetchDoMsw = globalThis.fetch
  globalThis.fetch = (entrada, init) => {
    if (!init?.signal) return fetchDoMsw(entrada, init)
    const { signal, ...semSinal } = init
    const abortado = () => new DOMException('This operation was aborted', 'AbortError')
    if (signal.aborted) return Promise.reject(abortado())
    return new Promise<Response>((resolve, reject) => {
      const aoAbortar = () => reject(abortado())
      signal.addEventListener('abort', aoAbortar, { once: true })
      fetchDoMsw(entrada, semSinal)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', aoAbortar))
    })
  }
}

// As rotas sao lazy: o primeiro render de uma tela inclui o import dela.
configure({ asyncUtilTimeout: 10_000 })

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  instalarAdaptadorDeSinal()
})
afterEach(() => {
  cleanup()
  // O Sonner reapresenta os avisos ativos a cada Toaster novo: sem isto, um teste passava pelo
  // aviso do anterior e deixava a requisição dele solta para o seguinte.
  toast.dismiss()
  server.resetHandlers()
  redefinirAcerto()
  redefinirEntregas()
  redefinirLotes()
  redefinirMotoboys()
  mapaFalso.fitBounds.mockClear()
  // Estado de tela guardado entre abas (T010): cada teste começa sem o do anterior.
  useFiltroAcertoStore.getState().limpar()
  useSelecaoStore.getState().limparSelecao()
})
afterAll(() => server.close())
