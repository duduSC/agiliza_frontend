import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/app/App'
import { Providers } from '@/app/Providers'

async function iniciarMocks(): Promise<void> {
  // Só em dev e só com VITE_USE_MOCKS=true; no build de produção este bloco é eliminado.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('@/test/msw/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
}

void iniciarMocks().then(() => {
  const raiz = document.getElementById('root')
  if (!raiz) throw new Error('Elemento #root não encontrado')
  createRoot(raiz).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>,
  )
})
