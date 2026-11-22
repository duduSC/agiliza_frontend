/**
 * Pagina do caixa (UC03 A3, T006).
 *
 * - Mostra caixa do dia e status.
 * - Abrir caixa (se nao existe).
 * - Fechar caixa (confirmacao forte — torna periodo imutavel, Constituicao 5.3).
 * - Historico de caixas anteriores.
 * - Reabrir caixa so para ADMIN_RESTAURANTE (fora do escopo D007, mas botao visivel e desabilitado).
 * - Estados carregando, vazio, erro (Constituicao 7.3).
 * - Sem atualizacao otimista (Constituicao 5.8).
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { useSessaoStore } from '@/features/auth'
import { podeReabrirCaixa } from '@/shared/dominio'
import { LABEL_STATUS_CAIXA } from '@/shared/dominio'
import { formatarData, formatarDataHora, formatarMoeda } from '@/shared/formatacao'
import { paraLocalDateBackend } from '@/shared/formatacao/dataHora'
import { useCaixaAtual, useHistoricoCaixas, useAbrirCaixa, useFecharCaixa } from '../api/hooks'
import { HistoricoCaixas } from '../componentes/HistoricoCaixas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EstadoCarregando, EstadoErro } from '@/shared/ui/estados'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ehErroApi } from '@/shared/api/erros'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'

const PALAVRA_DE_CONFIRMACAO = 'FECHAR'

export function CaixaPagina() {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  const mostrarReabrir = perfil !== undefined && podeReabrirCaixa(perfil)

  const [dialogoFechar, setDialogoFechar] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  const caixaQuery = useCaixaAtual()
  const historicoQuery = useHistoricoCaixas()
  const abrirCaixaMutation = useAbrirCaixa()
  const fecharCaixaMutation = useFecharCaixa()

  const caixa = caixaQuery.data

  const [confirmacao, setConfirmacao] = useState('')
  const [erroFechar, setErroFechar] = useState<string | null>(null)
  const abrirUmaVez = useEnvioUnico()
  const fecharUmaVez = useEnvioUnico()

  const caixaAberto = caixa?.status === 'ABERTO' || caixa?.status === 'REABERTO'
  const podeConfirmar =
    caixaAberto &&
    !fecharCaixaMutation.isPending &&
    confirmacao.trim().toUpperCase() === PALAVRA_DE_CONFIRMACAO

  function handleAbrirCaixa() {
    void abrirUmaVez(async () => {
      setErroLocal(null)
      try {
        await abrirCaixaMutation.mutateAsync({ dataReferencia: paraLocalDateBackend(new Date()) })
        toast.success('Caixa aberto com sucesso.')
      } catch (erro) {
        setErroLocal(ehErroApi(erro) ? erro.mensagem : 'Não foi possível abrir o caixa.')
      }
    })
  }

  function mudarDialogo(aberto: boolean) {
    if (fecharCaixaMutation.isPending) return
    setDialogoFechar(aberto)
    setConfirmacao('')
    setErroFechar(null)
  }

  function handleFecharCaixa() {
    if (!caixa) return
    void fecharUmaVez(async () => {
      setErroFechar(null)
      try {
        await fecharCaixaMutation.mutateAsync(caixa.id)
        toast.success('Caixa fechado com sucesso.')
        setDialogoFechar(false)
        setConfirmacao('')
      } catch (erro) {
        setErroFechar(ehErroApi(erro) ? erro.mensagem : 'Não foi possível fechar o caixa.')
      }
    })
  }

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Caixa do dia: abertura, fechamento e histórico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mostrarReabrir && (
            <Button variant="outline" disabled title="Reabertura disponível em uma próxima versão">
              Reabrir caixa
            </Button>
          )}
        </div>
      </header>

      {/* Caixa do dia */}
      {caixaQuery.isLoading && <EstadoCarregando mensagem="Carregando caixa do dia…" />}

      {caixaQuery.isError && caixa === undefined && (
        <EstadoErro
          mensagem={
            ehErroApi(caixaQuery.error) ? caixaQuery.error.mensagem : 'Não foi possível carregar o caixa.'
          }
          aoTentarNovamente={() => void caixaQuery.refetch()}
        />
      )}

      {caixa === null && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="mb-3 text-muted-foreground">
            Nenhum caixa aberto para hoje.
          </p>
          <Button
            onClick={handleAbrirCaixa}
            disabled={abrirCaixaMutation.isPending}
          >
            {abrirCaixaMutation.isPending ? 'Abrindo…' : 'Abrir caixa do dia'}
          </Button>
        </div>
      )}

      <AvisoDesatualizado consulta={caixaQuery} />
      {caixa && (
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">Caixa do dia</h2>
            <Badge variant={caixa.status === 'FECHADO' ? 'secondary' : 'outline'}>
              {LABEL_STATUS_CAIXA[caixa.status]}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium">{formatarData(caixa.dataReferencia)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Aberto em</dt>
              <dd className="font-medium">{formatarDataHora(caixa.abertoEm)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fechado em</dt>
              <dd className="font-medium">{formatarDataHora(caixa.fechadoEm)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium">{formatarMoeda(caixa.valorTotal)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recibos</dt>
              <dd className="font-medium">{caixa.qtdRecibos ?? '—'}</dd>
            </div>
          </dl>

          {(caixa.status === 'ABERTO' || caixa.status === 'REABERTO') && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="destructive"
                onClick={() => mudarDialogo(true)}
              >
                Fechar caixa
              </Button>
            </div>
          )}

          {caixa.status === 'FECHADO' && (
            <p role="status" className="mt-4 text-sm text-yellow-700">
              Caixa fechado — período imutável. Ajustes, pagamentos e geração de recibos estão desabilitados.
            </p>
          )}
        </div>
      )}

      {erroLocal && (
        <p role="alert" className="text-sm text-red-600">{erroLocal}</p>
      )}

      {/* Historico */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {historicoQuery.isLoading && <EstadoCarregando mensagem="Carregando histórico…" />}
        <AvisoDesatualizado consulta={historicoQuery} />
        {historicoQuery.isError && !historicoQuery.data && (
          <EstadoErro
            mensagem={
              ehErroApi(historicoQuery.error)
                ? historicoQuery.error.mensagem
                : 'Não foi possível carregar o histórico.'
            }
            aoTentarNovamente={() => void historicoQuery.refetch()}
          />
        )}
        {historicoQuery.data && <HistoricoCaixas caixas={historicoQuery.data} />}
      </div>

      {/* Dialogo de confirmacao para fechar caixa */}
      <Dialog open={dialogoFechar} onOpenChange={mudarDialogo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Fechar o caixa{caixa ? ` de ${formatarData(caixa.dataReferencia)}` : ''} torna o período
              imutável. Não será possível ajustar repasses nem gerar recibos para o dia, e recibos
              ainda não pagos não poderão mais ser marcados como pagos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="confirmar-fechamento">Para confirmar, digite {PALAVRA_DE_CONFIRMACAO}</Label>
            <Input
              id="confirmar-fechamento"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
              disabled={fecharCaixaMutation.isPending}
            />
          </div>
          {erroFechar && (
            <p role="alert" className="text-sm text-red-700">
              {erroFechar}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => mudarDialogo(false)}
              disabled={fecharCaixaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleFecharCaixa}
              disabled={!podeConfirmar}
            >
              {fecharCaixaMutation.isPending ? 'Fechando…' : 'Confirmar fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
