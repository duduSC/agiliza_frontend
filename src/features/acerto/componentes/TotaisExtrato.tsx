/**
 * Card de totais do extrato (UC03, T006).
 * Todos os valores vem do backend (Constituicao 5.1 — nunca somados no cliente).
 */
import type { ExtratoAcertoResponse } from '@/shared/api/schemas'
import { formatarMoeda } from '@/shared/formatacao'

type Props = {
  extrato: ExtratoAcertoResponse
}

export function TotaisExtrato({ extrato }: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <CardTotal
        label={extrato.possuiValorIndefinido ? 'Total devido (parcial)' : 'Total devido'}
        valor={extrato.totalDevido}
      />
      <CardTotal label="Total consolidado" valor={extrato.totalConsolidado} />
      <CardTotal label="Em revisão" valor={extrato.totalEmRevisao} destaque={extrato.totalEmRevisao > 0} />
      {extrato.possuiValorIndefinido && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900"
        >
          <span aria-hidden="true">&#9888;</span>
          Há entregas sem valor calculado
        </div>
      )}
    </div>
  )
}

function CardTotal({ label, valor, destaque }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${destaque ? 'border-yellow-300 bg-yellow-50' : 'bg-card'}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formatarMoeda(valor)}</p>
    </div>
  )
}
