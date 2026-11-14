/**
 * Dialogo para gerar recibo (UC03, T006).
 * Mostra preview do que sera incluido, usando o extrato.
 * Sem atualizacao otimista (Constituicao 5.8).
 * O total vem do backend (Constituicao 5.1).
 */
import type { ExtratoAcertoResponse } from '@/shared/api/schemas'
import { useGerarRecibo } from '../api/hooks'
import { formatarMoeda } from '@/shared/formatacao'
import { ehErroApi } from '@/shared/api/erros'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  extrato: ExtratoAcertoResponse | null
  motoboyId: string
  periodoInicio: string
  periodoFim: string
  aberto: boolean
  aoFechar: () => void
}

export function DialogoGerarRecibo({ extrato, motoboyId, periodoInicio, periodoFim, aberto, aoFechar }: Props) {
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const mutation = useGerarRecibo()

  // Entregas que entrariam no recibo: estado final, sem revisao, sem recibo
  const entregasElegiveis = extrato?.linhas.filter(
    (l) => l.situacao === 'A_ACERTAR' && !l.reciboId,
  ) ?? []

  // Entregas ja em outro recibo
  const entregasComRecibo = extrato?.linhas.filter(
    (l) => l.reciboId != null,
  ) ?? []

  function handleGerar() {
    setErroLocal(null)
    mutation.mutate(
      { motoboyId, periodoInicio, periodoFim },
      {
        onSuccess: () => aoFechar(),
        onError: (erro) => {
          if (ehErroApi(erro)) {
            setErroLocal(erro.mensagem)
          } else {
            setErroLocal('Erro ao gerar recibo.')
          }
        },
      },
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) aoFechar() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar recibo</DialogTitle>
          <DialogDescription>
            Entregador: {extrato?.nomeEntregador ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              {entregasElegiveis.length} entrega(s) elegiveis para o recibo
            </p>
            {entregasElegiveis.length > 0 && (
              <ul className="mt-2 space-y-1">
                {entregasElegiveis.map((l) => (
                  <li key={l.entregaId} className="flex justify-between text-sm">
                    <span>{l.nomeCliente}</span>
                    <span>{formatarMoeda(l.valorRepasse)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 border-t pt-2 text-sm font-semibold">
              Total (backend): {formatarMoeda(extrato?.totalDevido)}
            </p>
          </div>

          {entregasComRecibo.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {entregasComRecibo.length} entrega(s) ja vinculada(s) a outro recibo (excluidas).
            </p>
          )}

          {extrato?.possuiValorIndefinido && (
            <p role="alert" className="text-sm text-yellow-700">
              Atencao: ha entregas sem valor calculado que nao entraram no recibo.
            </p>
          )}

          {entregasElegiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma entrega elegivel para o recibo no periodo selecionado.
            </p>
          )}

          {erroLocal && (
            <p role="alert" className="text-sm text-red-600">{erroLocal}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={mutation.isPending || entregasElegiveis.length === 0}
          >
            {mutation.isPending ? 'Gerando...' : 'Confirmar geracao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
