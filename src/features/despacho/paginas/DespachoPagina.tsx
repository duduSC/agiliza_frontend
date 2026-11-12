/**
 * Despacho (UC01) — pagina completa com mapa, selecao multipla, despacho, devolucao
 * e tempo real (T004; lista e revisao da T003).
 */
import { useEffect } from 'react'
import { useTempoRealDespacho } from '@/shared/realtime'
import { AlertaIntegracao } from '../componentes/AlertaIntegracao'
import { BarraSelecao } from '../componentes/BarraSelecao'
import { BotaoNovaEntregaAvulsa } from '../componentes/FormularioEntregaAvulsa'
import { IndicadorTempoReal } from '../componentes/IndicadorTempoReal'
import { ListaLotesDespachados } from '../componentes/ListaLotesDespachados'
import { ListaPendentes } from '../componentes/ListaPendentes'
import { ListaRevisao } from '../componentes/ListaRevisao'
import { MapaDespacho } from '../componentes/MapaDespacho'
import { useSelecaoStore } from '../selecaoStore'

export function DespachoPagina() {
  // Conectar STOMP (T004)
  useTempoRealDespacho()

  // Limpar selecao quando o componente desmontar (navegar para outra pagina)
  const limparSelecao = useSelecaoStore((s) => s.limparSelecao)
  useEffect(() => {
    return () => limparSelecao()
  }, [limparSelecao])

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Despacho
          </h1>
          <p className="text-sm text-muted-foreground">
            Entregas aguardando despacho e entregas em revisao.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IndicadorTempoReal />
          <BotaoNovaEntregaAvulsa />
        </div>
      </header>

      <AlertaIntegracao />
      <BarraSelecao />

      {/* Mapa + listas lado a lado em telas grandes */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <MapaDespacho coordenadaLoja={null} />
          <ListaPendentes />
        </div>
        <div className="flex flex-col gap-6">
          <ListaRevisao />
          <ListaLotesDespachados />
        </div>
      </div>
    </section>
  )
}
