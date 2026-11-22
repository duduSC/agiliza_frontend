/**
 * Legenda do mapa de monitoramento (T005, Constituicao 7.6).
 * Cor NAO e o unico indicador: cada item tem texto descritivo.
 */

type ItemLegenda = {
  cor: string
  rotulo: string
  descricao: string
}

const itens: ItemLegenda[] = [
  { cor: 'bg-red-500', rotulo: 'Loja', descricao: 'Posição do estabelecimento' },
  {
    cor: 'bg-blue-500',
    rotulo: 'Online',
    descricao: 'Entregador disponível, sem entrega em andamento',
  },
  {
    cor: 'bg-emerald-500',
    rotulo: 'Em rota',
    descricao: 'Entregador realizando entregas',
  },
  {
    cor: 'bg-amber-500',
    rotulo: 'Posição desatualizada',
    descricao: 'Sem transmitir há mais de 3 minutos',
  },
]

export function LegendaFrota() {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border px-3 py-2 text-sm" role="region" aria-label="Legenda do mapa">
      {itens.map((item) => (
        <div key={item.rotulo} className="flex items-center gap-2" title={item.descricao}>
          <span
            className={`inline-block size-3 rounded-full ${item.cor}`}
            aria-hidden="true"
          />
          <span>{item.rotulo}</span>
          <span className="sr-only"> — {item.descricao}</span>
        </div>
      ))}
    </div>
  )
}
