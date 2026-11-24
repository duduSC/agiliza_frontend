import { z } from 'zod'
import { FORMAS_PAGAMENTO, MOTIVOS_REVISAO, STATUS_ENTREGA } from '@/shared/dominio/enums'
import { decimal, inteiro, localDateTime, opcional, uuid } from './comuns'
import { coordenadaSchema } from './coordenada'

/**
 * `dto/response/EntregaResponse.java` (conferido em 10/11/2026).
 * `ordemRota` existe no DTO, mas é da otimização de rota, fora do escopo do MVP
 * (Constituição, Artigo 4.2): aceito no parse, não usado pela interface.
 */
export const entregaResponseSchema = z.object({
  id: uuid,
  estabelecimentoId: uuid,
  pedidoExternoId: opcional(uuid),
  loteId: opcional(uuid),
  faixaPrecoId: opcional(uuid),
  reciboId: opcional(uuid),
  nomeCliente: z.string(),
  telefoneCliente: opcional(z.string()),
  enderecoCompleto: z.string(),
  bairro: opcional(z.string()),
  cep: opcional(z.string()),
  complemento: opcional(z.string()),
  pontoReferencia: opcional(z.string()),
  coordenada: opcional(coordenadaSchema),
  valorPedido: opcional(decimal),
  formaPagamento: opcional(z.enum(FORMAS_PAGAMENTO)),
  pagoOnline: z.boolean(),
  trocoPara: opcional(decimal),
  observacoes: opcional(z.string()),
  distanciaKm: opcional(decimal),
  valorRepasse: opcional(decimal),
  status: z.enum(STATUS_ENTREGA),
  motivoFalha: opcional(z.string()),
  pendenteRevisao: z.boolean(),
  motivoRevisao: opcional(z.enum(MOTIVOS_REVISAO)),
  prontoParaDespachoEm: opcional(localDateTime),
  despachadaEm: opcional(localDateTime),
  finalizadaEm: opcional(localDateTime),
  ordemRota: opcional(inteiro),
  criadoEm: localDateTime,
  atualizadoEm: opcional(localDateTime),
})
export type EntregaResponse = z.infer<typeof entregaResponseSchema>

export const listaEntregasResponseSchema = z.array(entregaResponseSchema)

/**
 * `dto/request/CriarEntregaAvulsaRequest.java` (conferido em 11/11/2026). Campos opcionais
 * vão como `null` quando não informados; `coordenada` é `CoordenadaDto`.
 */
export type CriarEntregaAvulsaRequest = {
  nomeCliente: string
  telefoneCliente: string | null
  enderecoCompleto: string
  bairro: string | null
  cep: string | null
  complemento: string | null
  pontoReferencia: string | null
  coordenada: { latitude: number; longitude: number } | null
  valorPedido: number | null
  formaPagamento: (typeof FORMAS_PAGAMENTO)[number] | null
  pagoOnline: boolean
  trocoPara: number | null
  observacoes: string | null
}

/**
 * `dto/request/CancelarEntregaRequest.java`: motivo obrigatório, até 100 caracteres.
 */
export type CancelarEntregaRequest = { motivo: string }

/**
 * `dto/request/AjustarCoordenadaRequest.java`: latitude e longitude obrigatórias.
 */
export type AjustarCoordenadaRequest = { latitude: number; longitude: number }
