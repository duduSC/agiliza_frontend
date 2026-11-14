/**
 * Dialogo de ajuste de repasse (UC03, T006).
 * So disponivel quando a entrega nao tem recibo (Constituicao 5.2).
 * Sem atualizacao otimista (Constituicao 5.8).
 */
import { useState } from 'react'
import { useAjustes, useAjustarRepasse } from '../api/hooks'
import { formatarMoeda } from '@/shared/formatacao'
import { formatarDataHora } from '@/shared/formatacao/dataHora'
import { ehErroApi } from '@/shared/api/erros'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { EstadoCarregando } from '@/shared/ui/estados'

type Props = {
  entregaId: string
  valorAtual: number | null | undefined
  reciboId: string | null | undefined
  aberto: boolean
  aoFechar: () => void
}

export function DialogoAjusteRepasse({ entregaId, valorAtual, reciboId, aberto, aoFechar }: Props) {
  const [valorNovo, setValorNovo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  const { data: ajustes, isLoading: carregandoAjustes } = useAjustes(aberto ? entregaId : null)
  const mutation = useAjustarRepasse()

  // Entrega com recibo: mostrar mensagem e nao permitir ajuste (Constituicao 5.2)
  if (reciboId) {
    return (
      <Dialog open={aberto} onOpenChange={(open) => { if (!open) aoFechar() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de repasse</DialogTitle>
            <DialogDescription>
              Esta entrega esta no recibo — o recibo precisa ser cancelado antes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={aoFechar}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroLocal(null)

    const valor = parseFloat(valorNovo)
    if (isNaN(valor) || valor < 0) {
      setErroLocal('Informe um valor valido.')
      return
    }
    if (!motivo.trim()) {
      setErroLocal('O motivo e obrigatorio.')
      return
    }

    mutation.mutate(
      { entregaId, valorNovo: Math.round(valor * 100) / 100, motivo: motivo.trim() },
      {
        onSuccess: () => {
          setValorNovo('')
          setMotivo('')
          aoFechar()
        },
        onError: (erro) => {
          if (ehErroApi(erro)) {
            setErroLocal(erro.mensagem)
          } else {
            setErroLocal('Erro ao ajustar repasse.')
          }
        },
      },
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) aoFechar() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar repasse</DialogTitle>
          <DialogDescription>
            Valor atual: {formatarMoeda(valorAtual)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-valor">Novo valor (R$)</Label>
            <Input
              id="ajuste-valor"
              type="number"
              step="0.01"
              min="0"
              value={valorNovo}
              onChange={(e) => setValorNovo(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-motivo">Motivo (obrigatorio)</Label>
            <Input
              id="ajuste-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do ajuste"
            />
          </div>

          {erroLocal && (
            <p role="alert" className="text-sm text-red-600">{erroLocal}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar ajuste'}
            </Button>
          </DialogFooter>
        </form>

        {/* Historico de ajustes */}
        <div className="mt-4 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Historico de ajustes</h4>
          {carregandoAjustes && <EstadoCarregando mensagem="Carregando historico..." />}
          {ajustes && ajustes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum ajuste anterior.</p>
          )}
          {ajustes && ajustes.length > 0 && (
            <ul className="space-y-2">
              {ajustes.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium">{formatarMoeda(a.valorAnterior)}</span>
                  {' → '}
                  <span className="font-medium">{formatarMoeda(a.valorNovo)}</span>
                  {' — '}
                  <span className="text-muted-foreground">{a.motivo}</span>
                  {' ('}
                  <span className="text-muted-foreground">{formatarDataHora(a.ajustadoEm)}</span>
                  {')'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
