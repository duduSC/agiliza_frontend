import { useCallback, useRef } from 'react'

/**
 * Trava síncrona contra duplo clique (Constituição, Artigo 5.8). O `isPending` da mutação só vale
 * depois do próximo render: dois cliques no mesmo quadro passariam por ele e mandariam dois POSTs.
 * A trava dura até a ação terminar, inclusive a recarga das listas.
 */
export function useEnvioUnico() {
  const emEnvio = useRef(false)
  return useCallback(async (acao: () => Promise<void>): Promise<void> => {
    if (emEnvio.current) return
    emEnvio.current = true
    try {
      await acao()
    } finally {
      emEnvio.current = false
    }
  }, [])
}
