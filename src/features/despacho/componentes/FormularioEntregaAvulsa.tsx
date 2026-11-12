/**
 * Entrega avulsa (UC01 A2): o operador digita os dados do cliente e do pagamento.
 * Validação Zod no cliente; erros por campo do servidor (`ApiErrorResponse.campos[]`)
 * vão para o campo correspondente (Artigo 7.3). Botão bloqueado durante o envio (sem
 * duplo clique) e a lista só muda depois da resposta do servidor.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ehErroApi } from '@/shared/api'
import { FORMAS_PAGAMENTO, LABEL_FORMA_PAGAMENTO } from '@/shared/dominio'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useCriarEntregaAvulsa } from '../api/hooks'
import {
  entregaAvulsaFormSchema,
  paraCriarEntregaAvulsaRequest,
  separarErrosDeCampo,
  VALORES_INICIAIS_AVULSA,
  type EntregaAvulsaForm,
} from '../formularios'
import { mensagemDoErro } from '../util'
import { CampoSelecao, CampoTexto } from './campos'

export function BotaoNovaEntregaAvulsa() {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button type="button" onClick={() => setAberto(true)}>
        Nova entrega avulsa
      </Button>
      {aberto && <DialogoEntregaAvulsa aoFechar={() => setAberto(false)} />}
    </>
  )
}

function DialogoEntregaAvulsa({ aoFechar }: { aoFechar: () => void }) {
  const criar = useCriarEntregaAvulsa()
  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto && !criar.isPending) aoFechar()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova entrega avulsa</DialogTitle>
          <DialogDescription>
            Pedido digitado manualmente. Se a coordenada ficar em branco, o sistema tenta localizar
            o endereço; se não conseguir, a entrega vai para a lista de revisão.
          </DialogDescription>
        </DialogHeader>
        <FormularioEntregaAvulsa
          enviando={criar.isPending}
          aoEnviar={(corpo) => criar.mutateAsync(corpo)}
          aoConcluir={aoFechar}
          aoCancelar={aoFechar}
        />
      </DialogContent>
    </Dialog>
  )
}

type Props = {
  enviando: boolean
  aoEnviar: (corpo: ReturnType<typeof paraCriarEntregaAvulsaRequest>) => Promise<unknown>
  aoConcluir: () => void
  aoCancelar: () => void
}

export function FormularioEntregaAvulsa({ enviando, aoEnviar, aoConcluir, aoCancelar }: Props) {
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntregaAvulsaForm>({
    resolver: zodResolver(entregaAvulsaFormSchema),
    defaultValues: VALORES_INICIAIS_AVULSA,
  })
  const bloqueado = enviando || isSubmitting

  const enviar = handleSubmit(async (valores) => {
    if (enviando) return
    setErroGeral(null)
    try {
      await aoEnviar(paraCriarEntregaAvulsaRequest(valores))
      toast.success('Entrega avulsa cadastrada.')
      aoConcluir()
    } catch (erro) {
      if (ehErroApi(erro) && erro.campos.length > 0) {
        const { doFormulario, semCampo } = separarErrosDeCampo(erro.campos)
        doFormulario.forEach(({ campo, mensagem }, i) =>
          setError(campo, { type: 'server', message: mensagem }, { shouldFocus: i === 0 }),
        )
        setErroGeral(semCampo.length > 0 ? semCampo.join(' ') : erro.mensagem)
      } else {
        setErroGeral(mensagemDoErro(erro))
      }
    }
  })

  return (
    <form onSubmit={enviar} noValidate aria-label="Entrega avulsa" aria-busy={bloqueado} className="grid gap-4">
      <fieldset className="grid gap-4">
        <legend className="sr-only">Cliente</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Nome do cliente"
            obrigatorio
            erro={errors.nomeCliente?.message}
            {...register('nomeCliente')}
          />
          <CampoTexto
            rotulo="Telefone"
            type="tel"
            erro={errors.telefoneCliente?.message}
            {...register('telefoneCliente')}
          />
        </div>
        <CampoTexto
          rotulo="Endereço completo"
          obrigatorio
          erro={errors.enderecoCompleto?.message}
          {...register('enderecoCompleto')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto rotulo="Bairro" erro={errors.bairro?.message} {...register('bairro')} />
          <CampoTexto
            rotulo="CEP"
            inputMode="numeric"
            erro={errors.cep?.message}
            {...register('cep')}
          />
          <CampoTexto
            rotulo="Complemento"
            erro={errors.complemento?.message}
            {...register('complemento')}
          />
        </div>
        <CampoTexto
          rotulo="Ponto de referência"
          erro={errors.pontoReferencia?.message}
          {...register('pontoReferencia')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Latitude"
            inputMode="decimal"
            erro={errors.latitude?.message}
            ajuda="Opcional. Ex.: -23,5505"
            {...register('latitude')}
          />
          <CampoTexto
            rotulo="Longitude"
            inputMode="decimal"
            erro={errors.longitude?.message}
            ajuda="Opcional. Ex.: -46,6333"
            {...register('longitude')}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium">Pagamento</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            rotulo="Valor do pedido (R$)"
            inputMode="decimal"
            erro={errors.valorPedido?.message}
            {...register('valorPedido')}
          />
          <CampoSelecao
            rotulo="Forma de pagamento"
            erro={errors.formaPagamento?.message}
            {...register('formaPagamento')}
          >
            <option value="">Não informada</option>
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma} value={forma}>
                {LABEL_FORMA_PAGAMENTO[forma]}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            rotulo="Troco para (R$)"
            inputMode="decimal"
            erro={errors.trocoPara?.message}
            {...register('trocoPara')}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" {...register('pagoOnline')} />
          Pago online (nada a receber na porta)
        </label>
        <CampoTexto
          rotulo="Observações"
          erro={errors.observacoes?.message}
          {...register('observacoes')}
        />
      </fieldset>

      {erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {erroGeral}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={aoCancelar} disabled={bloqueado}>
          Cancelar
        </Button>
        <Button type="submit" disabled={bloqueado}>
          {bloqueado ? 'Salvando…' : 'Cadastrar entrega'}
        </Button>
      </div>
    </form>
  )
}
