/**
 * Relatório do dia (T010; D013, decisão 5: resumo simples, decisão de escopo do Eduardo).
 *
 * - `GET /api/relatorios/dia?data=` (PROVISÓRIO, contrato da D013).
 * - Nenhuma soma no cliente (Constituição 5.1): cartões e tabela mostram o que o servidor mandou;
 *   `null` aparece como "—".
 * - Estados carregando, vazio, erro e sucesso (7.3). A data escolhida sobrevive à troca de aba.
 */
import { useState } from 'react'
import { ehErroApi, type RelatorioDoDiaResponse } from '@/shared/api'
import { formatarData, paraLocalDateBackend } from '@/shared/formatacao'
import { AvisoDesatualizado } from '@/shared/ui/AvisoDesatualizado'
import { Button } from '@/shared/ui/button'
import { ConteudoPorEstado, EstadoCarregando, type EstadoTela } from '@/shared/ui/estados'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useRelatorioDoDia } from '../api/hooks'
import { CartoesRelatorio } from '../componentes/CartoesRelatorio'
import { TabelaPorEntregador } from '../componentes/TabelaPorEntregador'
import { useFiltroRelatorioStore } from '../filtroStore'

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/

function mensagem(erro: unknown): string {
  return ehErroApi(erro) ? erro.mensagem : 'Não foi possível carregar o relatório.'
}

/** Algum valor monetário ainda indefinido. Só confere `null`: nada é somado aqui. */
function temValorIndefinido(r: RelatorioDoDiaResponse): boolean {
  const nulo = (v: number | null | undefined) => v == null
  return (
    nulo(r.valorTotalRepasse) ||
    nulo(r.valorPago) ||
    nulo(r.valorAPagar) ||
    r.porEntregador.some((l) => nulo(l.valorRepasse) || nulo(l.valorPago) || nulo(l.valorAPagar))
  )
}

export function RelatorioPagina() {
  const escolhida = useFiltroRelatorioStore((s) => s.data)
  const escolher = useFiltroRelatorioStore((s) => s.escolher)
  const [hoje] = useState(() => paraLocalDateBackend(new Date()))
  const data = escolhida ?? hoje
  const consulta = useRelatorioDoDia(data)

  let estado: EstadoTela
  if (consulta.isPending) estado = { tipo: 'carregando' }
  else if (consulta.data === undefined)
    estado = { tipo: 'erro', mensagem: mensagem(consulta.error), aoTentarNovamente: () => void consulta.refetch() }
  else if (consulta.data.totalEntregas === 0 && consulta.data.porEntregador.length === 0)
    estado = {
      tipo: 'vazio',
      titulo: `Nenhuma entrega finalizada em ${formatarData(data)}`,
      descricao: 'Escolha outro dia no filtro acima.',
    }
  else estado = { tipo: 'sucesso', conteudo: <ConteudoRelatorio relatorio={consulta.data} /> }

  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 id="titulo-pagina" className="text-xl font-semibold">
          Relatório do dia
        </h1>
        <p className="text-sm text-muted-foreground">
          Entregas finalizadas no dia, entregadores que trabalharam e repasse pago e a pagar.
        </p>
      </header>

      <FiltroData key={data} data={data} aoEscolher={escolher} carregando={consulta.isFetching} />

      <AvisoDesatualizado consulta={consulta} />
      {estado.tipo === 'carregando' ? (
        <EstadoCarregando mensagem="Carregando o relatório…" />
      ) : (
        <ConteudoPorEstado estado={estado} />
      )}
    </section>
  )
}

function ConteudoRelatorio({ relatorio }: { relatorio: RelatorioDoDiaResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Dia {formatarData(relatorio.data)}</p>
      <CartoesRelatorio relatorio={relatorio} />
      {temValorIndefinido(relatorio) && (
        <p role="status" className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Há repasse com valor ainda indefinido. Os campos com &quot;—&quot; dependem dele e não foram contados
          como zero.
        </p>
      )}
      <section aria-labelledby="titulo-por-entregador" className="flex flex-col gap-2">
        <h2 id="titulo-por-entregador" className="text-lg font-semibold">
          Por entregador
        </h2>
        {relatorio.porEntregador.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum entregador com entrega finalizada neste dia.</p>
        ) : (
          <TabelaPorEntregador linhas={relatorio.porEntregador} />
        )}
      </section>
    </div>
  )
}

function FiltroData({
  data,
  aoEscolher,
  carregando,
}: {
  data: string
  aoEscolher: (data: string) => void
  carregando: boolean
}) {
  const [valor, setValor] = useState(data)
  const [erro, setErro] = useState<string | null>(null)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!REGEX_DATA.test(valor)) {
      setErro('Informe a data.')
      return
    }
    setErro(null)
    aoEscolher(valor)
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Filtro do relatório" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relatorio-data">Data</Label>
        <Input
          id="relatorio-data"
          type="date"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-44"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'relatorio-data-erro' : undefined}
        />
      </div>
      <Button type="submit" disabled={carregando}>
        {carregando ? 'Carregando…' : 'Ver relatório'}
      </Button>
      {erro && (
        <p id="relatorio-data-erro" role="alert" className="basis-full text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  )
}
