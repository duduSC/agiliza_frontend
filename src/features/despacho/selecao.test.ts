/**
 * Testes unitarios do store de selecao (T004, Constituicao 5.6).
 *
 * Verifica:
 * - Selecionar/desselecionar entregas
 * - Limite maxPedidosPorLote (UC01 E2)
 * - Limpar selecao
 */
import { useSelecaoStore } from './selecaoStore'

const { getState } = useSelecaoStore

function redefinir() {
  useSelecaoStore.setState({ selecionadas: new Set(), maxPedidosPorLote: 5 })
}

beforeEach(redefinir)
afterEach(redefinir)

describe('selecaoStore', () => {
  it('seleciona e desseleciona entregas', () => {
    expect(getState().estaSelecionada('a')).toBe(false)
    expect(getState().alternarSelecao('a')).toBe(true)
    expect(getState().estaSelecionada('a')).toBe(true)
    expect(getState().selecionadas.size).toBe(1)

    expect(getState().alternarSelecao('a')).toBe(true) // desseleciona
    expect(getState().estaSelecionada('a')).toBe(false)
    expect(getState().selecionadas.size).toBe(0)
  })

  it('respeita o limite maxPedidosPorLote', () => {
    getState().definirLimite(2)

    expect(getState().alternarSelecao('a')).toBe(true)
    expect(getState().alternarSelecao('b')).toBe(true)
    expect(getState().limiteAtingido()).toBe(true)

    // Terceira nao entra
    expect(getState().alternarSelecao('c')).toBe(false)
    expect(getState().estaSelecionada('c')).toBe(false)
    expect(getState().selecionadas.size).toBe(2)
  })

  it('permite desselecionar mesmo com limite atingido', () => {
    getState().definirLimite(1)
    getState().alternarSelecao('a')
    expect(getState().limiteAtingido()).toBe(true)

    // Desselecionar funciona
    expect(getState().alternarSelecao('a')).toBe(true)
    expect(getState().limiteAtingido()).toBe(false)
  })

  it('limparSelecao esvazia tudo', () => {
    getState().alternarSelecao('a')
    getState().alternarSelecao('b')
    expect(getState().selecionadas.size).toBe(2)

    getState().limparSelecao()
    expect(getState().selecionadas.size).toBe(0)
  })

  it('definirLimite altera o valor de maxPedidosPorLote', () => {
    expect(getState().maxPedidosPorLote).toBe(5) // padrao
    getState().definirLimite(10)
    expect(getState().maxPedidosPorLote).toBe(10)
  })
})
