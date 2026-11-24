/**
 * Data escolhida no relatório, guardada entre abas (T010; D013, decisão 4). Só em memória; a
 * troca de sessão a apaga. `null` = o dia de hoje em São Paulo, calculado ao abrir a tela.
 */
import { create } from 'zustand'
import { aoTrocarDeSessao } from '@/features/auth'

type EstadoFiltroRelatorio = {
  data: string | null
  escolher: (data: string) => void
  limpar: () => void
}

export const useFiltroRelatorioStore = create<EstadoFiltroRelatorio>()((set) => ({
  data: null,
  escolher: (data) => set({ data }),
  limpar: () => set({ data: null }),
}))

aoTrocarDeSessao(() => useFiltroRelatorioStore.getState().limpar())
