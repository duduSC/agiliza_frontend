import {
  destinoDepoisDoLogin,
  perfilAcessaBackoffice,
  podeAcessarTela,
  podeReabrirCaixa,
  primeiraTelaDoPerfil,
  telasDoPerfil,
  TELAS,
} from './permissoes'

const caminhos = (perfil: Parameters<typeof telasDoPerfil>[0]) =>
  telasDoPerfil(perfil).map((t) => t.caminho)

const OPERACAO = ['/despacho', '/monitoramento', '/acerto', '/caixa', '/relatorio']
const LOJA = ['/loja/entregadores', '/loja/faixas-preco', '/loja/parametros', '/loja/integracao']

describe('permissões por perfil (AGENT.md, seção 7)', () => {
  it('ADMIN_GERAL só acessa /restaurantes', () => {
    expect(caminhos('ADMIN_GERAL')).toEqual(['/restaurantes'])
  })

  it('OPERADOR acessa só as telas de operação, nunca /loja/*', () => {
    expect(caminhos('OPERADOR')).toEqual(OPERACAO)
    for (const t of TELAS.filter((t) => t.caminho.startsWith('/loja/'))) {
      expect(podeAcessarTela('OPERADOR', t.chave)).toBe(false)
    }
    expect(podeAcessarTela('OPERADOR', 'restaurantes')).toBe(false)
  })

  it('ADMIN_RESTAURANTE acessa /loja/* e também as telas do operador (D004)', () => {
    expect(caminhos('ADMIN_RESTAURANTE')).toEqual([...LOJA, ...OPERACAO])
    expect(podeAcessarTela('ADMIN_RESTAURANTE', 'restaurantes')).toBe(false)
  })

  it('ENTREGADOR não acessa nenhuma tela (UC07, E4)', () => {
    expect(perfilAcessaBackoffice('ENTREGADOR')).toBe(false)
    expect(caminhos('ENTREGADOR')).toEqual([])
    expect(primeiraTelaDoPerfil('ENTREGADOR')).toBeNull()
  })

  it('primeira tela de cada perfil', () => {
    expect(primeiraTelaDoPerfil('ADMIN_GERAL')).toBe('/restaurantes')
    expect(primeiraTelaDoPerfil('OPERADOR')).toBe('/despacho')
    expect(primeiraTelaDoPerfil('ADMIN_RESTAURANTE')).toBe('/loja/entregadores')
  })

  it('destino depois do login (T008): /inicio, ou a rota guardada se o perfil a acessa', () => {
    expect(destinoDepoisDoLogin('OPERADOR', undefined)).toBe('/inicio')
    expect(destinoDepoisDoLogin('OPERADOR', '/despacho')).toBe('/despacho')
    expect(destinoDepoisDoLogin('OPERADOR', '/acerto?motoboyId=x')).toBe('/acerto?motoboyId=x')
    expect(destinoDepoisDoLogin('OPERADOR', '/loja/parametros')).toBe('/inicio')
    expect(destinoDepoisDoLogin('ADMIN_GERAL', '/despacho')).toBe('/inicio')
    expect(destinoDepoisDoLogin('ADMIN_GERAL', '/restaurantes')).toBe('/restaurantes')
    expect(destinoDepoisDoLogin('OPERADOR', '//exemplo.com/despacho')).toBe('/inicio')
    expect(destinoDepoisDoLogin('OPERADOR', 'https://exemplo.com')).toBe('/inicio')
    expect(destinoDepoisDoLogin('OPERADOR', '/login')).toBe('/inicio')
    expect(destinoDepoisDoLogin('OPERADOR', 42)).toBe('/inicio')
  })

  it('"Reabrir caixa" é exclusivo do ADMIN_RESTAURANTE', () => {
    expect(podeReabrirCaixa('ADMIN_RESTAURANTE')).toBe(true)
    expect(podeReabrirCaixa('OPERADOR')).toBe(false)
    expect(podeReabrirCaixa('ADMIN_GERAL')).toBe(false)
    expect(podeReabrirCaixa('ENTREGADOR')).toBe(false)
  })
})
