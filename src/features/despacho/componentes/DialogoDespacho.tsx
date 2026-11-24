/**
 * Dialogo de despacho (T004, UC01 HU02). Lista entregadores ONLINE + ATIVO.
 * Sem atualizacao otimista (Constituicao 5.8): estado de envio, bloqueio de
 * duplo clique e invalidacao de cache apos resposta.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import type { MotoboyResponse } from '@/shared/api/schemas'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ConteudoPorEstado, type EstadoTela } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useDespacharLote, useEntregadoresDisponiveis } from '../api/hooks'
import { useSelecaoStore } from '../selecaoStore'
import { mensagemDoErro } from '../util'

type Props = {
  aoFechar: () => void
}

export function DialogoDespacho({ aoFechar }: Props) {
  const selecionadas = useSelecaoStore((s) => s.selecionadas)
  const limparSelecao = useSelecaoStore((s) => s.limparSelecao)
  const consulta = useEntregadoresDisponiveis()
  const despachar = useDespacharLote()
  const [motoboyId, setMotoboyId] = useState<string | null>(null)
  const [erroServidor, setErroServidor] = useState<string | null>(null)

  const entregaIds = Array.from(selecionadas)

  const envioUnico = useEnvioUnico()
  const aoConfirmar = () =>
    void envioUnico(async () => {
      if (!motoboyId) return
      setErroServidor(null)
      try {
        await despachar.mutateAsync({ motoboyId, entregaIds })
        toast.success(`Lote com ${entregaIds.length} entrega(s) despachado.`)
        limparSelecao()
        aoFechar()
      } catch (erro) {
        setErroServidor(mensagemDoErro(erro))
      }
    })

  let estadoLista: EstadoTela
  if (consulta.isPending) {
    estadoLista = { tipo: 'carregando' }
  } else if (consulta.data === undefined) {
    estadoLista = {
      tipo: 'erro',
      mensagem: mensagemDoErro(consulta.error),
      aoTentarNovamente: () => void consulta.refetch(),
    }
  } else if (consulta.data.length === 0) {
    estadoLista = {
      tipo: 'vazio',
      titulo: 'Nenhum entregador online',
      descricao: 'Não há entregadores disponíveis para despacho no momento.',
    }
  } else {
    estadoLista = {
      tipo: 'sucesso',
      conteudo: (
        <ListaEntregadores
          motoboys={consulta.data}
          selecionado={motoboyId}
          aoSelecionar={setMotoboyId}
        />
      ),
    }
  }

  const podeFinalizar =
    entregaIds.length > 0 &&
    !despachar.isPending &&
    consulta.data?.some((m) => m.id === motoboyId) === true

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto && !despachar.isPending) aoFechar()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Despachar entregas</DialogTitle>
          <DialogDescription>
            {entregaIds.length} entrega(s) selecionada(s). Escolha um entregador para despachar.
          </DialogDescription>
        </DialogHeader>

        <ConteudoPorEstado estado={estadoLista} />

        {erroServidor && (
          <p role="alert" className="text-sm text-destructive">
            {erroServidor}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={aoFechar}
            disabled={despachar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={aoConfirmar}
            disabled={!podeFinalizar}
          >
            {despachar.isPending ? 'Despachando…' : 'Confirmar despacho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ListaEntregadores({
  motoboys,
  selecionado,
  aoSelecionar,
}: {
  motoboys: MotoboyResponse[]
  selecionado: string | null
  aoSelecionar: (id: string) => void
}) {
  return (
    <fieldset>
      <legend className="sr-only">Entregadores disponíveis</legend>
      <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Entregadores disponíveis">
        {motoboys.map((m) => (
          <li key={m.id}>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                selecionado === m.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/50'
              }`}
            >
              <input
                type="radio"
                name="motoboyId"
                value={m.id}
                checked={selecionado === m.id}
                onChange={() => aoSelecionar(m.id)}
                className="sr-only"
                aria-label={`Selecionar ${m.nome}`}
              />
              <div
                className={`size-3 rounded-full ${
                  selecionado === m.id ? 'bg-primary' : 'bg-border'
                }`}
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="font-medium">{m.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {m.telefone}
                  {m.placaVeiculo && ` - ${m.placaVeiculo}`}
                </p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
