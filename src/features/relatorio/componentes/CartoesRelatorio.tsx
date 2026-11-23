/**
 * Cartões do relatório do dia (T010). Cada número é o que o servidor mandou (Constituição 5.1);
 * valor monetário `null` aparece como "—" pelo `formatarMoeda`.
 */
import type { RelatorioDoDiaResponse } from '@/shared/api'
import { formatarMoeda } from '@/shared/formatacao'
import { cn } from '@/shared/ui/lib/utils'

type Cartao = { id: string; rotulo: string; valor: string; dinheiro?: boolean }

const formatadorInteiro = new Intl.NumberFormat('pt-BR')

export function CartoesRelatorio({ relatorio }: { relatorio: RelatorioDoDiaResponse }) {
  const cartoes: Cartao[] = [
    { id: 'total-entregas', rotulo: 'Total de entregas', valor: formatadorInteiro.format(relatorio.totalEntregas) },
    { id: 'entregues', rotulo: 'Entregues', valor: formatadorInteiro.format(relatorio.entregues) },
    { id: 'falhas', rotulo: 'Falhas', valor: formatadorInteiro.format(relatorio.falhas) },
    { id: 'canceladas', rotulo: 'Canceladas', valor: formatadorInteiro.format(relatorio.canceladas) },
    {
      id: 'entregadores',
      rotulo: 'Entregadores que trabalharam',
      valor: formatadorInteiro.format(relatorio.entregadoresQueTrabalharam),
    },
    { id: 'valor-repasse', rotulo: 'Valor de repasse', valor: formatarMoeda(relatorio.valorTotalRepasse), dinheiro: true },
    { id: 'valor-pago', rotulo: 'Pago', valor: formatarMoeda(relatorio.valorPago), dinheiro: true },
    { id: 'valor-a-pagar', rotulo: 'A pagar', valor: formatarMoeda(relatorio.valorAPagar), dinheiro: true },
  ]
  return (
    <dl aria-label="Resumo do dia" className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
      {cartoes.map((c) => (
        <div
          key={c.id}
          data-testid={`cartao-${c.id}`}
          className={cn('flex flex-col gap-1 rounded-lg border bg-white p-3', c.dinheiro && 'border-slate-300')}
        >
          <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
          <dd className="text-lg font-semibold tabular-nums">{c.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
