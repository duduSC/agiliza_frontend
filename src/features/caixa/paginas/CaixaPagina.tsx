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

  function handleAbrirCaixa() {
    setErroLocal(null)
    const dataReferencia = paraLocalDateBackend(new Date())
    abrirCaixaMutation.mutate(
      { dataReferencia },
      {
        onError: (erro) => {
          if (ehErroApi(erro)) {
            setErroLocal(erro.mensagem)
          } else {
            setErroLocal('Erro ao abrir caixa.')
          }
        },
      },
    )
  }

  function handleFecharCaixa() {
    if (!caixa) return
    setErroLocal(null)
    fecharCaixaMutation.mutate(caixa.id, {
      onSuccess: () => setDialogoFechar(false),
      onError: (erro) => {
        if (ehErroApi(erro)) {
          setErroLocal(erro.mensagem)
        } else {
          setErroLocal('Erro ao fechar caixa.')
        }
      },
    })
  }

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Caixa do dia: abertura, fechamento e historico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mostrarReabrir && (
            <Button variant="outline" disabled title="Disponivel numa proxima versao (D007)">
              Reabrir caixa
            </Button>
          )}
        </div>
      </header>

      {/* Caixa do dia */}
      {caixaQuery.isLoading && <EstadoCarregando mensagem="Carregando caixa do dia..." />}

      {caixaQuery.isError && (
        <EstadoErro
          mensagem={
            ehErroApi(caixaQuery.error) ? caixaQuery.error.mensagem : 'Erro ao carregar caixa.'
          }
          aoTentarNovamente={() => void caixaQuery.refetch()}
        />
      )}

      {!caixaQuery.isLoading && !caixaQuery.isError && !caixa && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="mb-3 text-muted-foreground">
            Nenhum caixa aberto para hoje.
          </p>
          <Button
            onClick={handleAbrirCaixa}
            disabled={abrirCaixaMutation.isPending}
          >
            {abrirCaixaMutation.isPending ? 'Abrindo...' : 'Abrir caixa do dia'}
          </Button>
        </div>
      )}

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
                onClick={() => setDialogoFechar(true)}
              >
                Fechar caixa
              </Button>
            </div>
          )}

          {caixa.status === 'FECHADO' && (
            <p role="status" className="mt-4 text-sm text-yellow-700">
              Caixa fechado — periodo imutavel. Ajustes e geracao de recibos estao desabilitados.
            </p>
          )}
        </div>
      )}

      {erroLocal && (
        <p role="alert" className="text-sm text-red-600">{erroLocal}</p>
      )}

      {/* Historico */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historico</h2>
        {historicoQuery.isLoading && <EstadoCarregando mensagem="Carregando historico..." />}
        {historicoQuery.isError && (
          <EstadoErro
            mensagem="Erro ao carregar historico."
            aoTentarNovamente={() => void historicoQuery.refetch()}
          />
        )}
        {historicoQuery.data && <HistoricoCaixas caixas={historicoQuery.data} />}
      </div>

      {/* Dialogo de confirmacao para fechar caixa */}
      <Dialog open={dialogoFechar} onOpenChange={setDialogoFechar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Esta acao torna o periodo imutavel. Nao sera possivel ajustar repasses nem gerar novos recibos para o dia. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogoFechar(false)}
              disabled={fecharCaixaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleFecharCaixa}
              disabled={fecharCaixaMutation.isPending}
            >
              {fecharCaixaMutation.isPending ? 'Fechando...' : 'Confirmar fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
