/**
 * Monitoramento da frota em tempo real (T005, UC04, HU08).
 *
 * - Mapa com cada entregador ONLINE ou EM_ROTA na ultimaPosicao.
 * - Indicador visual de disponibilidade com legenda (cor nao e o unico indicador).
 * - Alerta de posicao desatualizada (> 3 min) com horario da ultima posicao.
 * - Somente consulta: nenhuma acao altera estado.
 * - Tempo real via STOMP com polling 15 s de fallback.
 */
import { useEffect, useState } from 'react'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/shared/ui/estados'
import { IndicadorTempoReal } from '@/features/despacho/componentes/IndicadorTempoReal'
import { useEntregadoresNoMapa } from '../api/hooks'
import { useTempoRealFrota } from '../api/useTempoRealFrota'
import { LegendaFrota } from '../componentes/LegendaFrota'
import { ListaEntregadores } from '../componentes/ListaEntregadores'
import { MapaFrota } from '../componentes/MapaFrota'

/** Atualiza o "agora" a cada 30s para que o alerta de 3 min seja reativo. */
function useAgoraReativo(): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return agora
}

export function MonitoramentoPagina() {
  // Conectar STOMP para o topico de frota
  useTempoRealFrota()

  const { data: entregadores, isLoading, isError, refetch } = useEntregadoresNoMapa()
  const agora = useAgoraReativo()

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Monitoramento
          </h1>
          <p className="text-sm text-muted-foreground">
            Posicao da frota em tempo real.
          </p>
        </div>
        <IndicadorTempoReal />
      </header>

      <LegendaFrota />

      {/* Estados carregando, erro e vazio (Constituicao 7.3) */}
      {isLoading && <EstadoCarregando mensagem="Carregando posicao dos entregadores..." />}

      {isError && (
        <EstadoErro
          mensagem="Nao foi possivel carregar a posicao dos entregadores."
          aoTentarNovamente={() => void refetch()}
        />
      )}

      {!isLoading && !isError && entregadores && entregadores.length === 0 && (
        <EstadoVazio
          titulo="Nenhum entregador online"
          descricao="Quando um entregador ficar online ou em rota, ele aparecera aqui."
        />
      )}

      {!isLoading && !isError && entregadores && entregadores.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <MapaFrota
            entregadores={entregadores}
            coordenadaLoja={null}
            agora={agora}
          />
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">
              Entregadores ({entregadores.length})
            </h2>
            <ListaEntregadores entregadores={entregadores} agora={agora} />
          </div>
        </div>
      )}
    </section>
  )
}
