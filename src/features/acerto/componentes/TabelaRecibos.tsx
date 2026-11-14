/**
 * Tabela de recibos do entregador (UC03, T006).
 * Recibo GERADO permite "Marcar como pago". Sem atualizacao otimista (Constituicao 5.8).
 */
import type { ReciboResponse } from '@/shared/api/schemas'
import { LABEL_STATUS_RECIBO } from '@/shared/dominio'
import { formatarMoeda, formatarDataHora, formatarData } from '@/shared/formatacao'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

type Props = {
  recibos: ReciboResponse[]
  aoMarcarPago: (id: string) => void
  marcandoPago: boolean
  caixaFechado: boolean
}

function badgeStatus(status: ReciboResponse['status']) {
  switch (status) {
    case 'GERADO':
      return <Badge variant="outline">{LABEL_STATUS_RECIBO.GERADO}</Badge>
    case 'PAGO':
      return <Badge variant="secondary">{LABEL_STATUS_RECIBO.PAGO}</Badge>
    case 'CANCELADO':
      return <Badge variant="destructive">{LABEL_STATUS_RECIBO.CANCELADO}</Badge>
  }
}

export function TabelaRecibos({ recibos, aoMarcarPago, marcandoPago, caixaFechado }: Props) {
  if (recibos.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum recibo encontrado.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead className="text-right">Entregas</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pago em</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recibos.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatarData(r.dataReferencia)}</TableCell>
              <TableCell>
                {formatarDataHora(r.periodoInicio)} - {formatarDataHora(r.periodoFim)}
              </TableCell>
              <TableCell className="text-right">{r.qtdEntregas}</TableCell>
              <TableCell className="text-right">{formatarMoeda(r.valorTotal)}</TableCell>
              <TableCell>{badgeStatus(r.status)}</TableCell>
              <TableCell>{formatarDataHora(r.pagoEm)}</TableCell>
              <TableCell>
                {r.status === 'GERADO' && !caixaFechado && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => aoMarcarPago(r.id)}
                    disabled={marcandoPago}
                  >
                    {marcandoPago ? 'Pagando...' : 'Marcar pago'}
                  </Button>
                )}
                {r.status === 'GERADO' && caixaFechado && (
                  <span className="text-xs text-muted-foreground">
                    Caixa fechado
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
