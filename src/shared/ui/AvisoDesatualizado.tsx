import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

/** A atualização falhou, mas há dados: eles continuam na tela, com o aviso. */
export function AvisoDesatualizado({
  consulta,
}: {
  consulta: { data: unknown; isError: boolean; refetch: () => unknown }
}) {
  if (!consulta.isError || consulta.data === undefined) return null
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      Não foi possível atualizar. Exibindo os últimos dados recebidos.
      <Button type="button" variant="outline" size="xs" onClick={() => void consulta.refetch()}>
        Tentar novamente
      </Button>
    </p>
  )
}
