/**
 * Analisar a contestação do entregador (UC08 A1, HU14, DVP 1.5.5 passo 8; T010).
 *
 * Duas saídas, as duas com motivo obrigatório: manter o valor ou ajustar para um valor novo
 * (`POST /api/entregas/{id}/revisao/resolver`, `ResolverRevisaoRequest` da develop 8c02b47).
 * As recusas espelham o backend (`EntregaServiceImpl.resolverRevisao`, `PoliticaCorrecao`):
 * - caixa do dia da entrega fechado ou inexistente: nada é oferecido (Constituição, Artigo 5.3).
 *   O dia é o de `finalizadaEm`; sem ele, o de hoje em São Paulo, como no backend;
 * - entrega em recibo: só "manter"; o ajuste pede cancelar o recibo antes (Artigo 5.2);
 * - `CAIXA_FECHADO`, `AJUSTE_VALOR_NAO_PERMITIDO` e as demais recusas viram mensagem clara.
 * Sem atualização otimista (Artigo 5.8): a entrega só sai da revisão depois da resposta, e o valor
 * novo é o que o servidor devolve.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useCaixasDosDias } from '@/features/caixa'
import { ehErroApi, type EntregaResponse } from '@/shared/api'
import {
  formatarDataHora,
  formatarKm,
  formatarMoeda,
  paraLocalDateBackend,
  paraValorMonetarioBackend,
} from '@/shared/formatacao'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { EstadoCarregando, EstadoErro } from '@/shared/ui/estados'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useResolverRevisao } from '../api/hooks'
import { mensagemDoErro } from '../util'

type Decisao = 'MANTER' | 'AJUSTAR'

// Limites de ResolverRevisaoRequest.java: @PositiveOrZero @Digits(8, 2) e motivo @NotBlank até 100.
const motivoSchema = z
  .string()
  .trim()
  .min(1, 'O motivo é obrigatório.')
  .max(100, 'Use no máximo 100 caracteres.')
const valorSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}([.,]\d{1,2})?$/, 'Informe um valor válido, com até 2 casas decimais (ex.: 12,50).')

const MSG_CAIXA_FECHADO =
  'O caixa do dia desta entrega está fechado. A contestação não pode ser resolvida enquanto ele não for reaberto.'
const MSG_SEM_CAIXA = 'Não há caixa aberto para o dia desta entrega. Abra o caixa do dia antes de resolver.'
const MSG_EM_RECIBO =
  'Esta entrega está em um recibo. Para ajustar o valor, cancele o recibo antes; ou mantenha o valor.'

export function BotaoAnalisarContestacao({ entrega }: { entrega: EntregaResponse }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setAberto(true)}
        aria-label={`Analisar contestação: entrega de ${entrega.nomeCliente}`}
      >
        Analisar contestação
      </Button>
      {aberto && <DialogoAnalisarContestacao entrega={entrega} aoFechar={() => setAberto(false)} />}
    </>
  )
}

type SituacaoCaixa =
  | { tipo: 'CARREGANDO' }
  | { tipo: 'ERRO'; mensagem: string; tentarNovamente: () => void }
  | { tipo: 'SEM_CAIXA' }
  | { tipo: 'FECHADO' }
  | { tipo: 'ABERTO' }

/** Caixa do dia em que a entrega foi finalizada (ou de hoje), como a `PoliticaCorrecao`. */
function useSituacaoCaixa(entrega: EntregaResponse): SituacaoCaixa {
  const dia = entrega.finalizadaEm ? entrega.finalizadaEm.slice(0, 10) : paraLocalDateBackend(new Date())
  const caixas = useCaixasDosDias([dia], true)
  if (!caixas.data) {
    if (caixas.isError) {
      return { tipo: 'ERRO', mensagem: mensagemDoErro(caixas.error), tentarNovamente: () => void caixas.refetch() }
    }
    return { tipo: 'CARREGANDO' }
  }
  const caixa = caixas.data.find((c) => c.dataReferencia === dia)
  if (!caixa) return { tipo: 'SEM_CAIXA' }
  return caixa.status === 'FECHADO' ? { tipo: 'FECHADO' } : { tipo: 'ABERTO' }
}

/** A recusa do servidor em linguagem do operador. */
function mensagemDaRecusa(erro: unknown): string {
  if (!ehErroApi(erro)) return mensagemDoErro(erro)
  if (erro.codigo === 'CAIXA_FECHADO') return MSG_CAIXA_FECHADO
  if (erro.codigo === 'AJUSTE_VALOR_NAO_PERMITIDO') {
    const doServidor = erro.mensagemServidor ?? ''
    if (/recibo/i.test(doServidor)) return MSG_EM_RECIBO
    if (/caixa/i.test(doServidor)) return MSG_SEM_CAIXA
  }
  return mensagemDoErro(erro)
}

