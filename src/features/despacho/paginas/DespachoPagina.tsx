/**
 * Despacho (UC01) — F2/T003: listas de pendentes e de revisão e entrega avulsa.
 * Mapa, seleção, despacho, devolução e tempo real ficam para a F3.
 */
import { BotaoNovaEntregaAvulsa } from '../componentes/FormularioEntregaAvulsa'
import { ListaPendentes } from '../componentes/ListaPendentes'
import { ListaRevisao } from '../componentes/ListaRevisao'

export function DespachoPagina() {
  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Despacho
          </h1>
          <p className="text-sm text-muted-foreground">
            Entregas aguardando despacho e entregas em revisão. Atualiza a cada 15 segundos.
          </p>
        </div>
        <BotaoNovaEntregaAvulsa />
      </header>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ListaPendentes />
        <ListaRevisao />
      </div>
    </section>
  )
}
