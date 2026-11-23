import { z } from 'zod'
import { decimal, inteiro, localDate, opcional, uuid } from './comuns'

/**
 * Relatório do dia (D013, decisão 5; T010). PROVISÓRIO: conferido com RelatorioDoDiaResponse do worktree
 * .t015 do backend (099c91a), idêntico ao contrato da D013; falta chegar a develop. Contrato definido na
 * D013, ainda sem o DTO em `develop` do backend (T015 em andamento). Valores monetários podem vir
 * `null` (repasse indefinido não entra como zero): por isso `opcional` neles.
 */
export const relatorioDoEntregadorResponseSchema = z.object({
  motoboyId: uuid,
  nome: z.string(),
  entregas: inteiro,
  entregues: inteiro,
  falhas: inteiro,
  valorRepasse: opcional(decimal),
  valorPago: opcional(decimal),
  valorAPagar: opcional(decimal),
})
export type RelatorioDoEntregadorResponse = z.infer<typeof relatorioDoEntregadorResponseSchema>

export const relatorioDoDiaResponseSchema = z.object({
  data: localDate,
  totalEntregas: inteiro,
  entregues: inteiro,
  falhas: inteiro,
  canceladas: inteiro,
  entregadoresQueTrabalharam: inteiro,
  valorTotalRepasse: opcional(decimal),
  valorPago: opcional(decimal),
  valorAPagar: opcional(decimal),
  porEntregador: z.array(relatorioDoEntregadorResponseSchema),
})
export type RelatorioDoDiaResponse = z.infer<typeof relatorioDoDiaResponseSchema>
