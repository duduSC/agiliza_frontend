/**
 * Tabela do extrato do acerto (UC03, T006).
 * Mostra as entregas em estado final com situacao, valor e indicadores visuais.
 * Entregas EM_REVISAO sao destacadas (Constituicao 7.6: cor nao e unico indicador).
 */
import type { LinhaExtratoResponse } from '@/shared/api/schemas'
import { LABEL_SITUACAO_ACERTO, LABEL_STATUS_ENTREGA } from '@/shared/dominio'
import { formatarDataHora, formatarMoeda, formatarKm } from '@/shared/formatacao'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { SituacaoCaixa } from '../regras'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

type Props = {
  linhas: LinhaExtratoResponse[]
  aoSelecionarEntrega?: (entregaId: string) => void
  /** Caixa do dia de cada entrega: so ABERTO oferece ajuste (Constituicao 5.2). */
  caixaDaLinha?: (linha: LinhaExtratoResponse) => SituacaoCaixa
}

const formatadorFaixa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

function badgeSituacao(situacao: LinhaExtratoResponse['situacao']) {
  switch (situacao) {
    case 'A_ACERTAR':
      return <Badge variant="outline">{LABEL_SITUACAO_ACERTO.A_ACERTAR}</Badge>
    case 'CONSOLIDADA':
      return <Badge variant="secondary">{LABEL_SITUACAO_ACERTO.CONSOLIDADA}</Badge>
    case 'EM_REVISAO':
      return (
        <Badge variant="destructive" aria-label="Em revisão: requer atenção">
          {LABEL_SITUACAO_ACERTO.EM_REVISAO}
        </Badge>
      )
  }
}

export function TabelaExtrato({ linhas, aoSelecionarEntrega, caixaDaLinha = () => 'ABERTO' }: Props) {
  if (linhas.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma entrega encontrada para o período selecionado.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Distância</TableHead>
            <TableHead>Faixa</TableHead>
            <TableHead className="text-right">Repasse</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow
              key={linha.entregaId}
              className={linha.situacao === 'EM_REVISAO' ? 'bg-yellow-50 dark:bg-yellow-950/20' : undefined}
            >
              <TableCell className="font-medium">{linha.nomeCliente}</TableCell>
              <TableCell>{formatarDataHora(linha.finalizadaEm)}</TableCell>
              <TableCell>{LABEL_STATUS_ENTREGA[linha.status]}</TableCell>
              <TableCell className="text-right">{formatarKm(linha.distanciaKm)}</TableCell>
              <TableCell>
                {linha.faixaDeKm != null && linha.faixaAteKm != null
                  ? `${formatadorFaixa.format(linha.faixaDeKm)} a ${formatadorFaixa.format(linha.faixaAteKm)} km`
                  : linha.foraDeArea
                    ? 'Fora de área'
                    : '—'}
              </TableCell>
              <TableCell className="text-right">{formatarMoeda(linha.valorRepasse)}</TableCell>
              <TableCell>{badgeSituacao(linha.situacao)}</TableCell>
              <TableCell>
                {linha.situacao === 'A_ACERTAR' &&
                  !linha.reciboId &&
                  aoSelecionarEntrega &&
                  caixaDaLinha(linha) === 'ABERTO' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => aoSelecionarEntrega(linha.entregaId)}
                    >
                      Ajustar
                    </Button>
                  )}
                {linha.reciboId && (
                  <p className="max-w-56 text-xs whitespace-normal text-muted-foreground">
                    No recibo #{linha.reciboId.slice(0, 8)}. Para corrigir, cancele o recibo antes.
                  </p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
