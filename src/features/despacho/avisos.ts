import { toast } from 'sonner'
import type { EntregaResponse } from '@/shared/api'
import { formatarKm } from '@/shared/formatacao'

/**
 * Resultado do "Reposicionar pino" (T010), a partir da entrega que o servidor devolveu. Se a rota
 * falhar de novo, o backend grava o pino mas mantém a revisão (`SEM_DISTANCIA`): a tela diz isso,
 * em vez de anunciar uma distância que não existe.
 */
export function avisarResultadoDoPino(entrega: EntregaResponse): void {
  if (entrega.pendenteRevisao && entrega.motivoRevisao !== 'CONTESTACAO_ENTREGADOR') {
    toast.warning(
      `Coordenada de ${entrega.nomeCliente} salva, mas a distância ainda não pôde ser calculada. A entrega continua em revisão.`,
    )
    return
  }
  toast.success(
    `Coordenada de ${entrega.nomeCliente} enviada. Distância recalculada: ${formatarKm(entrega.distanciaKm)}.`,
  )
}
