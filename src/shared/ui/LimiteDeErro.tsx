/**
 * Limite de erro de renderizacao (T008). Um componente que quebra (por exemplo, o mapa Leaflet)
 * nao pode derrubar a tela inteira: sem isto, o React desmonta toda a arvore e a pagina fica
 * em branco -- foi o sintoma do Despacho com o backend real.
 *
 * Nao registra a mensagem do erro com dados do payload (Constituicao, Artigo 6.5).
 */
import { Component, type ReactNode } from 'react'
import { EstadoErro } from './estados'

type Props = {
  /** Mensagem exibida no lugar do conteudo que falhou. */
  mensagem: string
  children: ReactNode
}

type Estado = { falhou: boolean }

export class LimiteDeErro extends Component<Props, Estado> {
  override state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  override componentDidCatch(erro: Error): void {
    // A mensagem pode carregar dado de pedido (o Leaflet inclui a coordenada): so em dev.
    console.error('[LimiteDeErro]', erro.name, import.meta.env.DEV ? erro.message : '')
  }

  private tentarNovamente = () => this.setState({ falhou: false })

  override render() {
    if (this.state.falhou) {
      return <EstadoErro mensagem={this.props.mensagem} aoTentarNovamente={this.tentarNovamente} />
    }
    return this.props.children
  }
}