function DialogoAnalisarContestacao({
  entrega,
  aoFechar,
}: {
  entrega: EntregaResponse
  aoFechar: () => void
}) {
  const situacaoCaixa = useSituacaoCaixa(entrega)
  const emRecibo = entrega.reciboId != null
  const [decisao, setDecisao] = useState<Decisao>('MANTER')
  const [valorNovo, setValorNovo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erros, setErros] = useState<{ valorNovo?: string; motivo?: string }>({})
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const resolver = useResolverRevisao()
  const envioUnico = useEnvioUnico()
  const liberado = situacaoCaixa.tipo === 'ABERTO'

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!liberado) return
    setErroServidor(null)
    const novosErros: { valorNovo?: string; motivo?: string } = {}
    const motivoOk = motivoSchema.safeParse(motivo)
    if (!motivoOk.success) novosErros.motivo = motivoOk.error.issues[0]?.message
    let valor: number | undefined
    if (decisao === 'AJUSTAR') {
      const valorOk = valorSchema.safeParse(valorNovo)
      if (!valorOk.success) novosErros.valorNovo = valorOk.error.issues[0]?.message
      else {
        valor = paraValorMonetarioBackend(Number(valorOk.data.replace(',', '.')))
        if (entrega.valorRepasse != null && valor === entrega.valorRepasse) {
          novosErros.valorNovo = 'Informe um valor diferente do atual, ou escolha manter o valor.'
        }
      }
    }
    setErros(novosErros)
    if (!motivoOk.success || novosErros.valorNovo) return

    void envioUnico(async () => {
      try {
        const resolvida = await resolver.mutateAsync({
          id: entrega.id,
          corpo: valor === undefined ? { motivo: motivoOk.data } : { valorRepasse: valor, motivo: motivoOk.data },
        })
        toast.success(
          valor === undefined
            ? `Contestação de ${entrega.nomeCliente} resolvida: valor mantido.`
            : `Contestação de ${entrega.nomeCliente} resolvida: repasse ajustado para ${formatarMoeda(resolvida.valorRepasse)}.`,
        )
        aoFechar()
      } catch (erro) {
        if (ehErroApi(erro)) {
          const doCampo = (campo: string) => erro.campos.find((c) => c.campo === campo)?.mensagem
          const doValor = doCampo('valorRepasse')
          const doMotivo = doCampo('motivo')
          if (doValor || doMotivo) setErros({ valorNovo: doValor, motivo: doMotivo })
        }
        setErroServidor(mensagemDaRecusa(erro))
      }
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(abrir) => {
        if (!abrir && !resolver.isPending) aoFechar()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analisar contestação</DialogTitle>
          <DialogDescription>
            O entregador contestou o valor da entrega de <strong>{entrega.nomeCliente}</strong>
            {entrega.finalizadaEm ? ` (finalizada em ${formatarDataHora(entrega.finalizadaEm)})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="text-muted-foreground">Valor atual</dt>
            <dd className="font-medium" data-testid="valor-atual-contestacao">
              {formatarMoeda(entrega.valorRepasse)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Distância</dt>
            <dd>{formatarKm(entrega.distanciaKm)}</dd>
          </div>
        </dl>

        {situacaoCaixa.tipo === 'CARREGANDO' && <EstadoCarregando mensagem="Conferindo o caixa do dia da entrega…" />}
        {situacaoCaixa.tipo === 'ERRO' && (
          <EstadoErro
            mensagem={`Não foi possível conferir o caixa do dia; a análise fica bloqueada. ${situacaoCaixa.mensagem}`}
            aoTentarNovamente={situacaoCaixa.tentarNovamente}
          />
        )}
        {(situacaoCaixa.tipo === 'FECHADO' || situacaoCaixa.tipo === 'SEM_CAIXA') && (
          <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {situacaoCaixa.tipo === 'FECHADO' ? MSG_CAIXA_FECHADO : MSG_SEM_CAIXA}
          </p>
        )}

        <form onSubmit={enviar} noValidate aria-label="Analisar contestação" className="grid gap-4">
          {liberado && (
            <>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">Decisão</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="decisao"
                    value="MANTER"
                    checked={decisao === 'MANTER'}
                    onChange={() => setDecisao('MANTER')}
                  />
                  Manter o valor
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="decisao"
                    value="AJUSTAR"
                    checked={decisao === 'AJUSTAR'}
                    disabled={emRecibo}
                    onChange={() => setDecisao('AJUSTAR')}
                  />
                  Ajustar para um valor novo
                </label>
                {emRecibo && (
                  <p className="text-sm text-muted-foreground">
                    Esta entrega está no recibo #{entrega.reciboId?.slice(0, 8)}. Para ajustar o valor, cancele o
                    recibo primeiro.
                  </p>
                )}
              </fieldset>

              {decisao === 'AJUSTAR' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contestacao-valor">Novo valor (R$)</Label>
                  <Input
                    id="contestacao-valor"
                    inputMode="decimal"
                    placeholder="Ex.: 12,50"
                    value={valorNovo}
                    onChange={(e) => setValorNovo(e.target.value)}
                    aria-invalid={!!erros.valorNovo}
                    aria-describedby={erros.valorNovo ? 'contestacao-valor-erro' : undefined}
                  />
                  {erros.valorNovo && (
                    <p id="contestacao-valor-erro" className="text-sm text-destructive">
                      {erros.valorNovo}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contestacao-motivo">Motivo (obrigatório)</Label>
                <Input
                  id="contestacao-motivo"
                  value={motivo}
                  maxLength={100}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva a análise"
                  aria-invalid={!!erros.motivo}
                  aria-describedby={erros.motivo ? 'contestacao-motivo-erro' : undefined}
                />
                {erros.motivo && (
                  <p id="contestacao-motivo-erro" className="text-sm text-destructive">
                    {erros.motivo}
                  </p>
                )}
              </div>
            </>
          )}

          {erroServidor && (
            <p role="alert" className="text-sm text-destructive">
              {erroServidor}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar} disabled={resolver.isPending}>
              Voltar
            </Button>
            {liberado && (
              <Button type="submit" disabled={resolver.isPending}>
                {resolver.isPending ? 'Enviando…' : 'Confirmar análise'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
