/**
 * Cancelamento com motivo obrigatório e confirmação explícita (T003). Sem atualização
 * otimista: a entrega só sai da lista depois da resposta do servidor (Artigo 5.5).
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ehErroApi } from '@/shared/api'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useCancelarEntrega } from '../api/hooks'
import { cancelamentoFormSchema, type CancelamentoForm } from '../formularios'
import { mensagemDoErro } from '../util'
import { CampoTexto } from './campos'

export function BotaoCancelarEntrega({ entrega }: { entrega: EntregaResponse }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        aria-label={`Cancelar entrega de ${entrega.nomeCliente}`}
      >
        Cancelar
      </Button>
      {aberto && <DialogoCancelarEntrega entrega={entrega} aoFechar={() => setAberto(false)} />}
    </>
  )
}

function DialogoCancelarEntrega({
  entrega,
  aoFechar,
}: {
  entrega: EntregaResponse
  aoFechar: () => void
}) {
  const cancelar = useCancelarEntrega()
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CancelamentoForm>({
    resolver: zodResolver(cancelamentoFormSchema),
    defaultValues: { motivo: '' },
  })

  const envioUnico = useEnvioUnico()
  const enviar = handleSubmit(({ motivo }) =>
    envioUnico(async () => {
      setErroServidor(null)
      try {
        await cancelar.mutateAsync({ id: entrega.id, motivo })
        toast.success(`Entrega de ${entrega.nomeCliente} cancelada.`)
        aoFechar()
      } catch (erro) {
        const doMotivo = ehErroApi(erro) && erro.campos.find((c) => c.campo === 'motivo')
        if (doMotivo) setError('motivo', { message: doMotivo.mensagem })
        setErroServidor(mensagemDoErro(erro))
      }
    }),
  )

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto && !cancelar.isPending) aoFechar()
      }}
    >
      <DialogContent>
        <form onSubmit={enviar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cancelar entrega</DialogTitle>
            <DialogDescription>
              A entrega de <strong>{entrega.nomeCliente}</strong> será cancelada. Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <CampoTexto
            rotulo="Motivo do cancelamento"
            obrigatorio
            erro={errors.motivo?.message}
            {...register('motivo')}
          />
          {erroServidor && (
            <p role="alert" className="text-sm text-destructive">
              {erroServidor}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar} disabled={cancelar.isPending}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={cancelar.isPending}>
              {cancelar.isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
