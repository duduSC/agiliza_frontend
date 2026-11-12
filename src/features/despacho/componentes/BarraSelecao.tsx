/**
 * Barra de selecao do despacho (T004). Mostra quantas entregas estao selecionadas,
 * o limite (maxPedidosPorLote) e oferece as acoes de despachar e limpar.
 */
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useEntregadoresDisponiveis } from '../api/hooks'
import { useSelecaoStore } from '../selecaoStore'
import { DialogoDespacho } from './DialogoDespacho'

export function BarraSelecao() {
  const selecionadas = useSelecaoStore((s) => s.selecionadas)
  const maxPedidosPorLote = useSelecaoStore((s) => s.maxPedidosPorLote)
  const limparSelecao = useSelecaoStore((s) => s.limparSelecao)
  const [dialogoAberto, setDialogoAberto] = useState(false)

  const consulta = useEntregadoresDisponiveis()
  const temEntregadores = (consulta.data?.length ?? 0) > 0
  const quantidade = selecionadas.size

  if (quantidade === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent/30 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium">
        {quantidade} de {maxPedidosPorLote} entrega(s) selecionada(s)
      </p>
      {quantidade >= maxPedidosPorLote && (
        <p className="text-xs text-amber-700" role="alert">
          Limite atingido
        </p>
      )}
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={limparSelecao}>
          Limpar selecao
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setDialogoAberto(true)}
          disabled={!temEntregadores}
          title={temEntregadores ? undefined : 'Nenhum entregador online'}
          aria-label={
            temEntregadores
              ? `Despachar ${quantidade} entrega(s)`
              : 'Despachar (nenhum entregador online)'
          }
        >
          Despachar
        </Button>
      </div>
      {dialogoAberto && <DialogoDespacho aoFechar={() => setDialogoAberto(false)} />}
    </div>
  )
}
