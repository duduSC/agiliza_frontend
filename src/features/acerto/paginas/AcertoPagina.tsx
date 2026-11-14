/**
 * Pagina de acerto financeiro (UC03, HU06/HU07, T006).
 *
 * - Filtro por entregador e periodo.
 * - Tabela do extrato com totais do backend (Constituicao 5.1).
 * - Ajuste de repasse so sem recibo (Constituicao 5.2).
 * - Geracao de recibo com preview.
 * - Lista de recibos com acao "Marcar pago".
 * - Caixa fechado desabilita acoes (Constituicao 5.3).
 * - Estados carregando, vazio, erro (Constituicao 7.3).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSessaoStore } from '@/features/auth'
import { useCaixaAtual } from '@/features/caixa/api/hooks'
import { useExtrato, useRecibos, useMarcarReciboPago } from '../api/hooks'
import { FiltroAcerto, type FiltroAcertoValues } from '../componentes/FiltroAcerto'
import { TabelaExtrato } from '../componentes/TabelaExtrato'
import { TotaisExtrato } from '../componentes/TotaisExtrato'
import { TabelaRecibos } from '../componentes/TabelaRecibos'
import { DialogoAjusteRepasse } from '../componentes/DialogoAjusteRepasse'
import { DialogoGerarRecibo } from '../componentes/DialogoGerarRecibo'
import { EstadoCarregando, EstadoErro } from '@/shared/ui/estados'
import { Button } from '@/shared/ui/button'
import { ENDPOINTS, requisitar } from '@/shared/api'
import { z } from 'zod'
import { motoboyResponseSchema } from '@/shared/api/schemas/motoboy'
import { ehErroApi } from '@/shared/api/erros'

const listaMotoboysSchema = z.array(motoboyResponseSchema)

export function AcertoPagina() {
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)

  // Filtros
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAcertoValues | null>(null)

  // Dialogos
  const [entregaAjuste, setEntregaAjuste] = useState<{
    id: string
    valorRepasse: number | null | undefined
    reciboId: string | null | undefined
  } | null>(null)
  const [dialogoRecibo, setDialogoRecibo] = useState(false)

  // Caixa atual para verificar se esta fechado
  const { data: caixaAtual } = useCaixaAtual()
  const caixaFechado = caixaAtual?.status === 'FECHADO'

  // Lista de motoboys para o filtro
  const { data: motoboys } = useQuery({
    queryKey: ['motoboys', estabelecimentoId, 'todos'],
    queryFn: ({ signal }) =>
      requisitar({
        caminho: ENDPOINTS.motoboys.listar,
        schema: listaMotoboysSchema,
        signal,
      }),
    enabled: estabelecimentoId !== null,
  })

  // Extrato (so busca apos filtro ser aplicado)
  const motoboyId = filtroAtivo?.motoboyId ?? null
  const inicio = filtroAtivo ? `${filtroAtivo.inicio}T00:00:00` : null
  const fim = filtroAtivo ? `${filtroAtivo.fim}T23:59:59` : null
  const extratoQuery = useExtrato(motoboyId, inicio, fim)

  // Recibos do entregador selecionado
  const recibosQuery = useRecibos(motoboyId)

  // Marcar como pago
  const marcarPago = useMarcarReciboPago()

  function handleMarcarPago(reciboId: string) {
    marcarPago.mutate(reciboId)
  }

  function handleSelecionarEntrega(entregaId: string) {
    const linha = extratoQuery.data?.linhas.find((l) => l.entregaId === entregaId)
    if (linha) {
      setEntregaAjuste({
        id: entregaId,
        valorRepasse: linha.valorRepasse,
        reciboId: linha.reciboId,
      })
    }
  }

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">Acerto</h1>
          <p className="text-sm text-muted-foreground">
            Extrato por entregador, ajustes, recibos e pagamentos.
          </p>
        </div>
        {caixaFechado && (
          <div
            role="status"
            className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm text-yellow-900"
          >
            Caixa fechado — periodo imutavel
          </div>
        )}
      </header>

      {/* Filtro */}
      <FiltroAcerto
        motoboys={motoboys ?? []}
        aoFiltrar={setFiltroAtivo}
        carregando={extratoQuery.isFetching}
      />

      {/* Extrato */}
      {!filtroAtivo && (
        <p className="text-sm text-muted-foreground">
          Selecione um entregador e periodo para ver o extrato.
        </p>
      )}

      {filtroAtivo && extratoQuery.isLoading && <EstadoCarregando mensagem="Carregando extrato..." />}

      {filtroAtivo && extratoQuery.isError && (
        <EstadoErro
          mensagem={
            ehErroApi(extratoQuery.error) ? extratoQuery.error.mensagem : 'Erro ao carregar extrato.'
          }
          aoTentarNovamente={() => void extratoQuery.refetch()}
        />
      )}

      {filtroAtivo && extratoQuery.data && (
        <>
          <TotaisExtrato extrato={extratoQuery.data} />
          <TabelaExtrato
            linhas={extratoQuery.data.linhas}
            aoSelecionarEntrega={caixaFechado ? undefined : handleSelecionarEntrega}
          />

          {/* Acoes do acerto */}
          {!caixaFechado && (
            <div className="flex gap-2">
              <Button onClick={() => setDialogoRecibo(true)}>
                Gerar recibo
              </Button>
            </div>
          )}
          {caixaFechado && (
            <p className="text-sm text-muted-foreground">
              Acoes desabilitadas: o caixa esta fechado.
            </p>
          )}
        </>
      )}

      {/* Recibos */}
      {filtroAtivo && motoboyId && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recibos</h2>
          {recibosQuery.isLoading && <EstadoCarregando mensagem="Carregando recibos..." />}
          {recibosQuery.isError && (
            <EstadoErro
              mensagem="Erro ao carregar recibos."
              aoTentarNovamente={() => void recibosQuery.refetch()}
            />
          )}
          {recibosQuery.data && (
            <TabelaRecibos
              recibos={recibosQuery.data}
              aoMarcarPago={handleMarcarPago}
              marcandoPago={marcarPago.isPending}
              caixaFechado={caixaFechado}
            />
          )}
        </div>
      )}

      {/* Dialogos */}
      {entregaAjuste && (
        <DialogoAjusteRepasse
          entregaId={entregaAjuste.id}
          valorAtual={entregaAjuste.valorRepasse}
          reciboId={entregaAjuste.reciboId ?? null}
          aberto={true}
          aoFechar={() => setEntregaAjuste(null)}
        />
      )}

      {dialogoRecibo && filtroAtivo && (
        <DialogoGerarRecibo
          extrato={extratoQuery.data ?? null}
          motoboyId={filtroAtivo.motoboyId}
          periodoInicio={inicio!}
          periodoFim={fim!}
          aberto={true}
          aoFechar={() => setDialogoRecibo(false)}
        />
      )}
    </section>
  )
}
