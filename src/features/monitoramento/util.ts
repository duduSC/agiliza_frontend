/**
 * Utilitarios do monitoramento (T005).
 */

const LIMITE_DESATUALIZADO_MS = 3 * 60 * 1000 // 3 minutos

/**
 * Verifica se a posicao do entregador esta desatualizada (mais de 3 min sem transmitir).
 * UC04 A1: entregador sem transmitir ha mais de 3 minutos exibe alerta.
 */
export function posicaoDesatualizada(ultimaPosicaoEm: string | null | undefined, agora: Date): boolean {
  if (!ultimaPosicaoEm) return true
  const posicaoDate = new Date(ultimaPosicaoEm)
  return agora.getTime() - posicaoDate.getTime() > LIMITE_DESATUALIZADO_MS
}
