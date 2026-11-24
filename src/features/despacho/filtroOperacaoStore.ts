/**
 * Filtro da operação unificada (T010, D013 decisões 3 e 4): "Aguardando despacho", "Saiu para
 * entrega" (DESPACHADA e EM_ROTA) e "Todos". Guardado entre abas, só em memória (nada em storage
 * nem na URL), e apagado na troca de sessão (Constituição 6.2).
 */
import { create } from 'zustand'
import { aoTrocarDeSessao } from '@/features/auth'

export type FiltroOperacao = 'AGUARDANDO' | 'EM_SAIDA' | 'TODOS'

export const FILTROS_OPERACAO: readonly { valor: FiltroOperacao; rotulo: string }[] = [
  { valor: 'AGUARDANDO', rotulo: 'Aguardando despacho' },
  { valor: 'EM_SAIDA', rotulo: 'Saiu para entrega' },
  { valor: 'TODOS', rotulo: 'Todos' },
]

/** O filtro mostra as entregas que já saíram (e precisa delas e dos lotes em rota)? */
export function filtroMostraSaidas(filtro: FiltroOperacao): boolean {
  return filtro !== 'AGUARDANDO'
}

/** O filtro mostra as entregas aguardando despacho? */
export function filtroMostraAguardando(filtro: FiltroOperacao): boolean {
  return filtro !== 'EM_SAIDA'
}

type EstadoFiltroOperacao = {
  filtro: FiltroOperacao
  escolher: (filtro: FiltroOperacao) => void
  limpar: () => void
}

export const useFiltroOperacaoStore = create<EstadoFiltroOperacao>()((set) => ({
  filtro: 'AGUARDANDO',
  escolher: (filtro) => set({ filtro }),
  limpar: () => set({ filtro: 'AGUARDANDO' }),
}))

aoTrocarDeSessao(() => useFiltroOperacaoStore.getState().limpar())
