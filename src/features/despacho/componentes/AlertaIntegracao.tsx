/**
 * Alerta de integracao degradada (T004, UC01 A3, RNF04).
 * Banner simples com contagem de falhas PENDENTE.
 */
import { AlertTriangle } from 'lucide-react'
import { useFalhasPendentes } from '../api/hooks'

export function AlertaIntegracao() {
  const { data: quantidade } = useFalhasPendentes()

  if (!quantidade || quantidade === 0) return null

  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <p className="text-sm">
        <strong>Integração degradada:</strong> {quantidade} falha(s) pendente(s) de reprocessamento.
      </p>
    </div>
  )
}
