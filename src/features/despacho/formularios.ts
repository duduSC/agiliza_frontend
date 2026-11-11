/**
 * Schemas Zod dos formulários do despacho (T003) e a conversão para os requests da API.
 *
 * Os valores do formulário são texto (como digitados); o schema valida o formato e as
 * funções `para*Request` convertem. Os limites de tamanho espelham as anotações de
 * `CriarEntregaAvulsaRequest.java` (conferido em 11/11/2026).
 */
import { z } from 'zod'
import type {
  AjustarCoordenadaRequest,
  CampoErroApi,
  CriarEntregaAvulsaRequest,
} from '@/shared/api'
import { FORMAS_PAGAMENTO, type FormaPagamento } from '@/shared/dominio'
import { paraValorMonetarioBackend } from '@/shared/formatacao'

const REGEX_DINHEIRO = /^\d{1,8}([.,]\d{1,2})?$/
const REGEX_COORDENADA = /^-?\d{1,3}([.,]\d{1,8})?$/
const REGEX_CEP = /^\d{5}-?\d{3}$/

function numero(texto: string): number {
  return Number(texto.trim().replace(',', '.'))
}

function textoOpcional(max: number) {
  return z.string().trim().max(max, `Use no máximo ${max} caracteres.`)
}

const dinheiroOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || REGEX_DINHEIRO.test(v), 'Informe um valor como 25,90.')

function coordenadaTexto(limite: number, nome: string) {
  return z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (REGEX_COORDENADA.test(v) && Math.abs(numero(v)) <= limite),
      `${nome} inválida (entre -${limite} e ${limite}).`,
    )
}

/** Campo de forma de pagamento: '' = não informada. */
const formaPagamentoCampo = z.union([z.literal(''), z.enum(FORMAS_PAGAMENTO)])

export const entregaAvulsaFormSchema = z
  .object({
    nomeCliente: z
      .string()
      .trim()
      .min(1, 'Informe o nome do cliente.')
      .max(120, 'Use no máximo 120 caracteres.'),
    telefoneCliente: textoOpcional(20),
    enderecoCompleto: z
      .string()
      .trim()
      .min(1, 'Informe o endereço.')
      .max(255, 'Use no máximo 255 caracteres.'),
    bairro: textoOpcional(100),
    cep: z
      .string()
      .trim()
      .refine((v) => v === '' || REGEX_CEP.test(v), 'CEP inválido (ex.: 01310-100).'),
    complemento: textoOpcional(100),
    pontoReferencia: textoOpcional(150),
    latitude: coordenadaTexto(90, 'Latitude'),
    longitude: coordenadaTexto(180, 'Longitude'),
    valorPedido: dinheiroOpcional,
    formaPagamento: formaPagamentoCampo,
    pagoOnline: z.boolean(),
    trocoPara: dinheiroOpcional,
    observacoes: z.string().trim(), // coluna TEXT: sem limite no backend
  })
  .superRefine((v, ctx) => {
    // Coordenada é opcional (o backend geocodifica), mas precisa vir completa.
    if ((v.latitude === '') !== (v.longitude === '')) {
      const campo = v.latitude === '' ? 'latitude' : 'longitude'
      ctx.addIssue({
        code: 'custom',
        path: [campo],
        message: 'Informe latitude e longitude juntas, ou deixe as duas em branco.',
      })
    }
  })

export type EntregaAvulsaForm = z.infer<typeof entregaAvulsaFormSchema>

export const VALORES_INICIAIS_AVULSA: EntregaAvulsaForm = {
  nomeCliente: '',
  telefoneCliente: '',
  enderecoCompleto: '',
  bairro: '',
  cep: '',
  complemento: '',
  pontoReferencia: '',
  latitude: '',
  longitude: '',
  valorPedido: '',
  formaPagamento: '',
  pagoOnline: false,
  trocoPara: '',
  observacoes: '',
}

