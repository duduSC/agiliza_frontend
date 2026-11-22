/**
 * Dialogo de ajuste de repasse (UC03, T006).
 * So disponivel quando a entrega nao tem recibo (Constituicao 5.2).
 * Sem atualizacao otimista (Constituicao 5.8).
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAjustes, useAjustarRepasse } from '../api/hooks'
import { formatarMoeda, paraValorMonetarioBackend } from '@/shared/formatacao'
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
import { EstadoCarregando, EstadoErro } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'

// Limites de AjustarRepasseRequest: @Digits(8, 2) e motivo ate 255.
const ajusteSchema = z.object({
  valorNovo: z
    .string()
    .trim()
    .regex(/^\d{1,8}([.,]\d{1,2})?$/, 'Informe um valor válido, com até 2 casas decimais (ex.: 12,50).'),
  motivo: z
    .string()
    .trim()
    .min(1, 'O motivo é obrigatório.')
    .max(255, 'Use no máximo 255 caracteres.'),
})

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

  const [errosCampo, setErrosCampo] = useState<{ valorNovo?: string; motivo?: string }>({})
  const envioUnico = useEnvioUnico()

  const historico = useAjustes(aberto ? entregaId : null)
  const { data: ajustes, isLoading: carregandoAjustes } = historico
  const mutation = useAjustarRepasse()

  // Entrega com recibo: mostrar mensagem e nao permitir ajuste (Constituicao 5.2)
  if (reciboId) {
    return (
      <Dialog open={aberto} onOpenChange={(open) => { if (!open) aoFechar() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de repasse</DialogTitle>
            <DialogDescription>
              Esta entrega está no recibo #{reciboId.slice(0, 8)}. Cancele o recibo para corrigir.
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
    setErrosCampo({})

    const resultado = ajusteSchema.safeParse({ valorNovo, motivo })
    if (!resultado.success) {
      const { fieldErrors } = z.flattenError(resultado.error)
      setErrosCampo({ valorNovo: fieldErrors.valorNovo?.[0], motivo: fieldErrors.motivo?.[0] })
      return
    }
    const valor = paraValorMonetarioBackend(Number(resultado.data.valorNovo.replace(',', '.')))
    if (valorAtual != null && valor === valorAtual) {
      setErrosCampo({ valorNovo: 'Informe um valor diferente do valor atual.' })
      return
    }

    void envioUnico(async () => {
      try {
        const ajuste = await mutation.mutateAsync({
          entregaId,
          valorNovo: valor,
          motivo: resultado.data.motivo,
        })
        toast.success(`Repasse ajustado para ${formatarMoeda(ajuste.valorNovo)}.`)
        aoFechar()
      } catch (erro) {
        if (!ehErroApi(erro)) {
          setErroLocal('Não foi possível ajustar o repasse.')
          return
        }
        const doServidor = (campo: string) => erro.campos.find((c) => c.campo === campo)?.mensagem
        const doValor = doServidor('valorNovo')
        const doMotivo = doServidor('motivo')
        if (doValor || doMotivo) setErrosCampo({ valorNovo: doValor, motivo: doMotivo })
        else setErroLocal(erro.mensagem)
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open && !mutation.isPending) aoFechar() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar repasse</DialogTitle>
          <DialogDescription>
            Valor atual: {formatarMoeda(valorAtual)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-valor">Novo valor (R$)</Label>
            <Input
              id="ajuste-valor"
              inputMode="decimal"
              aria-invalid={!!errosCampo.valorNovo}
              aria-describedby={errosCampo.valorNovo ? 'ajuste-valor-erro' : undefined}
              value={valorNovo}
              onChange={(e) => setValorNovo(e.target.value)}
              placeholder="Ex.: 12,50"
            />
            {errosCampo.valorNovo && (
              <p id="ajuste-valor-erro" className="text-sm text-red-700">{errosCampo.valorNovo}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-motivo">Motivo (obrigatório)</Label>
            <Input
              id="ajuste-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do ajuste"
              aria-invalid={!!errosCampo.motivo}
              aria-describedby={errosCampo.motivo ? 'ajuste-motivo-erro' : undefined}
            />
            {errosCampo.motivo && (
              <p id="ajuste-motivo-erro" className="text-sm text-red-700">{errosCampo.motivo}</p>
            )}
          </div>

          {erroLocal && (
            <p role="alert" className="text-sm text-red-600">{erroLocal}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar ajuste'}
            </Button>
          </DialogFooter>
        </form>

        {/* Historico de ajustes */}
        <div className="mt-4 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Histórico de ajustes</h4>
          {carregandoAjustes && <EstadoCarregando mensagem="Carregando histórico…" />}
          {historico.isError && !ajustes && (
            <EstadoErro
              mensagem={ehErroApi(historico.error) ? historico.error.mensagem : 'Histórico indisponível.'}
              aoTentarNovamente={() => void historico.refetch()}
            />
          )}
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
