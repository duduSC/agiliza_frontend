/**
 * Tabela de historico de caixas (UC03 A3, T006).
 */
import type { CaixaResponse } from '@/shared/api/schemas'
import { LABEL_STATUS_CAIXA } from '@/shared/dominio'
import { formatarData, formatarDataHora, formatarMoeda } from '@/shared/formatacao'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

type Props = {
  caixas: CaixaResponse[]
}

function badgeStatus(status: CaixaResponse['status']) {
  switch (status) {
    case 'ABERTO':
      return <Badge variant="outline">{LABEL_STATUS_CAIXA.ABERTO}</Badge>
    case 'FECHADO':
      return <Badge variant="secondary">{LABEL_STATUS_CAIXA.FECHADO}</Badge>
    case 'REABERTO':
      return <Badge variant="outline">{LABEL_STATUS_CAIXA.REABERTO}</Badge>
  }
}

export function HistoricoCaixas({ caixas }: Props) {
  if (caixas.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum caixa encontrado no histórico.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Aberto em</TableHead>
            <TableHead>Fechado em</TableHead>
            <TableHead className="text-right">Recibos</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caixas.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{formatarData(c.dataReferencia)}</TableCell>
              <TableCell>{formatarDataHora(c.abertoEm)}</TableCell>
              <TableCell>{formatarDataHora(c.fechadoEm)}</TableCell>
              <TableCell className="text-right">{c.qtdRecibos ?? '—'}</TableCell>
              <TableCell className="text-right">{formatarMoeda(c.valorTotal)}</TableCell>
              <TableCell>{badgeStatus(c.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
