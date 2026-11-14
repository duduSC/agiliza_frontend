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
  Marker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) =>
    React.createElement('div', { 'data-testid': 'pino-mapa', onClick: eventHandlers?.click }, children),
  Popup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

vi.mock('leaflet', () => {
  const Icon = function () {} as unknown as {
    new (): unknown
    Default: { prototype: Record<string, unknown>; mergeOptions: () => void }
  }
  Icon.Default = {
    prototype: {},
    mergeOptions: () => {},
  } as unknown as (typeof Icon)['Default']
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
