/**
 * PROVISÓRIO (até a F7): liga/desliga a sessão de desenvolvimento.
 *
 * A regra da T002 é "só existe com DEV ou VITE_USE_MOCKS=true, e nunca no build de produção".
 * Por isso `PROD` vence sempre. A constante abaixo é avaliada pelo Vite em tempo de build
 * (`import.meta.env.*` é substituído por literais), então no build de produção ela vira `false`
 * e o Rollup elimina o `import()` dinâmico do seletor — o código dele não vai para o bundle.
 */
type AmbienteSessaoDev = {
  PROD: boolean
  DEV: boolean
  VITE_USE_MOCKS?: string
}

export function calcularSessaoDevHabilitada(env: AmbienteSessaoDev): boolean {
  if (env.PROD) return false
  return env.DEV || env.VITE_USE_MOCKS === 'true'
}

export const SESSAO_DEV_HABILITADA: boolean =
  !import.meta.env.PROD && (import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS === 'true')
