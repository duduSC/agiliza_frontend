import { z } from 'zod'
import { decimal, inteiro, localDate, opcional, uuid } from './comuns'

/**
 * Relatório do dia (D013, decisão 5; T010). PROVISÓRIO até a T015 do backend chegar a `develop`:
 * contrato da D013, conferido campo a campo com `RelatorioDoDiaResponse` e
 * `RelatorioDoEntregadorResponse` do worktree `.t015` (commit 099c91a). Valores monetários podem
 * vir `null` (repasse indefinido não entra como zero; `RelatorioServiceImpl.soma`): por isso
 * `opcional` neles. As contagens são `int` primitivo no Java e nunca vêm nulas.
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
