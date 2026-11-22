/**
 * Dialogo para gerar recibo (UC03, T006).
 * Mostra preview do que sera incluido, usando o extrato.
 * Sem atualizacao otimista (Constituicao 5.8).
 * O total vem do backend (Constituicao 5.1).
 */
import type { ExtratoAcertoResponse } from '@/shared/api/schemas'
import { useGerarRecibo } from '../api/hooks'
import { formatarMoeda } from '@/shared/formatacao'
import { totalParaExibir } from '../regras'
import { ehErroApi } from '@/shared/api/erros'
import { useState } from 'react'
import { toast } from 'sonner'
import { EstadoCarregando } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
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
  /** O extrato esta sendo relido: a previa ainda nao vale. */
  atualizando: boolean
  erroAoAtualizar: string | null
  motoboyId: string
  periodoInicio: string
  periodoFim: string
  aberto: boolean
  aoFechar: () => void
}

export function DialogoGerarRecibo({ extrato, atualizando, erroAoAtualizar, motoboyId, periodoInicio, periodoFim, aberto, aoFechar }: Props) {
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

  const envioUnico = useEnvioUnico()
  // O backend recusa o recibo inteiro se uma entrega apta estiver sem valor (nao a exclui).
  const valorIndefinido = extrato?.possuiValorIndefinido === true

  function handleGerar() {
    void envioUnico(async () => {
      setErroLocal(null)
      try {
        const recibo = await mutation.mutateAsync({ motoboyId, periodoInicio, periodoFim })
        toast.success(
          `Recibo gerado: ${recibo.qtdEntregas} entrega(s), ${formatarMoeda(recibo.valorTotal)}.`,
        )
        aoFechar()
      } catch (erro) {
        setErroLocal(ehErroApi(erro) ? erro.mensagem : 'Não foi possível gerar o recibo.')
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open && !mutation.isPending) aoFechar() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar recibo</DialogTitle>
          <DialogDescription>
            Entregador: {extrato?.nomeEntregador ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              {entregasElegiveis.length} entrega(s) elegíveis para o recibo
            </p>
            {entregasElegiveis.length > 0 && (
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {entregasElegiveis.map((l) => (
                  <li key={l.entregaId} className="flex justify-between text-sm">
                    <span>{l.nomeCliente}</span>
                    <span>{formatarMoeda(l.valorRepasse)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 border-t pt-2 text-sm font-semibold">
              {valorIndefinido ? 'Total parcial' : 'Total do recibo'}: {formatarMoeda(extrato && totalParaExibir(extrato.totalDevido, 'A_ACERTAR', extrato.linhas).valor)}
            </p>
          </div>

          {entregasComRecibo.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {entregasComRecibo.length} entrega(s) já vinculada(s) a outro recibo (excluídas):{' '}
              {[...new Set(entregasComRecibo.map((l) => `#${l.reciboId?.slice(0, 8)}`))].join(', ')}
            </p>
          )}

          {atualizando && <EstadoCarregando mensagem="Atualizando a prévia…" />}
          {erroAoAtualizar && (
            <p role="alert" className="text-sm text-red-700">
              Não foi possível atualizar a prévia. {erroAoAtualizar}
            </p>
          )}

          {valorIndefinido && (
            <p role="alert" className="text-sm text-yellow-800">
              Há entregas sem repasse definido, por isso o recibo não pode ser gerado. Configure o
              valor de fora de área da loja ou ajuste o repasse dessas entregas.
            </p>
          )}

          {entregasElegiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma entrega elegível para o recibo no período selecionado.
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
            disabled={
              mutation.isPending ||
              atualizando ||
              erroAoAtualizar !== null ||
              valorIndefinido ||
              entregasElegiveis.length === 0
            }
          >
            {mutation.isPending ? 'Gerando…' : 'Confirmar geração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
