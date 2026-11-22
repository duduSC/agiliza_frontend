/**
 * Card de totais do extrato (UC03, T006).
 * Todos os valores vem do backend (Constituicao 5.1 — nunca somados no cliente).
 */
import type { ExtratoAcertoResponse } from '@/shared/api/schemas'
import { formatarMoeda } from '@/shared/formatacao'
import { totalParaExibir } from '../regras'

type Props = {
  extrato: ExtratoAcertoResponse
}

export function TotaisExtrato({ extrato }: Props) {
  const { linhas } = extrato
  const devido = totalParaExibir(extrato.totalDevido, 'A_ACERTAR', linhas)
  const consolidado = totalParaExibir(extrato.totalConsolidado, 'CONSOLIDADA', linhas)
  const emRevisao = totalParaExibir(extrato.totalEmRevisao, 'EM_REVISAO', linhas)
  return (
    <div className="flex flex-wrap gap-4">
      <CardTotal
        label={extrato.possuiValorIndefinido ? 'Total devido (parcial)' : 'Total devido'}
        valor={devido.valor}
      />
      <CardTotal label="Total consolidado" valor={consolidado.valor} />
      <CardTotal
        label={emRevisao.parcial && emRevisao.valor !== null ? 'Em revisão (parcial)' : 'Em revisão'}
        valor={emRevisao.valor}
        destaque={linhas.some((l) => l.situacao === 'EM_REVISAO')}
      />
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

function CardTotal({ label, valor, destaque }: { label: string; valor: number | null; destaque?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${destaque ? 'border-yellow-300 bg-yellow-50' : 'bg-card'}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formatarMoeda(valor)}</p>
    </div>
  )
}
