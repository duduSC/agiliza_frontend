/**
 * Pagina de acerto financeiro (UC03, HU06/HU07, T006; regras revistas na T009).
 *
 * - Filtro por entregador e periodo.
 * - Tabela do extrato com totais do backend (Constituicao 5.1).
 * - Ajuste, recibo e pagamento conforme o caixa do dia certo (5.2, 5.3; ver `../regras.ts`).
 * - Escritas sem otimismo e travadas contra duplo clique (5.8).
 * - Estados carregando, vazio, erro (Constituicao 7.3).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { useSessaoStore } from '@/features/auth'
import { useCaixaAtual, useCaixasDosDias } from '@/features/caixa'
import { ENDPOINTS, ehErroApi, requisitar } from '@/shared/api'
import { motoboyResponseSchema } from '@/shared/api/schemas'
import { formatarData, formatarMoeda } from '@/shared/formatacao'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Button } from '@/shared/ui/button'
import { EstadoCarregando, EstadoErro } from '@/shared/ui/estados'
import { useEnvioUnico } from '@/shared/ui/useEnvioUnico'
import { useExtrato, useMarcarReciboPago, useRecibos } from '../api/hooks'
import { DialogoAjusteRepasse } from '../componentes/DialogoAjusteRepasse'
import { DialogoGerarRecibo } from '../componentes/DialogoGerarRecibo'
import { FiltroAcerto, type FiltroAcertoValues } from '../componentes/FiltroAcerto'
import { TabelaExtrato } from '../componentes/TabelaExtrato'
import { TabelaRecibos } from '../componentes/TabelaRecibos'
import { TotaisExtrato } from '../componentes/TotaisExtrato'
import { useFiltroAcertoStore } from '../filtroStore'
import { caixaDaEntrega, caixaDoDia, caixaDoRecibo, diaDe, diaFechadoNoRecibo } from '../regras'

const listaMotoboysSchema = z.array(motoboyResponseSchema)

function mensagem(erro: unknown): string {
  return ehErroApi(erro) ? erro.mensagem : 'Não foi possível concluir a operação.'
}

export function AcertoPagina() {
  const estabelecimentoId = useSessaoStore((s) => s.estabelecimentoId)

  // Filtro aplicado: guardado entre abas, so em memoria (T010; `../filtroStore`).
  const filtroAtivo = useFiltroAcertoStore((s) => s.filtro)
  const setFiltroAtivo = useFiltroAcertoStore((s) => s.aplicar)

  // Dialogos: guardam so o id; valor e recibo saem sempre do extrato atual.
  const [entregaAjusteId, setEntregaAjusteId] = useState<string | null>(null)
  const [dialogoRecibo, setDialogoRecibo] = useState(false)

  // Lista de motoboys para o filtro
  const motoboysQuery = useQuery({
    queryKey: ['motoboys', estabelecimentoId, 'todos'],
    queryFn: ({ signal }) =>
      requisitar({ caminho: ENDPOINTS.motoboys.listar, schema: listaMotoboysSchema, signal }),
    enabled: estabelecimentoId !== null,
  })

  // Extrato (so busca apos filtro ser aplicado). O fim vai ate o ultimo microssegundo do dia.
  const motoboyId = filtroAtivo?.motoboyId ?? null
  const inicio = filtroAtivo ? `${filtroAtivo.inicio}T00:00:00` : null
  const fim = filtroAtivo ? `${filtroAtivo.fim}T23:59:59.999999` : null
  const extratoQuery = useExtrato(motoboyId, inicio, fim)
  const recibosQuery = useRecibos(motoboyId)
  const extrato = extratoQuery.data

  // Caixa de hoje: so o aviso de antes do filtro. Depois vale o caixa de cada dia envolvido.
  const { data: caixaAtual } = useCaixaAtual()
  const dias = filtroAtivo
    ? [
        filtroAtivo.inicio,
        ...(extrato?.linhas ?? []).flatMap((l) => (l.finalizadaEm ? [diaDe(l.finalizadaEm)] : [])),
        ...(recibosQuery.data ?? []).map((r) => r.dataReferencia),
      ]
    : []
  const caixasQuery = useCaixasDosDias(dias, !extratoQuery.isPending && !recibosQuery.isPending)
  const caixas = caixasQuery.data
  const caixaDoInicio = filtroAtivo ? caixaDoDia(caixas, filtroAtivo.inicio) : 'DESCONHECIDA'
  const diaFechado = extrato ? diaFechadoNoRecibo(caixas, extrato.linhas) : null
  const podeGerar = caixaDoInicio === 'ABERTO' && diaFechado === null

  const marcarPago = useMarcarReciboPago()
  const pagarUmaVez = useEnvioUnico()

  function handleMarcarPago(reciboId: string) {
    void pagarUmaVez(async () => {
      try {
        const recibo = await marcarPago.mutateAsync(reciboId)
        toast.success(`Recibo marcado como pago: ${formatarMoeda(recibo.valorTotal)}.`)
      } catch (erro) {
        toast.error(mensagem(erro))
      }
    })
  }

  function filtrar(novo: FiltroAcertoValues) {
    setFiltroAtivo(novo)
    const repetido =
      filtroAtivo?.motoboyId === novo.motoboyId &&
      filtroAtivo.inicio === novo.inicio &&
      filtroAtivo.fim === novo.fim
    // Mesma chave nao refaz a consulta sozinha, e esta tela nao tem tempo real.
    if (repetido) {
      void extratoQuery.refetch()
      void recibosQuery.refetch()
      void caixasQuery.refetch()
    }
  }

  function abrirGerarRecibo() {
    setDialogoRecibo(true)
    // A previa nao pode ser a do cache: o servidor calcula o recibo na hora.
    void extratoQuery.refetch()
  }

  const linhaAjuste = extrato?.linhas.find((l) => l.entregaId === entregaAjusteId)

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">Acerto</h1>
          <p className="text-sm text-muted-foreground">
            Extrato por entregador, ajustes, recibos e pagamentos.
          </p>
        </div>
        {!filtroAtivo && caixaAtual?.status === 'FECHADO' && (
          <Aviso>Caixa fechado hoje — período imutável</Aviso>
        )}
      </header>

      {/* Filtro */}
      {motoboysQuery.isPending && <EstadoCarregando mensagem="Carregando entregadores…" />}
      {motoboysQuery.isError && !motoboysQuery.data && (
        <EstadoErro
          mensagem={mensagem(motoboysQuery.error)}
          aoTentarNovamente={() => void motoboysQuery.refetch()}
        />
      )}
      {motoboysQuery.data?.length === 0 && <Aviso>Nenhum entregador cadastrado nesta loja.</Aviso>}
      <FiltroAcerto
        motoboys={motoboysQuery.data ?? []}
        aoFiltrar={filtrar}
        carregando={extratoQuery.isFetching}
        inicial={filtroAtivo}
      />

      {/* Extrato */}
      {!filtroAtivo && (
        <p className="text-sm text-muted-foreground">
          Selecione um entregador e período para ver o extrato.
        </p>
      )}

      {filtroAtivo && extratoQuery.isLoading && <EstadoCarregando mensagem="Carregando extrato…" />}

      {filtroAtivo && extratoQuery.isError && !extrato && (
        <EstadoErro
          mensagem={mensagem(extratoQuery.error)}
          aoTentarNovamente={() => void extratoQuery.refetch()}
        />
      )}

      {filtroAtivo && extrato && (
        <>
          <AvisoDesatualizado consulta={extratoQuery} />

          {caixasQuery.isLoading && <EstadoCarregando mensagem="Conferindo o caixa do período…" />}
          {caixasQuery.isError && !caixas && (
            <EstadoErro
              mensagem={`Não foi possível conferir o caixa; as ações ficam bloqueadas. ${mensagem(caixasQuery.error)}`}
              aoTentarNovamente={() => void caixasQuery.refetch()}
            />
          )}
          {caixaDoInicio === 'SEM_CAIXA' && (
            <Aviso>
              Não há caixa aberto em {formatarData(filtroAtivo.inicio)}. Sem caixa nesse dia, não é
              possível gerar recibo deste período.
            </Aviso>
          )}
          {caixaDoInicio === 'FECHADO' && (
            <Aviso>
              Caixa de {formatarData(filtroAtivo.inicio)} fechado: período imutável, somente leitura.
            </Aviso>
          )}
          {caixaDoInicio === 'ABERTO' && diaFechado && (
            <Aviso>
              O período inclui entregas de {formatarData(diaFechado)}, cujo caixa está fechado.
              Encurte o período ou peça a reabertura do caixa desse dia para gerar o recibo.
            </Aviso>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <TotaisExtrato extrato={extrato} />
            {podeGerar && <Button onClick={abrirGerarRecibo}>Gerar recibo</Button>}
          </div>

          <TabelaExtrato
            linhas={extrato.linhas}
            aoSelecionarEntrega={setEntregaAjusteId}
            caixaDaLinha={(linha) => caixaDaEntrega(caixas, linha)}
          />
        </>
      )}

      {/* Recibos */}
      {filtroAtivo && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recibos</h2>
          {recibosQuery.isLoading && <EstadoCarregando mensagem="Carregando recibos…" />}
          {recibosQuery.isError && !recibosQuery.data && (
            <EstadoErro
              mensagem={mensagem(recibosQuery.error)}
              aoTentarNovamente={() => void recibosQuery.refetch()}
            />
          )}
          <AvisoDesatualizado consulta={recibosQuery} />
          {recibosQuery.data && (
            <TabelaRecibos
              recibos={recibosQuery.data}
              aoMarcarPago={handleMarcarPago}
              pagandoId={marcarPago.isPending ? marcarPago.variables : null}
              caixaDe={(recibo) => caixaDoRecibo(caixas, recibo)}
            />
          )}
        </div>
      )}

      {/* Dialogos */}
      {linhaAjuste && (
        <DialogoAjusteRepasse
          key={linhaAjuste.entregaId}
          entregaId={linhaAjuste.entregaId}
          valorAtual={linhaAjuste.valorRepasse}
          reciboId={linhaAjuste.reciboId ?? null}
          aberto={true}
          aoFechar={() => setEntregaAjusteId(null)}
        />
      )}

      {dialogoRecibo && filtroAtivo && inicio && fim && (
        <DialogoGerarRecibo
          extrato={extrato ?? null}
          atualizando={extratoQuery.isFetching}
          erroAoAtualizar={extratoQuery.isError ? mensagem(extratoQuery.error) : null}
          motoboyId={filtroAtivo.motoboyId}
          periodoInicio={inicio}
          periodoFim={fim}
          aberto={true}
          aoFechar={() => setDialogoRecibo(false)}
        />
      )}
    </section>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
      {children}
    </p>
  )
}
