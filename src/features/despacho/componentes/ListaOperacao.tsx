/**
 * Coluna de cards da operação unificada (T010). O número do card é o número do círculo no mapa.
 *
 * - Pedido aguardando: o card seleciona e desseleciona, com a mesma regra do mapa e da tabela
 *   (limite de `maxPedidosPorLote`, UC01 E2).
 * - Pedido que saiu: mostra o status e o entregador do lote.
 * - Valores só do servidor; `null` aparece como "—" (Constituição 5.1).
 * - Estados carregando, vazio, erro e sucesso (Constituição 7.3).
 */
import { toast } from 'sonner'
import { LABEL_STATUS_ENTREGA } from '@/shared/dominio'
import { formatarMoeda } from '@/shared/formatacao'
import { ConteudoPorEstado, EstadoErro, type EstadoTela } from '@/shared/ui/estados'
import { cn } from '@/shared/ui/lib/utils'
import { ESTILO_NUMERO_PEDIDO, type VarianteIconePedido } from '@/shared/ui/mapa/iconesOperacao'
import { descreverEspera } from '../regras'
import type { FiltroOperacao } from '../filtroOperacaoStore'
import type { ItemOperacao } from '../operacao'
import { useSelecaoStore } from '../selecaoStore'
import { useAgora } from '../util'

const VAZIO: Record<FiltroOperacao, { titulo: string; descricao: string }> = {
  AGUARDANDO: {
    titulo: 'Nenhum pedido aguardando despacho',
    descricao: 'Novos pedidos e entregas avulsas aparecem aqui.',
  },
  EM_SAIDA: {
    titulo: 'Nenhum pedido saiu para entrega',
    descricao: 'As entregas despachadas e em rota aparecem aqui.',
  },
  TODOS: {
    titulo: 'Nenhum pedido em andamento',
    descricao: 'Os pedidos aguardando despacho e os que saíram para entrega aparecem aqui.',
  },
}

type Props = {
  itens: readonly ItemOperacao[]
  filtro: FiltroOperacao
  carregando: boolean
  /**
   * Leitura que falhou sem dados. `parcial`: a outra leitura do filtro chegou, então a lista
   * mostra o que tem e avisa o que faltou, em vez de esconder tudo.
   */
  erro: { mensagem: string; aoTentarNovamente: () => void; parcial: boolean } | null
}

export function ListaOperacao({ itens, filtro, carregando, erro }: Props) {
  const agora = useAgora()

  let estado: EstadoTela
  if (carregando) estado = { tipo: 'carregando' }
  else if (erro && !erro.parcial)
    estado = { tipo: 'erro', mensagem: erro.mensagem, aoTentarNovamente: erro.aoTentarNovamente }
  // Com parte da leitura falhando, "nenhum pedido" seria afirmar o que não se sabe.
  else if (itens.length === 0 && !erro) estado = { tipo: 'vazio', ...VAZIO[filtro] }
  else
    estado = {
      tipo: 'sucesso',
      conteudo:
        itens.length === 0 ? null : (
          <ol aria-label="Pedidos da operação" className="flex flex-col gap-2">
            {itens.map((item) => (
              <li key={item.entrega.id}>
                {item.emSaida ? <CardEmSaida item={item} /> : <CardAguardando item={item} agora={agora} />}
              </li>
            ))}
          </ol>
        ),
    }

  return (
    <section aria-labelledby="titulo-pedidos-operacao" className="flex flex-col gap-2">
      <h2 id="titulo-pedidos-operacao" className="text-lg font-semibold">
        Pedidos
        {estado.tipo === 'sucesso' && itens.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">({itens.length})</span>
        )}
      </h2>
      {!carregando && erro?.parcial && (
        <EstadoErro
          mensagem={`Parte dos pedidos não carregou. ${erro.mensagem}`}
          aoTentarNovamente={erro.aoTentarNovamente}
        />
      )}
      <ConteudoPorEstado estado={estado} />
    </section>
  )
}

/** O mesmo círculo do mapa: o número liga o card ao pino. */
function Numero({ numero, variante }: { numero: number; variante: VarianteIconePedido }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-bold',
        ESTILO_NUMERO_PEDIDO[variante],
      )}
    >
      {numero}
    </span>
  )
}

function CardAguardando({ item, agora }: { item: ItemOperacao; agora: Date }) {
  const { entrega, numero } = item
  const selecionada = useSelecaoStore((s) => s.selecionadas.has(entrega.id))
  const alternar = useSelecaoStore((s) => s.alternarSelecao)
  const max = useSelecaoStore((s) => s.maxPedidosPorLote)
  return (
    <button
      type="button"
      data-testid={`card-operacao-${entrega.id}`}
      aria-pressed={selecionada}
      aria-label={`Pedido ${numero}: ${entrega.nomeCliente}, aguardando despacho${selecionada ? ', selecionado para o lote' : ''}`}
      onClick={() => {
        if (!alternar(entrega.id))
          toast.error(`Limite de ${max} entregas por lote atingido. Remova uma entrega antes de adicionar outra.`)
      }}
      className={cn(
        'flex w-full items-start gap-2 rounded-lg border bg-white p-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600',
        selecionada && 'border-emerald-600 ring-1 ring-emerald-600',
      )}
    >
      <Numero numero={numero} variante={selecionada ? 'selecionado' : 'aguardando'} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{entrega.nomeCliente}</span>
        <span className="truncate text-xs text-muted-foreground">{entrega.bairro ?? entrega.enderecoCompleto}</span>
        <span className="text-xs">
          {LABEL_STATUS_ENTREGA[entrega.status]} · Repasse {formatarMoeda(entrega.valorRepasse)}
        </span>
        <span className="text-xs text-muted-foreground">
          {descreverEspera(entrega.prontoParaDespachoEm, agora)}
          {selecionada && <strong className="font-semibold text-emerald-800"> · Selecionado</strong>}
        </span>
      </span>
    </button>
  )
}

function CardEmSaida({ item }: { item: ItemOperacao }) {
  const { entrega, numero } = item
  return (
    <div
      data-testid={`card-operacao-${entrega.id}`}
      aria-label={`Pedido ${numero}: ${entrega.nomeCliente}, ${LABEL_STATUS_ENTREGA[entrega.status].toLowerCase()}`}
      role="group"
      className="flex items-start gap-2 rounded-lg border bg-white p-2 text-sm"
    >
      <Numero numero={numero} variante="emSaida" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{entrega.nomeCliente}</span>
        <span className="truncate text-xs text-muted-foreground">{entrega.bairro ?? entrega.enderecoCompleto}</span>
        <span className="text-xs">
          {LABEL_STATUS_ENTREGA[entrega.status]}
          {entrega.pendenteRevisao && <strong className="font-semibold text-amber-800"> · Em revisão</strong>}
        </span>
        <span className="text-xs">
          Entregador: <strong>{item.entregador ?? '—'}</strong>
        </span>
      </span>
    </div>
  )
}