function ouNulo(texto: string): string | null {
  const t = texto.trim()
  return t === '' ? null : t
}

function dinheiroOuNulo(texto: string): number | null {
  const t = texto.trim()
  return t === '' ? null : paraValorMonetarioBackend(numero(t))
}

/** Converte valores JÁ validados pelo schema no corpo de `CriarEntregaAvulsaRequest`. */
export function paraCriarEntregaAvulsaRequest(v: EntregaAvulsaForm): CriarEntregaAvulsaRequest {
  const temCoordenada = v.latitude.trim() !== '' && v.longitude.trim() !== ''
  const formaPagamento: FormaPagamento | null = v.formaPagamento === '' ? null : v.formaPagamento
  return {
    nomeCliente: v.nomeCliente.trim(),
    telefoneCliente: ouNulo(v.telefoneCliente),
    enderecoCompleto: v.enderecoCompleto.trim(),
    bairro: ouNulo(v.bairro),
    cep: ouNulo(v.cep),
    complemento: ouNulo(v.complemento),
    pontoReferencia: ouNulo(v.pontoReferencia),
    coordenada: temCoordenada
      ? { latitude: numero(v.latitude), longitude: numero(v.longitude) }
      : null,
    valorPedido: dinheiroOuNulo(v.valorPedido),
    formaPagamento,
    pagoOnline: v.pagoOnline,
    trocoPara: dinheiroOuNulo(v.trocoPara),
    observacoes: ouNulo(v.observacoes),
  }
}

const CAMPOS_FORM_AVULSA = Object.keys(VALORES_INICIAIS_AVULSA) as (keyof EntregaAvulsaForm)[]

/**
 * Mapeia o nome de campo do Bean Validation (`ApiErrorResponse.campos[].campo`) para o
 * campo do formulário. `coordenada.latitude` → `latitude`. Desconhecido → `null`.
 */
export function campoDoFormAvulsa(campoServidor: string): keyof EntregaAvulsaForm | null {
  const nome = campoServidor.startsWith('coordenada.')
    ? campoServidor.slice('coordenada.'.length)
    : campoServidor
  return (CAMPOS_FORM_AVULSA as string[]).includes(nome) ? (nome as keyof EntregaAvulsaForm) : null
}

export function separarErrosDeCampo(campos: readonly CampoErroApi[]): {
  doFormulario: { campo: keyof EntregaAvulsaForm; mensagem: string }[]
  semCampo: string[]
} {
  const doFormulario: { campo: keyof EntregaAvulsaForm; mensagem: string }[] = []
  const semCampo: string[] = []
  for (const c of campos) {
    const campo = campoDoFormAvulsa(c.campo)
    if (campo) doFormulario.push({ campo, mensagem: c.mensagem })
    else semCampo.push(c.mensagem)
  }
  return { doFormulario, semCampo }
}

/** Ajuste de coordenada (revisão SEM_COORDENADA). Ambas obrigatórias. */
export const coordenadaFormSchema = z.object({
  latitude: coordenadaTexto(90, 'Latitude').refine((v) => v !== '', 'Informe a latitude.'),
  longitude: coordenadaTexto(180, 'Longitude').refine((v) => v !== '', 'Informe a longitude.'),
})
export type CoordenadaForm = z.infer<typeof coordenadaFormSchema>

export function paraAjustarCoordenadaRequest(v: CoordenadaForm): AjustarCoordenadaRequest {
  return { latitude: numero(v.latitude), longitude: numero(v.longitude) }
}

/**
 * Motivo do cancelamento: obrigatório (UC02 A3; `EntregaService.cancelar`). Até 100 caracteres:
 * é o tamanho de `entrega.motivo_falha`, e o backend trunca o excedente em silêncio.
 */
export const cancelamentoFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Informe o motivo do cancelamento.')
    .max(100, 'Use no máximo 100 caracteres.'),
})
export type CancelamentoForm = z.infer<typeof cancelamentoFormSchema>
