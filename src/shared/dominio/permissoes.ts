/**
 * Telas do Backoffice e perfis que acessam cada uma (AGENT.md, seção 7; decisão D004 do
 * Eduardo: ADMIN_RESTAURANTE acessa também as telas do OPERADOR).
 *
 * Isto é CONVENIÊNCIA DE INTERFACE, não segurança (Constituição, Artigo 6.3): o backend é quem
 * de fato barra o acesso. Qualquer tela ou ação sem regra explícita aqui fica negada (Artigo 1.3).
 */
import type { PerfilUsuario } from './enums'

export type ChaveTela =
  | 'restaurantes'
  | 'lojaEntregadores'
  | 'lojaFaixasPreco'
  | 'lojaParametros'
  | 'lojaIntegracao'
  | 'despacho'
  | 'monitoramento'
  | 'acerto'
  | 'caixa'
  | 'relatorio'

export type Tela = {
  chave: ChaveTela
  caminho: string
  titulo: string
  /** Texto curto do atalho na pagina inicial (T008). */
  descricao: string
  perfis: readonly PerfilUsuario[]
}

/**
 * Pagina inicial (T008, decisao do Eduardo de 17/11/2026): destino depois do login e de `/`.
 * Fica fora de `TELAS` porque nao e uma tela de trabalho -- e o indice delas. Todo perfil que
 * acessa o Backoffice a ve.
 */
export const CAMINHO_INICIO = '/inicio'
export const TITULO_INICIO = 'Início'

const OPERACAO: readonly PerfilUsuario[] = ['OPERADOR', 'ADMIN_RESTAURANTE']
const LOJA: readonly PerfilUsuario[] = ['ADMIN_RESTAURANTE']

/** Ordem = ordem do menu e da seção 7 do AGENT.md. */
export const TELAS: readonly Tela[] = [
  { chave: 'restaurantes', caminho: '/restaurantes', titulo: 'Restaurantes', descricao: 'Cadastro dos estabelecimentos e ativação ou inativação.', perfis: ['ADMIN_GERAL'] },
  { chave: 'lojaEntregadores', caminho: '/loja/entregadores', titulo: 'Entregadores', descricao: 'Cadastro dos entregadores, bloqueio e desbloqueio.', perfis: LOJA },
  { chave: 'lojaFaixasPreco', caminho: '/loja/faixas-preco', titulo: 'Faixas de preço', descricao: 'Tabela de repasse por faixa de distância.', perfis: LOJA },
  { chave: 'lojaParametros', caminho: '/loja/parametros', titulo: 'Parâmetros da loja', descricao: 'Limite de pedidos por lote e repasse fora de área.', perfis: LOJA },
  { chave: 'lojaIntegracao', caminho: '/loja/integracao', titulo: 'Integração', descricao: 'Provedor de pedidos e situação da integração.', perfis: LOJA },
  { chave: 'despacho', caminho: '/despacho', titulo: 'Despacho', descricao: 'Entregas aguardando despacho, revisão e montagem de lotes.', perfis: OPERACAO },
  { chave: 'monitoramento', caminho: '/monitoramento', titulo: 'Monitoramento', descricao: 'Posição e disponibilidade dos entregadores em tempo real.', perfis: OPERACAO },
  { chave: 'acerto', caminho: '/acerto', titulo: 'Acerto', descricao: 'Extrato por entregador, ajustes e recibos.', perfis: OPERACAO },
  { chave: 'caixa', caminho: '/caixa', titulo: 'Caixa', descricao: 'Abertura, fechamento e reabertura do caixa do dia.', perfis: OPERACAO },
  // T010 (D013, decisão 5): resumo simples do dia, decisão de escopo do Eduardo.
  { chave: 'relatorio', caminho: '/relatorio', titulo: 'Relatório do dia', descricao: 'Entregas do dia, entregadores que trabalharam e repasse pago e a pagar.', perfis: OPERACAO },
]

export function obterTela(chave: ChaveTela): Tela {
  const tela = TELAS.find((t) => t.chave === chave)
  if (!tela) throw new Error(`Tela desconhecida: ${chave}`)
  return tela
}

/** UC07, E4: o ENTREGADOR não acessa o Backoffice (Constituição, Artigo 4.3). */
export function perfilAcessaBackoffice(perfil: PerfilUsuario): boolean {
  return perfil !== 'ENTREGADOR'
}

export function podeAcessarTela(perfil: PerfilUsuario, chave: ChaveTela): boolean {
  return perfilAcessaBackoffice(perfil) && obterTela(chave).perfis.includes(perfil)
}

export function telasDoPerfil(perfil: PerfilUsuario): Tela[] {
  return TELAS.filter((t) => podeAcessarTela(perfil, t.chave))
}

/** Primeira tela de trabalho do perfil (ordem do menu). `null` = sem acesso. */
export function primeiraTelaDoPerfil(perfil: PerfilUsuario): string | null {
  return telasDoPerfil(perfil)[0]?.caminho ?? null
}

/** "Reabrir caixa" é exclusivo do ADMIN_RESTAURANTE (Constituição, Artigo 5.3). */
export function podeReabrirCaixa(perfil: PerfilUsuario): boolean {
  return perfil === 'ADMIN_RESTAURANTE'
}

/**
 * Destino depois do login (T008): volta para a rota protegida que mandou ao login, se o perfil
 * puder abri-la; senao, `/inicio`. Aceita so caminhos internos conhecidos (nunca URL externa),
 * para o destino guardado nao virar redirecionamento aberto.
 */
export function destinoDepoisDoLogin(perfil: PerfilUsuario, destinoGuardado: unknown): string {
  if (typeof destinoGuardado === 'string') {
    const caminho = destinoGuardado.split(/[?#]/)[0]
    if (caminho === CAMINHO_INICIO) return CAMINHO_INICIO
    const tela = TELAS.find((t) => t.caminho === caminho)
    if (tela && podeAcessarTela(perfil, tela.chave)) return destinoGuardado
  }
  return CAMINHO_INICIO
}
