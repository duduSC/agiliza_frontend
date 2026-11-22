/**
 * Fila de revisão (`pendenteRevisao = true`; HU01, UC01 A1; Constituição, Artigo 5.4).
 * Só três motivos existem. Entrega aqui NÃO aparece entre as pendentes de despacho.
 *
 * - SEM_COORDENADA: o operador informa latitude/longitude (o arrastar do pino é da F3);
 *   a distância é recalculada pelo backend e a tela só muda após a resposta.
 * - SEM_DISTANCIA: nenhuma ação nesta tarefa (padrão restritivo).
 * - CONTESTACAO_ENTREGADOR: a análise é do acerto (F5); aqui só é sinalizada.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ehErroApi, type EntregaResponse } from '@/shared/api'
import { LABEL_MOTIVO_REVISAO, LABEL_STATUS_ENTREGA } from '@/shared/dominio'
import { formatarKm, formatarMoeda } from '@/shared/formatacao'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ConteudoPorEstado, type EstadoTela } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useAjustarCoordenada, useEntregasEmRevisao } from '../api/hooks'
import {
  coordenadaFormSchema,
  paraAjustarCoordenadaRequest,
  type CoordenadaForm,
} from '../formularios'
import { podeAjustarCoordenada, podeCancelar } from '../regras'
import { mensagemDoErro } from '../util'
import { CampoTexto } from './campos'
import { BotaoCancelarEntrega } from './DialogoCancelarEntrega'

export function ListaRevisao() {
  const consulta = useEntregasEmRevisao()

  let estado: EstadoTela
  if (consulta.isPending) estado = { tipo: 'carregando' }
  else if (consulta.data === undefined)
    estado = {
      tipo: 'erro',
      mensagem: mensagemDoErro(consulta.error),
      aoTentarNovamente: () => void consulta.refetch(),
    }
  else if (consulta.data.length === 0)
    estado = { tipo: 'vazio', titulo: 'Nenhuma entrega em revisão' }
  else
    estado = {
      tipo: 'sucesso',
      conteudo: (
        <ul aria-label="Entregas em revisão" className="flex flex-col gap-3">
          {consulta.data.map((entrega) => (
            <ItemRevisao key={entrega.id} entrega={entrega} />
          ))}
        </ul>
      ),
    }

  return (
    <section aria-labelledby="titulo-revisao" className="flex flex-col gap-3">
      <h2 id="titulo-revisao" className="text-lg font-semibold">
        Revisão pendente
        {consulta.data && consulta.data.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({consulta.data.length})
          </span>
        )}
      </h2>
      <AvisoDesatualizado consulta={consulta} />
      <ConteudoPorEstado estado={estado} />
    </section>
  )
}

function ItemRevisao({ entrega }: { entrega: EntregaResponse }) {
  const motivo = entrega.motivoRevisao ? LABEL_MOTIVO_REVISAO[entrega.motivoRevisao] : 'Motivo não informado'
  return (
    <li
      data-testid={`revisao-${entrega.id}`}
      className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50/40 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{entrega.nomeCliente}</p>
          <p className="text-sm text-muted-foreground">{entrega.enderecoCompleto}</p>
        </div>
        <Badge variant="outline" className="border-amber-400 text-amber-900">
          <AlertTriangle aria-hidden="true" />
          Revisão: {motivo}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{LABEL_STATUS_ENTREGA[entrega.status]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bairro</dt>
          <dd>{entrega.bairro ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Distância</dt>
          <dd>{formatarKm(entrega.distanciaKm)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Repasse</dt>
          <dd>{formatarMoeda(entrega.valorRepasse)}</dd>
        </div>
      </dl>
      {entrega.motivoRevisao === 'CONTESTACAO_ENTREGADOR' && (
        <p className="text-sm text-muted-foreground">
          O entregador contestou o valor. A entrega fica fora do recibo até a revisão ser resolvida.
        </p>
      )}
      {podeAjustarCoordenada(entrega) && <FormularioCoordenada entrega={entrega} />}
      {podeCancelar(entrega) && (
        <div className="flex justify-end">
          <BotaoCancelarEntrega entrega={entrega} />
        </div>
      )}
    </li>
  )
}

function FormularioCoordenada({ entrega }: { entrega: EntregaResponse }) {
  const ajustar = useAjustarCoordenada()
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const envioUnico = useEnvioUnico()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CoordenadaForm>({
    resolver: zodResolver(coordenadaFormSchema),
    defaultValues: { latitude: '', longitude: '' },
  })

  const enviar = handleSubmit(async (valores) => {
    await envioUnico(async () => {
      setErroServidor(null)
      try {
        await ajustar.mutateAsync({ id: entrega.id, coordenada: paraAjustarCoordenadaRequest(valores) })
        toast.success(`Coordenada de ${entrega.nomeCliente} enviada. A distância é recalculada pelo sistema.`)
      } catch (erro) {
        if (ehErroApi(erro)) {
          for (const { campo, mensagem } of erro.campos) {
            if (campo === 'latitude' || campo === 'longitude') setError(campo, { message: mensagem })
          }
        }
        setErroServidor(mensagemDoErro(erro))
      }
    })
  })

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={`Ajustar coordenada: entrega de ${entrega.nomeCliente}`}
      className="grid grid-cols-2 items-start gap-3"
    >
      <CampoTexto
        rotulo="Latitude"
        inputMode="decimal"
        obrigatorio
        erro={errors.latitude?.message}
        {...register('latitude')}
      />
      <CampoTexto
        rotulo="Longitude"
        inputMode="decimal"
        obrigatorio
        erro={errors.longitude?.message}
        {...register('longitude')}
      />
      <Button type="submit" className="col-span-2" disabled={ajustar.isPending}>
        {ajustar.isPending ? 'Salvando…' : 'Salvar coordenada'}
      </Button>
      {erroServidor && (
        <p role="alert" className="text-sm text-destructive col-span-2">
          {erroServidor}
        </p>
      )}
    </form>
  )
}
