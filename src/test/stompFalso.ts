/**
 * Cliente STOMP falso, com o mesmo contrato de `@stomp/stompjs` 7.5 no que o app usa. Nada conecta
 * sozinho (não há WebSocket no jsdom): o teste dispara conexão, queda e eventos. Como o real,
 * `subscribe` sem conexão lança, e uma queda apaga as inscrições do servidor.
 */
export const ReconnectionTimeMode = { LINEAR: 0, EXPONENTIAL: 1 } as const

export class Client {
  static instancias: Client[] = []

  active = false
  connected = false
  brokerURL = ''
  connectHeaders: Record<string, string> = {}
  reconnectDelay = 5000
  maxReconnectDelay = 900_000
  reconnectTimeMode: number = ReconnectionTimeMode.LINEAR
  beforeConnect: (cliente: Client) => void | Promise<void> = () => {}
  onConnect: (frame?: unknown) => void = () => {}
  onDisconnect: () => void = () => {}
  onStompError: () => void = () => {}
  onWebSocketClose: () => void = () => {}
  inscricoes = new Map<number, { destino: string; aoReceber: () => void }>()
  private proximo = 0

  constructor(config: object = {}) {
    Object.assign(this, config)
    Client.instancias.push(this)
  }

  activate() {
    this.active = true
  }

  deactivate() {
    this.active = false
    this.connected = false
    this.inscricoes.clear()
    return Promise.resolve()
  }

  subscribe(destino: string, aoReceber: () => void) {
    if (!this.connected) throw new TypeError('There is no underlying STOMP connection')
    const id = ++this.proximo
    this.inscricoes.set(id, { destino, aoReceber })
    return { id: String(id), unsubscribe: () => void this.inscricoes.delete(id) }
  }

  // ---- controles do teste ----

  async simularConexao() {
    await this.beforeConnect(this)
    if (!this.active) return
    this.connected = true
    this.onConnect()
  }

  simularQueda() {
    this.connected = false
    this.inscricoes.clear()
    this.onWebSocketClose()
  }

  destinos(): string[] {
    return [...this.inscricoes.values()].map((i) => i.destino).sort()
  }

  emitir(destino: string) {
    this.inscricoes.forEach((i) => {
      if (i.destino === destino) i.aoReceber()
    })
  }
}
