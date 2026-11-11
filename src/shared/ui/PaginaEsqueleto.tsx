/**
 * Página-esqueleto (T002): título + área de conteúdo com os estados carregando/vazio/erro.
 * Sem lógica de negócio — o conteúdo real de cada tela chega da F2 em diante.
 */
import type { ReactNode } from 'react'
import { ConteudoPorEstado, type EstadoTela } from './estados'

type Props = {
  titulo: string
  descricao?: string
  /** Ações do cabeçalho da página (ainda sem efeito na T002). */
  acoes?: ReactNode
  /** Padrão: vazio ("em construção"), já que ainda não há dados. */
  estado?: EstadoTela
}

const ESTADO_PADRAO: EstadoTela = {
  tipo: 'vazio',
  titulo: 'Nada por aqui ainda',
  descricao: 'Esta tela está em construção.',
}

export function PaginaEsqueleto({ titulo, descricao, acoes, estado = ESTADO_PADRAO }: Props) {
  return (
    <section aria-labelledby="titulo-pagina" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-pagina" className="text-xl font-semibold">
            {titulo}
          </h1>
          {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </header>
      <ConteudoPorEstado estado={estado} />
    </section>
  )
}
