/**
 * Filtro aplicado no Acerto (entregador e período), guardado entre abas (T010; D013, decisão 4).
 *
 * Só em memória: nada vai para localStorage, sessionStorage ou URL. O resultado volta do cache do
 * TanStack Query pela mesma chave. A troca de sessão apaga o filtro (Constituição, Artigo 6.2).
 */
import { create } from 'zustand'
import { aoTrocarDeSessao } from '@/features/auth'

export type FiltroAcertoValues = {
  motoboyId: string
  inicio: string
  fim: string
}

type EstadoFiltroAcerto = {
  filtro: FiltroAcertoValues | null
  aplicar: (filtro: FiltroAcertoValues) => void
  limpar: () => void
}

export const useFiltroAcertoStore = create<EstadoFiltroAcerto>()((set) => ({
  filtro: null,
  aplicar: (filtro) => set({ filtro }),
  limpar: () => set({ filtro: null }),
}))

aoTrocarDeSessao(() => useFiltroAcertoStore.getState().limpar())
