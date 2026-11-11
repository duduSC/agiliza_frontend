/**
 * Entregas AGUARDANDO_DESPACHO sem revisão pendente (HU01; AGENT.md 8.2). Sem mapa nesta
 * fase (F3). Repasse `null` aparece como "—" (Constituição, Artigo 5.1).
 */
import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { formatarKm, formatarMoeda } from '@/shared/formatacao'
import { Button } from '@/shared/ui/button'
import { ConteudoPorEstado, type EstadoTela } from '@/shared/ui/estados'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { useEntregasPendentes, useMarcarPronto } from '../api/hooks'
import {
  descreverCobranca,
  descreverEspera,
  descreverFormaPagamento,
  podeCancelar,
  podeMarcarPronto,
} from '../regras'
import { mensagemDoErro, useAgora } from '../util'
import { BotaoCancelarEntrega } from './DialogoCancelarEntrega'

export function ListaPendentes() {
  const consulta = useEntregasPendentes()
  const agora = useAgora()

  let estado: EstadoTela
  if (consulta.isPending) estado = { tipo: 'carregando' }
  else if (consulta.isError)
    estado = {
      tipo: 'erro',
      mensagem: mensagemDoErro(consulta.error),
      aoTentarNovamente: () => void consulta.refetch(),
    }
  else if (consulta.data.length === 0)
    estado = {
      tipo: 'vazio',
      titulo: 'Nenhuma entrega aguardando despacho',
      descricao: 'Novos pedidos e entregas avulsas aparecem aqui.',
    }
  else estado = { tipo: 'sucesso', conteudo: <TabelaPendentes entregas={consulta.data} agora={agora} /> }

  return (
    <section aria-labelledby="titulo-pendentes" className="flex flex-col gap-3">
      <h2 id="titulo-pendentes" className="text-lg font-semibold">
        Aguardando despacho
        {consulta.data && consulta.data.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({consulta.data.length})
          </span>
        )}
      </h2>
      <ConteudoPorEstado estado={estado} />
    </section>
  )
}

function TabelaPendentes({ entregas, agora }: { entregas: EntregaResponse[]; agora: Date }) {
  return (
    <Table aria-label="Entregas aguardando despacho">
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Bairro</TableHead>
          <TableHead>Distância</TableHead>
          <TableHead>Repasse</TableHead>
          <TableHead>Pagamento</TableHead>
          <TableHead>Espera</TableHead>
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entregas.map((entrega) => (
          <LinhaPendente key={entrega.id} entrega={entrega} agora={agora} />
        ))}
      </TableBody>
    </Table>
  )
}

function LinhaPendente({ entrega, agora }: { entrega: EntregaResponse; agora: Date }) {
  const marcar = useMarcarPronto()

  const aoMarcarPronto = () => {
    if (marcar.isPending) return
    marcar.mutate(entrega.id, {
      onSuccess: () => toast.success(`Entrega de ${entrega.nomeCliente} marcada como pronta.`),
      onError: (erro) => toast.error(mensagemDoErro(erro)),
    })
  }

  return (
    <TableRow data-testid={`pendente-${entrega.id}`}>
      <TableCell className="font-medium">{entrega.nomeCliente}</TableCell>
      <TableCell>{entrega.bairro ?? '—'}</TableCell>
      <TableCell>{formatarKm(entrega.distanciaKm)}</TableCell>
      <TableCell>
        <span
          title={entrega.valorRepasse == null ? 'Repasse ainda não calculado' : 'Repasse provisório'}
        >
          {formatarMoeda(entrega.valorRepasse)}
        </span>
      </TableCell>
      <TableCell>
        <div>{descreverFormaPagamento(entrega)}</div>
        <div className="text-xs text-muted-foreground">{descreverCobranca(entrega)}</div>
      </TableCell>
      <TableCell>{descreverEspera(entrega.prontoParaDespachoEm, agora)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          {podeMarcarPronto(entrega) && (
            <Button
              type="button"
              size="sm"
              onClick={aoMarcarPronto}
              disabled={marcar.isPending}
              aria-label={`Marcar pronto: entrega de ${entrega.nomeCliente}`}
            >
              {marcar.isPending ? 'Marcando…' : 'Marcar pronto'}
            </Button>
          )}
          {podeCancelar(entrega) && <BotaoCancelarEntrega entrega={entrega} />}
        </div>
      </TableCell>
    </TableRow>
  )
}
