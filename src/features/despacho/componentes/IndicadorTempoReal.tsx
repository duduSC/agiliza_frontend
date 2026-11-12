/**
 * Indicador "tempo real offline" (T004, RNF06). Aparece quando o STOMP esta desconectado.
 * Acessibilidade: texto, nao so cor (Constituicao 7.6).
 */
import { Wifi, WifiOff } from 'lucide-react'
import { useConexaoTempoReal } from '@/shared/realtime'

export function IndicadorTempoReal() {
  const estado = useConexaoTempoReal()

  if (estado === 'conectado') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700" role="status">
        <Wifi className="size-3.5" aria-hidden="true" />
        <span>Tempo real ativo</span>
      </div>
    )
  }

  if (estado === 'conectando') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-700" role="status">
        <Wifi className="size-3.5 animate-pulse" aria-hidden="true" />
        <span>Conectando...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-700" role="status" aria-live="polite">
      <WifiOff className="size-3.5" aria-hidden="true" />
      <span>Tempo real offline (polling a cada 15s)</span>
    </div>
  )
}
