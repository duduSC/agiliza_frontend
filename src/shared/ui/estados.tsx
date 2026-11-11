/**
 * Estados genéricos de tela: carregando, vazio e erro (Constituição, Artigo 7.3; skill ui-states).
 * Cada estado tem texto, não só cor/ícone (Artigo 7.6).
 */
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Button } from './button'

export function EstadoCarregando({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 p-6 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{mensagem}</span>
    </div>
  )
}

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
    </div>
  )
}

export function EstadoErro({
  mensagem,
  aoTentarNovamente,
}: {
  mensagem: string
  aoTentarNovamente?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4" aria-hidden="true" />
        Erro: {mensagem}
      </p>
      {aoTentarNovamente && (
        <Button variant="outline" size="sm" onClick={aoTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'vazio'; titulo: string; descricao?: ReactNode }
  | { tipo: 'erro'; mensagem: string; aoTentarNovamente?: () => void }
  | { tipo: 'sucesso'; conteudo: ReactNode }

/** Renderiza exatamente um dos quatro estados. */
export function ConteudoPorEstado({ estado }: { estado: EstadoTela }) {
  switch (estado.tipo) {
    case 'carregando':
      return <EstadoCarregando />
    case 'vazio':
      return <EstadoVazio titulo={estado.titulo} descricao={estado.descricao} />
    case 'erro':
      return <EstadoErro mensagem={estado.mensagem} aoTentarNovamente={estado.aoTentarNovamente} />
    case 'sucesso':
      return <>{estado.conteudo}</>
  }
}
