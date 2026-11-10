import { CODIGOS_ERRO, MENSAGENS_ERRO, parseErroApi } from './erros'

const base = {
  timestamp: '2026-11-10T00:30:00Z',
  error: 'Unprocessable Entity',
  path: '/api/lotes',
}

describe('parseErroApi (AGENT.md 6.5)', () => {
  it('sem campos: normaliza código e mensagem pt-BR', () => {
    const erro = parseErroApi(422, {
      ...base,
      status: 422,
      codigo: 'LIMITE_LOTE_EXCEDIDO',
      message: 'Limit exceeded',
    })
    expect(erro.tipo).toBe('http')
    expect(erro.status).toBe(422)
    expect(erro.codigo).toBe('LIMITE_LOTE_EXCEDIDO')
    expect(erro.mensagem).toBe(MENSAGENS_ERRO.LIMITE_LOTE_EXCEDIDO)
    expect(erro.mensagemServidor).toBe('Limit exceeded')
    expect(erro.campos).toEqual([])
    expect(erro.path).toBe('/api/lotes')
  })

  it('com campos: preserva os erros por campo para o formulário', () => {
    const erro = parseErroApi(400, {
      ...base,
      status: 400,
      codigo: 'DADOS_INVALIDOS',
      message: 'Validação falhou',
      campos: [
        { campo: 'nomeCliente', mensagem: 'não deve estar em branco' },
        { campo: 'coordenada.latitude', mensagem: 'inválida' },
      ],
    })
    expect(erro.codigo).toBe('DADOS_INVALIDOS')
    expect(erro.campos).toEqual([
      { campo: 'nomeCliente', mensagem: 'não deve estar em branco' },
      { campo: 'coordenada.latitude', mensagem: 'inválida' },
    ])
  })

  it('código desconhecido cai na message do servidor', () => {
    const erro = parseErroApi(422, {
      ...base,
      status: 422,
      codigo: 'CODIGO_NOVO_DO_BACKEND',
      message: 'Mensagem específica do servidor',
    })
    expect(erro.codigo).toBeNull()
    expect(erro.codigoBruto).toBe('CODIGO_NOVO_DO_BACKEND')
    expect(erro.mensagem).toBe('Mensagem específica do servidor')
  })

  it('corpo vazio ou fora do formato: mensagem genérica pelo status', () => {
    expect(parseErroApi(500, null).mensagem).toBe(MENSAGENS_ERRO.ERRO_INTERNO_SERVIDOR)
    expect(parseErroApi(404, 'html de proxy').mensagem).toBe(MENSAGENS_ERRO.RECURSO_NAO_ENCONTRADO)
  })

  it('CREDENCIAIS_INVALIDAS (login, 401) tem mensagem genérica (UC07 E1)', () => {
    const erro = parseErroApi(401, { ...base, status: 401, codigo: 'CREDENCIAIS_INVALIDAS' })
    expect(erro.mensagem).toBe('E-mail ou senha inválidos.')
  })

  it('todo código do catálogo tem mensagem pt-BR', () => {
    for (const codigo of CODIGOS_ERRO) {
      expect(MENSAGENS_ERRO[codigo].length).toBeGreaterThan(0)
    }
  })
})
