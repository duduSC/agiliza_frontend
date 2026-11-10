/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API REST do backend (ex.: http://localhost:8080). */
  readonly VITE_API_URL?: string
  /** "true" liga o MSW no navegador em modo dev. */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
