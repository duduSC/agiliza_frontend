/**
 * Lotes DESPACHADO ainda nao saidos (T004, UC01 A4). Oferecem "Devolver lote" apenas
 * quando o status e DESPACHADO. Sem atualizacao otimista (Constituicao 5.8).
 * T010: cada lote mostra o entregador (nome pela frota; "—" se ela nao chegou).
 */
import { toast } from 'sonner'
import type { LoteEntregaResponse, MotoboyResponse } from '@/shared/api/schemas'
import { LABEL_STATUS_LOTE } from '@/shared/dominio'
import { formatarMoeda } from '@/shared/formatacao'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ConteudoPorEstado, type EstadoTela } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useDevolverLote, useLotesDespachados } from '../api/hooks'
import { nomeDoEntregador } from '../operacao'
import { mensagemDoErro } from '../util'

type Props = {
  /** Frota (ONLINE/EM_ROTA), só para o nome de quem tem cada lote. */
  entregadores?: readonly MotoboyResponse[]
}

export function ListaLotesDespachados({ entregadores }: Props = {}) {
  const consulta = useLotesDespachados()

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
      titulo: 'Nenhum lote despachado',
      descricao: 'Lotes despachados aparecem aqui enquanto não saem para entrega.',
    }
  else
    estado = {
      tipo: 'sucesso',
      conteudo: (
        <ul aria-label="Lotes despachados" className="flex flex-col gap-3">
          {consulta.data.map((lote) => (
            <ItemLote key={lote.id} lote={lote} entregador={nomeDoEntregador(lote.motoboyId, entregadores)} />
          ))}
        </ul>
      ),
    }

  return (
    <section aria-labelledby="titulo-lotes" className="flex flex-col gap-3">
      <h2 id="titulo-lotes" className="text-lg font-semibold">
        Lotes despachados
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

function ItemLote({ lote, entregador }: { lote: LoteEntregaResponse; entregador: string | null }) {
  const devolver = useDevolverLote()
  const podeDevolver = lote.status === 'DESPACHADO'

  const envioUnico = useEnvioUnico()
  const aoDevolver = () =>
    void envioUnico(async () => {
      try {
        await devolver.mutateAsync(lote.id)
        toast.success(`Lote com ${lote.qtdEntregas} entrega(s) devolvido.`)
      } catch (erro) {
        toast.error(mensagemDoErro(erro))
      }
    })

  return (
    <li
      data-testid={`lote-${lote.id}`}
      className="flex flex-col gap-2 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {lote.qtdEntregas} entrega(s)
          </p>
          <p className="text-sm">
            Entregador: <strong>{entregador ?? '—'}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Repasse total: {formatarMoeda(lote.valorTotalRepasse)}
          </p>
        </div>
        <Badge variant="outline">
          {LABEL_STATUS_LOTE[lote.status]}
        </Badge>
      </div>
      {podeDevolver && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={aoDevolver}
            disabled={devolver.isPending}
            aria-label={`Devolver lote com ${lote.qtdEntregas} entregas`}
          >
            {devolver.isPending ? 'Devolvendo…' : 'Devolver lote'}
          </Button>
        </div>
      )}
    </li>
  )
}
