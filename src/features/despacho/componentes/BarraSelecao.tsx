/**
 * Barra de selecao do despacho (T004). Mostra quantas entregas estao selecionadas,
 * o limite (maxPedidosPorLote) e oferece as acoes de despachar e limpar.
 */
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useEntregadoresDisponiveis } from '../api/hooks'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro } from '../util'
import { DialogoDespacho } from './DialogoDespacho'

export function BarraSelecao() {
  const selecionadas = useSelecaoStore((s) => s.selecionadas)
  const maxPedidosPorLote = useSelecaoStore((s) => s.maxPedidosPorLote)
  const limparSelecao = useSelecaoStore((s) => s.limparSelecao)
  const [dialogoAberto, setDialogoAberto] = useState(false)

  const consulta = useEntregadoresDisponiveis()
  const temEntregadores = (consulta.data?.length ?? 0) > 0
  const quantidade = selecionadas.size

  // O dialogo continua montado se a selecao esvaziar no envio, para mostrar o resultado.
  if (quantidade === 0 && !dialogoAberto) return null
  const acimaDoLimite = quantidade > maxPedidosPorLote

  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium">
        {quantidade} de {maxPedidosPorLote} entrega(s) selecionada(s)
      </p>
      {acimaDoLimite && (
        <p className="text-sm font-medium text-red-800" role="alert">
          A loja aceita no máximo {maxPedidosPorLote} por lote. Remova {quantidade - maxPedidosPorLote}.
        </p>
      )}
      {quantidade === maxPedidosPorLote && (
        <p className="text-sm text-amber-800" role="alert">
          Limite atingido
        </p>
      )}
      {consulta.isPending && <p className="text-sm">Carregando entregadores…</p>}
      {consulta.data?.length === 0 && (
        <p className="text-sm font-medium text-red-800">Nenhum entregador online</p>
      )}
      {consulta.isError && !consulta.data && (
        <p className="text-sm text-red-800">
          {mensagemDoErro(consulta.error)}{' '}
          <Button type="button" variant="link" size="sm" onClick={() => void consulta.refetch()}>
            Tentar novamente
          </Button>
        </p>
      )}
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={limparSelecao}>
          Limpar seleção
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setDialogoAberto(true)}
          disabled={!temEntregadores || acimaDoLimite || quantidade === 0}
                    aria-label={
            consulta.data?.length === 0
              ? 'Despachar (nenhum entregador online)'
              : `Despachar ${quantidade} entrega(s)`
          }
        >
          Despachar
        </Button>
      </div>
      {dialogoAberto && <DialogoDespacho aoFechar={() => setDialogoAberto(false)} />}
    </div>
  )
}
