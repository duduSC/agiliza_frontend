/**
 * Entregas AGUARDANDO_DESPACHO sem revisao pendente (HU01; AGENT.md 8.2).
 * T003: lista basica. T004: selecao multipla (clique na linha alterna selecao).
 * Repasse `null` aparece como "--" (Constituicao, Artigo 5.1).
 */
import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { formatarKm, formatarMoeda, VALOR_INDEFINIDO } from '@/shared/formatacao'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Button } from '@/shared/ui/button'
import { ConteudoPorEstado, type EstadoTela } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
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
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro, useAgora } from '../util'
import { BotaoCancelarEntrega } from './DialogoCancelarEntrega'

export function ListaPendentes() {
  const consulta = useEntregasPendentes()
  const agora = useAgora()

  let estado: EstadoTela
  if (consulta.isPending) estado = { tipo: 'carregando' }
  else if (consulta.data === undefined)
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
      <AvisoDesatualizado consulta={consulta} />
      <ConteudoPorEstado estado={estado} />
    </section>
  )
}

function TabelaPendentes({ entregas, agora }: { entregas: EntregaResponse[]; agora: Date }) {
  return (
    <Table aria-label="Entregas aguardando despacho">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Seleção</span>
          </TableHead>
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
  const envioUnico = useEnvioUnico()
  const estaSelecionada = useSelecaoStore((s) => s.selecionadas.has(entrega.id))
  const alternarSelecao = useSelecaoStore((s) => s.alternarSelecao)
  const maxPedidosPorLote = useSelecaoStore((s) => s.maxPedidosPorLote)

  const aoMarcarPronto = () =>
    void envioUnico(async () => {
      try {
        await marcar.mutateAsync(entrega.id)
        toast.success(`Entrega de ${entrega.nomeCliente} marcada como pronta.`)
      } catch (erro) {
        toast.error(mensagemDoErro(erro))
      }
    })

  const aoAlternar = () => {
    const sucesso = alternarSelecao(entrega.id)
    if (!sucesso) {
      toast.error(
        `Limite de ${maxPedidosPorLote} entregas por lote atingido. Remova uma entrega antes de adicionar outra.`,
      )
    }
  }

  return (
    <TableRow
      data-testid={`pendente-${entrega.id}`}
      className={estaSelecionada ? 'bg-primary/5' : undefined}
    >
      <TableCell>
        <input
          type="checkbox"
          className="size-4"
          checked={estaSelecionada}
          onChange={aoAlternar}
          aria-label={`Selecionar entrega de ${entrega.nomeCliente}`}
        />
      </TableCell>
      <TableCell className="max-w-48 font-medium whitespace-normal">{entrega.nomeCliente}</TableCell>
      <TableCell className="max-w-40 whitespace-normal">{entrega.bairro ?? VALOR_INDEFINIDO}</TableCell>
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
        <div className="max-w-52 text-xs whitespace-normal text-muted-foreground">{descreverCobranca(entrega)}</div>
      </TableCell>
      <TableCell className="max-w-36 whitespace-normal">{descreverEspera(entrega.prontoParaDespachoEm, agora)}</TableCell>
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
