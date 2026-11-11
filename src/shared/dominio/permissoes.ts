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

export type Tela = {
  chave: ChaveTela
  caminho: string
  titulo: string
  perfis: readonly PerfilUsuario[]
}

const OPERACAO: readonly PerfilUsuario[] = ['OPERADOR', 'ADMIN_RESTAURANTE']
const LOJA: readonly PerfilUsuario[] = ['ADMIN_RESTAURANTE']

/** Ordem = ordem do menu e da seção 7 do AGENT.md. */
export const TELAS: readonly Tela[] = [
  { chave: 'restaurantes', caminho: '/restaurantes', titulo: 'Restaurantes', perfis: ['ADMIN_GERAL'] },
  { chave: 'lojaEntregadores', caminho: '/loja/entregadores', titulo: 'Entregadores', perfis: LOJA },
  { chave: 'lojaFaixasPreco', caminho: '/loja/faixas-preco', titulo: 'Faixas de preço', perfis: LOJA },
  { chave: 'lojaParametros', caminho: '/loja/parametros', titulo: 'Parâmetros da loja', perfis: LOJA },
  { chave: 'lojaIntegracao', caminho: '/loja/integracao', titulo: 'Integração', perfis: LOJA },
  { chave: 'despacho', caminho: '/despacho', titulo: 'Despacho', perfis: OPERACAO },
  { chave: 'monitoramento', caminho: '/monitoramento', titulo: 'Monitoramento', perfis: OPERACAO },
  { chave: 'acerto', caminho: '/acerto', titulo: 'Acerto', perfis: OPERACAO },
  { chave: 'caixa', caminho: '/caixa', titulo: 'Caixa', perfis: OPERACAO },
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

/** Primeira tela do perfil, para onde ele vai ao iniciar a sessão. `null` = sem acesso. */
export function primeiraTelaDoPerfil(perfil: PerfilUsuario): string | null {
  return telasDoPerfil(perfil)[0]?.caminho ?? null
}

/** "Reabrir caixa" é exclusivo do ADMIN_RESTAURANTE (Constituição, Artigo 5.3). */
export function podeReabrirCaixa(perfil: PerfilUsuario): boolean {
  return perfil === 'ADMIN_RESTAURANTE'
}
