/** Tabela por entregador do relatório do dia (T010). Valores do servidor, `null` como "—". */
import type { RelatorioDoEntregadorResponse } from '@/shared/api'
import { formatarMoeda } from '@/shared/formatacao'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function TabelaPorEntregador({ linhas }: { linhas: readonly RelatorioDoEntregadorResponse[] }) {
  return (
    <Table aria-label="Entregas por entregador">
      <TableHeader>
        <TableRow>
          <TableHead>Entregador</TableHead>
          <TableHead className="text-right">Entregas</TableHead>
          <TableHead className="text-right">Entregues</TableHead>
          <TableHead className="text-right">Falhas</TableHead>
          <TableHead className="text-right">Repasse</TableHead>
          <TableHead className="text-right">Pago</TableHead>
          <TableHead className="text-right">A pagar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((l) => (
          <TableRow key={l.motoboyId}>
            <TableCell className="font-medium">{l.nome}</TableCell>
            <TableCell className="text-right tabular-nums">{l.entregas}</TableCell>
            <TableCell className="text-right tabular-nums">{l.entregues}</TableCell>
            <TableCell className="text-right tabular-nums">{l.falhas}</TableCell>
            <TableCell className="text-right tabular-nums">{formatarMoeda(l.valorRepasse)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatarMoeda(l.valorPago)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatarMoeda(l.valorAPagar)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
