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
import { useEstabelecimentoAtual } from '@/features/loja'
import { ehErroApi } from '@/shared/api/erros'
import { IndicadorTempoReal } from '@/shared/realtime/IndicadorTempoReal'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { LimiteDeErro } from '@/shared/ui/LimiteDeErro'
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

  const consulta = useEntregadoresNoMapa()
  const { data: entregadores, isLoading, error, refetch } = consulta
  const isError = consulta.isError && entregadores === undefined
  const loja = useEstabelecimentoAtual()
  const agora = useAgoraReativo()

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            Monitoramento
          </h1>
          <p className="text-sm text-muted-foreground">
            Posição da frota em tempo real.
          </p>
        </div>
        <IndicadorTempoReal />
      </header>

      <LegendaFrota />

      {/* Estados carregando, erro e vazio (Constituicao 7.3) */}
      {isLoading && <EstadoCarregando mensagem="Carregando posição dos entregadores…" />}

      {isError && (
        <EstadoErro
          mensagem={`Não foi possível carregar a posição dos entregadores. ${ehErroApi(error) ? error.mensagem : ''}`}
          aoTentarNovamente={() => void refetch()}
        />
      )}

      <AvisoDesatualizado consulta={consulta} />

      {!isLoading && !isError && entregadores && entregadores.length === 0 && (
        <EstadoVazio
          titulo="Nenhum entregador online"
          descricao="Quando um entregador ficar online ou em rota, ele aparecerá aqui."
        />
      )}

      {!isLoading && !isError && entregadores && entregadores.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <LimiteDeErro mensagem="Não foi possível exibir o mapa. Os entregadores continuam na lista.">
            <MapaFrota
              entregadores={entregadores}
              coordenadaLoja={loja.data?.coordenada ?? null}
              agora={agora}
            />
          </LimiteDeErro>
          <div className="flex flex-col gap-3">
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
