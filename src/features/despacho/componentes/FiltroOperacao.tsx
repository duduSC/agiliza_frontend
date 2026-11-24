/** Filtro da operação unificada (T010, D013): Aguardando despacho, Saiu para entrega, Todos. */
import { cn } from '@/shared/ui/lib/utils'
import { FILTROS_OPERACAO, useFiltroOperacaoStore } from '../filtroOperacaoStore'

export function FiltroOperacao() {
  const filtro = useFiltroOperacaoStore((s) => s.filtro)
  const escolher = useFiltroOperacaoStore((s) => s.escolher)
  return (
    <div role="group" aria-label="Filtrar pedidos" className="flex rounded-lg border bg-white p-0.5 text-sm">
      {FILTROS_OPERACAO.map((f) => (
        <button
          key={f.valor}
          type="button"
          aria-pressed={filtro === f.valor}
          onClick={() => escolher(f.valor)}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600',
            filtro === f.valor ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100',
          )}
        >
          {f.rotulo}
        </button>
      ))}
    </div>
  )
}
