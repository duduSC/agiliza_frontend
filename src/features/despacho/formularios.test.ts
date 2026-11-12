/**
 * Testes dos schemas de formulario e das funcoes de conversao (T003).
 * Validacao Zod no cliente antes do envio.
 */
import { describe, expect, it } from 'vitest'
import {
  campoDoFormAvulsa,
  cancelamentoFormSchema,
  coordenadaFormSchema,
  entregaAvulsaFormSchema,
  paraAjustarCoordenadaRequest,
  paraCriarEntregaAvulsaRequest,
  separarErrosDeCampo,
  VALORES_INICIAIS_AVULSA,
  type EntregaAvulsaForm,
} from './formularios'

function formValido(): EntregaAvulsaForm {
  return {
    ...VALORES_INICIAIS_AVULSA,
    nomeCliente: 'Ana Souza',
    enderecoCompleto: 'Rua Exemplo, 100',
  }
}

describe('entregaAvulsaFormSchema', () => {
  it('aceita o minimo: nomeCliente e enderecoCompleto', () => {
    const resultado = entregaAvulsaFormSchema.safeParse(formValido())
    expect(resultado.success).toBe(true)
  })

  it('rejeita nomeCliente vazio', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      nomeCliente: '',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita enderecoCompleto vazio', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      enderecoCompleto: '',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita nomeCliente com mais de 120 caracteres', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      nomeCliente: 'a'.repeat(121),
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita CEP com formato invalido', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      cep: '123',
    })
    expect(resultado.success).toBe(false)
  })

  it('aceita CEP com formato valido (com hifen)', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      cep: '01310-100',
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita CEP sem hifen', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      cep: '01310100',
    })
    expect(resultado.success).toBe(true)
  })

  it('rejeita valorPedido com formato invalido', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      valorPedido: 'abc',
    })
    expect(resultado.success).toBe(false)
  })

  it('aceita valorPedido com virgula (pt-BR)', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      valorPedido: '25,90',
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita valorPedido com ponto', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      valorPedido: '25.90',
    })
    expect(resultado.success).toBe(true)
  })

  it('rejeita latitude fora do intervalo', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      latitude: '91',
      longitude: '-46.63',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita longitude fora do intervalo', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      latitude: '-23.55',
      longitude: '181',
    })
    expect(resultado.success).toBe(false)
  })

  it('rejeita coordenada parcial (latitude sem longitude)', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      latitude: '-23.55',
      longitude: '',
    })
    expect(resultado.success).toBe(false)
  })

  it('aceita coordenada completa', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      latitude: '-23.55',
      longitude: '-46.63',
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita coordenada totalmente vazia (opcional)', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      latitude: '',
      longitude: '',
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita formaPagamento como string vazia (nao informada)', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      formaPagamento: '',
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita formaPagamento valida', () => {
    const resultado = entregaAvulsaFormSchema.safeParse({
      ...formValido(),
      formaPagamento: 'PIX',
    })
    expect(resultado.success).toBe(true)
  })
})

describe('paraCriarEntregaAvulsaRequest', () => {
  it('converte valores preenchidos corretamente', () => {
    const request = paraCriarEntregaAvulsaRequest({
      ...formValido(),
      telefoneCliente: '11999999999',
      bairro: 'Centro',
      valorPedido: '25,90',
      formaPagamento: 'DINHEIRO',
      pagoOnline: false,
      trocoPara: '50,00',
      latitude: '-23,55',
      longitude: '-46,63',
    })

    expect(request.nomeCliente).toBe('Ana Souza')
    expect(request.enderecoCompleto).toBe('Rua Exemplo, 100')
    expect(request.telefoneCliente).toBe('11999999999')
    expect(request.bairro).toBe('Centro')
    expect(request.valorPedido).toBe(25.9)
    expect(request.formaPagamento).toBe('DINHEIRO')
    expect(request.pagoOnline).toBe(false)
    expect(request.trocoPara).toBe(50)
    expect(request.coordenada).toEqual({ latitude: -23.55, longitude: -46.63 })
  })

  it('converte campos vazios para null', () => {
    const request = paraCriarEntregaAvulsaRequest(formValido())

    expect(request.telefoneCliente).toBeNull()
    expect(request.bairro).toBeNull()
    expect(request.cep).toBeNull()
    expect(request.complemento).toBeNull()
    expect(request.pontoReferencia).toBeNull()
    expect(request.valorPedido).toBeNull()
    expect(request.formaPagamento).toBeNull()
    expect(request.trocoPara).toBeNull()
    expect(request.observacoes).toBeNull()
    expect(request.coordenada).toBeNull()
  })
})

describe('coordenadaFormSchema', () => {
  it('rejeita latitude vazia', () => {
    const resultado = coordenadaFormSchema.safeParse({ latitude: '', longitude: '-46.63' })
    expect(resultado.success).toBe(false)
  })

  it('rejeita longitude vazia', () => {
    const resultado = coordenadaFormSchema.safeParse({ latitude: '-23.55', longitude: '' })
    expect(resultado.success).toBe(false)
  })

  it('aceita coordenada valida', () => {
    const resultado = coordenadaFormSchema.safeParse({ latitude: '-23.55', longitude: '-46.63' })
    expect(resultado.success).toBe(true)
  })
})

describe('paraAjustarCoordenadaRequest', () => {
  it('converte texto em numeros', () => {
    const request = paraAjustarCoordenadaRequest({ latitude: '-23,55', longitude: '-46,63' })
    expect(request).toEqual({ latitude: -23.55, longitude: -46.63 })
  })
})

describe('cancelamentoFormSchema', () => {
  it('rejeita motivo vazio', () => {
    const resultado = cancelamentoFormSchema.safeParse({ motivo: '' })
    expect(resultado.success).toBe(false)
  })

  it('rejeita motivo com mais de 100 caracteres', () => {
    const resultado = cancelamentoFormSchema.safeParse({ motivo: 'a'.repeat(101) })
    expect(resultado.success).toBe(false)
  })

  it('aceita motivo valido', () => {
    const resultado = cancelamentoFormSchema.safeParse({ motivo: 'Cliente desistiu' })
    expect(resultado.success).toBe(true)
  })
})

describe('campoDoFormAvulsa', () => {
  it('mapeia campo direto', () => {
    expect(campoDoFormAvulsa('nomeCliente')).toBe('nomeCliente')
  })

  it('mapeia campo aninhado coordenada.latitude', () => {
    expect(campoDoFormAvulsa('coordenada.latitude')).toBe('latitude')
  })

  it('mapeia campo aninhado coordenada.longitude', () => {
    expect(campoDoFormAvulsa('coordenada.longitude')).toBe('longitude')
  })

  it('retorna null para campo desconhecido', () => {
    expect(campoDoFormAvulsa('campoInexistente')).toBeNull()
  })
})

describe('separarErrosDeCampo', () => {
  it('separa erros de campo do formulario e erros sem campo', () => {
    const resultado = separarErrosDeCampo([
      { campo: 'nomeCliente', mensagem: 'Nome obrigatorio' },
      { campo: 'campoDesconhecido', mensagem: 'Erro geral' },
    ])
    expect(resultado.doFormulario).toEqual([
      { campo: 'nomeCliente', mensagem: 'Nome obrigatorio' },
    ])
    expect(resultado.semCampo).toEqual(['Erro geral'])
  })
})
