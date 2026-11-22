/**
 * Lista de entregadores no monitoramento (T005, UC04 HU08).
 * Complementa o mapa com informacoes textuais. Acessibilidade: cor nao e o unico indicador.
 */
import { AlertTriangle } from 'lucide-react'
import type { MotoboyResponse } from '@/shared/api/schemas'
import { LABEL_STATUS_DISPONIBILIDADE_MOTOBOY } from '@/shared/dominio/enums'
import { Badge } from '@/shared/ui/badge'
import { formatarHora } from '@/shared/formatacao'
import { posicaoDesatualizada } from '../util'

type Props = {
  entregadores: MotoboyResponse[]
  agora: Date
}

function badgeVariante(status: string, desatualizado: boolean): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (desatualizado) return 'destructive'
  if (status === 'EM_ROTA') return 'default'
  return 'secondary'
}

export function ListaEntregadores({ entregadores, agora }: Props) {
  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Lista de entregadores">
      {entregadores.map((entregador) => {
        const desatualizado = posicaoDesatualizada(entregador.ultimaPosicaoEm, agora)
        const label = LABEL_STATUS_DISPONIBILIDADE_MOTOBOY[entregador.statusDisponibilidade]

        return (
          <div
            key={entregador.id}
            className="flex items-center justify-between rounded-lg border p-3"
            role="listitem"
            data-testid={`entregador-${entregador.id}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{entregador.nome}</span>
              <span className="text-xs text-muted-foreground">
                {entregador.placaVeiculo ?? 'Sem placa'}
                {' — '}
                Última posição: {formatarHora(entregador.ultimaPosicaoEm)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {desatualizado && (
                <span
                  className="flex items-center gap-1 text-xs text-amber-700"
                  role="alert"
                  title="Posição desatualizada: sem transmitir há mais de 3 minutos"
                >
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  <span>Desatualizada</span>
                </span>
              )}
              <Badge variant={badgeVariante(entregador.statusDisponibilidade, desatualizado)}>
                {label}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
