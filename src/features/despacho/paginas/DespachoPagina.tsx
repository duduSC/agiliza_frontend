/**
 * Despacho (UC01) e operação unificada (T010, D013 decisão 3: Despacho + Monitoramento).
 *
 * - Mapa quase da tela toda com a loja, os pedidos numerados do filtro e os entregadores na última
 *   posição, em tempo real pelos tópicos de entregas e de frota, com polling de reserva.
 * - Coluna estreita à direita: filtro, cards numerados (o número do card é o do círculo no mapa),
 *   lotes despachados com o entregador e a fila de revisão.
 * - Abaixo, a tabela completa dos pedidos aguardando despacho, com seleção, pronto e cancelar.
 * - Tudo o que o Despacho já fazia continua: seleção, despachar, devolver, pronto, revisão e avulsa.
 */
import { useEffect, useMemo } from 'react'
import { useEntregadoresNoMapa } from '@/features/monitoramento'
import { useEstabelecimentoAtual } from '@/features/loja'
import { useTempoRealDespacho } from '@/shared/realtime'
import { IndicadorTempoReal } from '@/shared/realtime/IndicadorTempoReal'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Button } from '@/shared/ui/button'
import { EstadoErro } from '@/shared/ui/estados'
import { LimiteDeErro } from '@/shared/ui/LimiteDeErro'
import { useEntregasEmSaida, useEntregasPendentes, useLotesDespachados, useLotesEmRota } from '../api/hooks'
import { AlertaIntegracao } from '../componentes/AlertaIntegracao'
import { BarraSelecao } from '../componentes/BarraSelecao'
import { FiltroOperacao } from '../componentes/FiltroOperacao'
import { BotaoNovaEntregaAvulsa } from '../componentes/FormularioEntregaAvulsa'
import { LegendaOperacao } from '../componentes/LegendaOperacao'
import { ListaLotesDespachados } from '../componentes/ListaLotesDespachados'
import { ListaOperacao } from '../componentes/ListaOperacao'
import { ListaPendentes } from '../componentes/ListaPendentes'
import { ListaRevisao } from '../componentes/ListaRevisao'
import { MapaDespacho } from '../componentes/MapaDespacho'
import { filtroMostraAguardando, filtroMostraSaidas, useFiltroOperacaoStore } from '../filtroOperacaoStore'
import { montarItensOperacao } from '../operacao'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro, useAgora } from '../util'

export function DespachoPagina() {
  // Entregas, lotes e frota em tempo real (T004; frota no mesmo mapa desde a T010).
  useTempoRealDespacho()

  // A seleção sobrevive à troca de aba (T010) e some na troca de sessão (`selecaoStore`).

  // Loja do token: centro do mapa e limite do lote (Constituição 5.6). Enquanto não chega,
  // vale o padrão 5 da store; o backend tem a palavra final (LIMITE_LOTE_EXCEDIDO).
  const loja = useEstabelecimentoAtual()
  const definirLimite = useSelecaoStore((s) => s.definirLimite)
  const maxPedidosPorLote = loja.data?.maxPedidosPorLote
  useEffect(() => {
    // Sem a loja, o padrão do DVP, e não o limite que sobrou da sessão anterior.
    definirLimite(maxPedidosPorLote && maxPedidosPorLote > 0 ? maxPedidosPorLote : 5)
  }, [maxPedidosPorLote, definirLimite])

  // Quem saiu da lista (despachada por outro, cancelada, em revisão) sai da seleção.
  const pendentes = useEntregasPendentes()
  const manterApenas = useSelecaoStore((s) => s.manterApenas)
  useEffect(() => {
    if (pendentes.data) manterApenas(pendentes.data.map((e) => e.id))
  }, [pendentes.data, manterApenas])

  // Operação unificada (T010): pedidos numerados do filtro e entregadores no mesmo mapa. As
  // entregas que saíram e os lotes em rota só são lidos quando o filtro os mostra.
  const filtro = useFiltroOperacaoStore((s) => s.filtro)
  const comAguardando = filtroMostraAguardando(filtro)
  const comSaidas = filtroMostraSaidas(filtro)
  const saidas = useEntregasEmSaida(comSaidas)
  const lotesDespachados = useLotesDespachados()
  const lotesEmRota = useLotesEmRota(comSaidas)
  const frota = useEntregadoresNoMapa()
  const agora = useAgora()

  const itens = useMemo(
    () =>
      montarItensOperacao({
        filtro,
        pendentes: pendentes.data ?? [],
        emSaida: saidas.data ?? [],
        lotes: [...(lotesDespachados.data ?? []), ...(lotesEmRota.data ?? [])],
        entregadores: frota.data ?? [],
      }),
    [filtro, pendentes.data, saidas.data, lotesDespachados.data, lotesEmRota.data, frota.data],
  )

  // Estados da lista (7.3): só contam as leituras que o filtro usa. Se uma delas falhar sem dados
  // e a outra tiver chegado ("Todos"), a lista mostra o que chegou e avisa o que faltou.
  const consultasDaLista = [...(comAguardando ? [pendentes] : []), ...(comSaidas ? [saidas] : [])]
  const carregandoItens = consultasDaLista.some((c) => c.isPending)
  const falhas = consultasDaLista.filter((c) => c.isError && c.data === undefined)
  const erroItens =
    falhas.length > 0
      ? {
          mensagem: mensagemDoErro(falhas[0]!.error),
          aoTentarNovamente: () => falhas.forEach((c) => void c.refetch()),
          parcial: consultasDaLista.some((c) => c.data !== undefined),
        }
      : null

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Despacho
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedidos e entregadores no mesmo mapa: despacho, lotes e revisão.
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

      {/* Mapa quase da tela toda e coluna estreita à direita (referência visual da T010). */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-2">
          <LimiteDeErro mensagem="Não foi possível exibir o mapa. As entregas continuam na lista ao lado e abaixo.">
            <MapaDespacho
              coordenadaLoja={loja.data?.coordenada ?? null}
              itens={itens}
              entregadores={frota.data ?? []}
              agora={agora}
            />
          </LimiteDeErro>
          {frota.isError && frota.data === undefined && (
            <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-800">
              Posição dos entregadores indisponível: {mensagemDoErro(frota.error)}
              <Button type="button" variant="outline" size="xs" onClick={() => void frota.refetch()}>
                Tentar novamente
              </Button>
            </p>
          )}
          <AvisoDesatualizado consulta={frota} />
          <LegendaOperacao />
        </div>
        <aside
          aria-label="Pedidos, lotes e revisão"
          className="flex flex-col gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[380px] lg:overflow-y-auto lg:pr-1"
        >
          <FiltroOperacao />
          {comSaidas && <AvisoDesatualizado consulta={saidas} />}
          <ListaOperacao itens={itens} filtro={filtro} carregando={carregandoItens} erro={erroItens} />
          <ListaLotesDespachados entregadores={frota.data} />
          <ListaRevisao />
        </aside>
      </div>

      <ListaPendentes />
    </section>
  )
}
