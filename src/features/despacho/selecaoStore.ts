/**
 * Estado de selecao de entregas para despacho (T004). Store Zustand local da feature,
 * nao global (Constituicao 5.6: limite maxPedidosPorLote).
 *
 * A selecao fica em memoria e e limpa ao despachar, ao navegar, ou ao trocar de sessao.
 */
import { create } from 'zustand'

type EstadoSelecao = {
  selecionadas: ReadonlySet<string>
  maxPedidosPorLote: number
  alternarSelecao: (id: string) => boolean
  limparSelecao: () => void
  definirLimite: (max: number) => void
  estaSelecionada: (id: string) => boolean
  limiteAtingido: () => boolean
}

export const useSelecaoStore = create<EstadoSelecao>()((set, get) => ({
  selecionadas: new Set<string>(),
  maxPedidosPorLote: 5,

  alternarSelecao: (id: string) => {
    const { selecionadas, maxPedidosPorLote } = get()
    if (selecionadas.has(id)) {
      const nova = new Set(selecionadas)
      nova.delete(id)
      set({ selecionadas: nova })
      return true
    }
    if (selecionadas.size >= maxPedidosPorLote) {
      return false // UC01 E2: limite atingido
    }
    const nova = new Set(selecionadas)
    nova.add(id)
    set({ selecionadas: nova })
    return true
  },

  limparSelecao: () => set({ selecionadas: new Set<string>() }),

  definirLimite: (max: number) => set({ maxPedidosPorLote: max }),

  estaSelecionada: (id: string) => get().selecionadas.has(id),

  limiteAtingido: () => {
    const { selecionadas, maxPedidosPorLote } = get()
    return selecionadas.size >= maxPedidosPorLote
  },
}))
