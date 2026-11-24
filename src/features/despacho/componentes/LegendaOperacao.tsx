/**
 * Legenda do mapa da operação (T010). Cada item tem forma e texto, não só cor (Constituição 7.6),
 * e o mesmo desenho do marcador (`shared/ui/mapa/iconesOperacao.ts`).
 */
import type { ReactNode } from 'react'
import { House, Motorbike } from 'lucide-react'
import { cn } from '@/shared/ui/lib/utils'
import { CAMINHO_PINO, ESTILO_NUMERO_PEDIDO } from '@/shared/ui/mapa/iconesOperacao'

/** O pino em gota do mapa: verde com casa (loja) ou âmbar com ponto (revisão arrastável). */
function Pino({ classe, children }: { classe: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 36 47" className={cn('h-5 w-auto', classe)} aria-hidden="true" focusable="false">
      <path d={CAMINHO_PINO} fill="currentColor" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
      {children}
    </svg>
  )
}

function Circulo({ classe, children }: { classe: string; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-full border-2 text-[10px] font-bold',
        classe,
      )}
    >
      {children}
    </span>
  )
}

const ITENS: readonly { id: string; marca: ReactNode; rotulo: string }[] = [
  {
    id: 'loja',
    marca: (
      <Pino classe="text-emerald-600">
        <House x={9} y={9} width={18} height={18} color="#fff" strokeWidth={2.6} />
      </Pino>
    ),
    rotulo: 'Loja',
  },
  {
    id: 'aguardando',
    marca: <Circulo classe={ESTILO_NUMERO_PEDIDO.aguardando}>1</Circulo>,
    rotulo: 'Aguardando despacho (o número é o do card)',
  },
  {
    id: 'selecionado',
    marca: <Circulo classe={ESTILO_NUMERO_PEDIDO.selecionado}>2</Circulo>,
    rotulo: 'Selecionado para o lote',
  },
  {
    id: 'saida',
    marca: <Circulo classe={ESTILO_NUMERO_PEDIDO.emSaida}>3</Circulo>,
    rotulo: 'Saiu para entrega (borda tracejada)',
  },
  {
    id: 'online',
    marca: (
      <Circulo classe="border-slate-400 bg-white text-slate-800">
        <Motorbike className="size-3" />
      </Circulo>
    ),
    rotulo: 'Entregador online',
  },
  {
    id: 'em-rota',
    marca: (
      <Circulo classe="border-sky-600 bg-white text-slate-800">
        <Motorbike className="size-3" />
      </Circulo>
    ),
    rotulo: 'Entregador em rota',
  },
  {
    id: 'sem-sinal',
    marca: (
      <Circulo classe="border-dashed border-amber-500 bg-white text-slate-800">
        <Motorbike className="size-3" />
      </Circulo>
    ),
    rotulo: 'Entregador sem sinal há mais de 3 min',
  },
  {
    id: 'revisao',
    marca: (
      <Pino classe="text-amber-500">
        <circle cx={18} cy={18} r={6} fill="#fff" />
      </Pino>
    ),
    rotulo: 'Em revisão: arraste o pino para corrigir',
  },
]

export function LegendaOperacao() {
  return (
    <ul aria-label="Legenda do mapa" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
      {ITENS.map((i) => (
        <li key={i.id} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-flex">
            {i.marca}
          </span>
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}
