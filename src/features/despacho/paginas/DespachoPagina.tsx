/**
 * Despacho (UC01) — pagina completa com mapa, selecao multipla, despacho, devolucao
 * e tempo real (T004; lista e revisao da T003).
 */
import { useEffect } from 'react'
import { useEstabelecimentoAtual } from '@/features/loja'
import { useTempoRealDespacho } from '@/shared/realtime'
import { IndicadorTempoReal } from '@/shared/realtime/IndicadorTempoReal'
import { EstadoErro } from '@/shared/ui/estados'
import { LimiteDeErro } from '@/shared/ui/LimiteDeErro'
import { AlertaIntegracao } from '../componentes/AlertaIntegracao'
import { BarraSelecao } from '../componentes/BarraSelecao'
import { BotaoNovaEntregaAvulsa } from '../componentes/FormularioEntregaAvulsa'
import { ListaLotesDespachados } from '../componentes/ListaLotesDespachados'
import { ListaPendentes } from '../componentes/ListaPendentes'
import { ListaRevisao } from '../componentes/ListaRevisao'
import { MapaDespacho } from '../componentes/MapaDespacho'
import { useEntregasPendentes } from '../api/hooks'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro } from '../util'

export function DespachoPagina() {
  // Conectar STOMP (T004)
  useTempoRealDespacho()

  // A selecao sobrevive a troca de aba (T010) e some na troca de sessao (`selecaoStore`).

  // Loja do token: centro do mapa e limite do lote (Constituicao 5.6). Enquanto nao chega,
  // vale o padrao 5 da store; o backend tem a palavra final (LIMITE_LOTE_EXCEDIDO).
  const loja = useEstabelecimentoAtual()
  const definirLimite = useSelecaoStore((s) => s.definirLimite)
  const maxPedidosPorLote = loja.data?.maxPedidosPorLote
  useEffect(() => {
    // Sem a loja, o padrao do DVP, e nao o limite que sobrou da sessao anterior.
    definirLimite(maxPedidosPorLote && maxPedidosPorLote > 0 ? maxPedidosPorLote : 5)
  }, [maxPedidosPorLote, definirLimite])

  // Quem saiu da lista (despachada por outro, cancelada, em revisao) sai da selecao.
  const { data: pendentes } = useEntregasPendentes()
  const manterApenas = useSelecaoStore((s) => s.manterApenas)
  useEffect(() => {
    if (pendentes) manterApenas(pendentes.map((e) => e.id))
  }, [pendentes, manterApenas])

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Despacho
          </h1>
          <p className="text-sm text-muted-foreground">
            Entregas aguardando despacho e entregas em revisão.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IndicadorTempoReal />
          <BotaoNovaEntregaAvulsa />
        </div>
      </header>

      <AlertaIntegracao />
      <BarraSelecao />

      {loja.isError && (
        <EstadoErro
          mensagem={`${mensagemDoErro(loja.error)} O mapa segue sem o pino da loja.`}
          aoTentarNovamente={() => void loja.refetch()}
        />
      )}

      {/* Mapa com revisao e lotes ao lado; a tabela usa a largura inteira (projetor 1366 px). */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <LimiteDeErro mensagem="Não foi possível exibir o mapa. As entregas continuam na lista abaixo.">
          <MapaDespacho coordenadaLoja={loja.data?.coordenada ?? null} />
        </LimiteDeErro>
        <div className="flex flex-col gap-4 lg:h-[50vh] lg:min-h-[320px] lg:overflow-y-auto lg:pr-1">
          <ListaLotesDespachados />
          <ListaRevisao />
        </div>
      </div>

      <ListaPendentes />
    </section>
  )
}
