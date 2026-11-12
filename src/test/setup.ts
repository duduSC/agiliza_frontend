import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { redefinirEntregas } from './msw/dadosEntregas'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  redefinirEntregas()
})
afterAll(() => server.close())
