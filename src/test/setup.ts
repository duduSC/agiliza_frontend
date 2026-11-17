import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'
import { redefinirAcerto } from './msw/dadosAcerto'
import { redefinirEntregas } from './msw/dadosEntregas'
import { redefinirLotes } from './msw/dadosLotes'
import { redefinirMotoboys } from './msw/dadosMotoboys'
import { server } from './msw/server'

// Mock Leaflet: jsdom nao suporta canvas/DOM que Leaflet precisa para icones.
// Os testes do mapa sao cobertos por E2E (Playwright).
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mapa-leaflet' }, children),
  TileLayer: () => null,
  Marker: (props: {
    children: React.ReactNode
    icon?: unknown
    eventHandlers?: { click?: () => void }
  }) => {
    // Reproduz o Leaflet real (T008): `icon` presente porem `undefined` sobrescreve o icone
    // padrao e o Leaflet quebra em `options.icon.createIcon()`.
    if ('icon' in props && props.icon == null) {
      throw new TypeError("Cannot read properties of undefined (reading 'createIcon')")
    }
    return React.createElement(
      'div',
      { 'data-testid': 'pino-mapa', onClick: props.eventHandlers?.click },
      props.children,
    )
  },
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

// Mock @stomp/stompjs: nao ha WebSocket em jsdom
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    active = false
    connected = false
    onConnect: (() => void) | null = null
    onDisconnect: (() => void) | null = null
    onStompError: (() => void) | null = null
    onWebSocketClose: (() => void) | null = null
    activate() {
      /* noop */
    }
    deactivate() {
      /* noop */
    }
    subscribe() {
      return { unsubscribe: () => {} }
    }
  },
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  redefinirAcerto()
  redefinirEntregas()
  redefinirLotes()
  redefinirMotoboys()
})
afterAll(() => server.close())
