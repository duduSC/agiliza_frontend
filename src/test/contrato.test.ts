/**
 * T009, parte A: contrato real (backend develop 8c02b47).
 *
 * Cada função de rede do Backoffice passa por cliente HTTP, MSW e schema Zod. Além disso, o corpo
 * bruto de cada mock precisa ter exatamente os campos do DTO: o backend serializa os records com
 * todos os campos (nulos como `null`), e um mock que omite campo ou inventa formato esconde bug.
 */
import type { z } from 'zod'
import { fazerLogin, renovarToken } from '@/features/auth/api/authApi'
import { ajustarRepasse, buscarExtrato, listarAjustes } from '@/features/acerto/api/acertoApi'
import { gerarRecibo, listarRecibos, marcarReciboPago } from '@/features/acerto/api/recibosApi'
import { buscarCaixaAtual, fecharCaixa, listarCaixas } from '@/features/caixa/api/caixaApi'
import { listarEmRevisao, listarPendentesDeDespacho } from '@/features/despacho/api/entregasApi'
import { contarFalhasPendentes } from '@/features/despacho/api/falhasApi'
import { despacharLote, devolverLote, listarLotesDespachados } from '@/features/despacho/api/lotesApi'
import { listarEntregadoresDisponiveis } from '@/features/despacho/api/motoboysApi'
import { buscarEstabelecimentoAtual } from '@/features/loja'
import { listarEntregadoresNoMapa } from '@/features/monitoramento/api/motoboysMonitoramentoApi'
import { montarUrl } from '@/shared/api/client'
import * as S from '@/shared/api/schemas'
import { IDS_ACERTO } from '@/test/msw/dadosAcerto'
import { IDS_ENTREGAS } from '@/test/msw/dadosEntregas'
import { IDS_LOTES } from '@/test/msw/dadosLotes'
import { IDS_MOTOBOYS } from '@/test/msw/dadosMotoboys'

const INICIO = '2026-11-09T00:00:00'
const FIM = '2026-11-09T23:59:59.999999'
const M = IDS_ACERTO.motoboy

const LEITURAS: [string, () => Promise<unknown>][] = [
  ['entregas pendentes', () => listarPendentesDeDespacho()],
  ['entregas em revisão', () => listarEmRevisao()],
  ['lotes despachados', () => listarLotesDespachados()],
  ['entregadores disponíveis', () => listarEntregadoresDisponiveis()],
  ['entregadores no mapa', () => listarEntregadoresNoMapa()],
  ['falhas de integração', () => contarFalhasPendentes()],
  ['estabelecimento', () => buscarEstabelecimentoAtual()],
  ['extrato', () => buscarExtrato(M, INICIO, FIM)],
  ['ajustes', () => listarAjustes(IDS_ACERTO.entregaSemRecibo)],
  ['recibos', () => listarRecibos(M)],
  ['caixa atual', () => buscarCaixaAtual()],
  ['caixas do período', () => listarCaixas('2026-11-08', '2026-11-09')],
]

describe('leituras: rede + MSW + Zod', () => {
  it.each(LEITURAS)('%s', async (_nome, chamar) => {
    await expect(chamar()).resolves.toBeDefined()
  })
})

const DTOS: [string, string, () => z.ZodObject][] = [
  ['EntregaResponse', '/api/entregas?status=AGUARDANDO_DESPACHO', () => S.entregaResponseSchema],
  ['LoteEntregaResponse', '/api/lotes?status=DESPACHADO', () => S.loteEntregaResponseSchema],
  ['MotoboyResponse', '/api/motoboys', () => S.motoboyResponseSchema],
  ['FalhaIntegracaoResponse', '/api/falhas-integracao', () => S.falhaIntegracaoResponseSchema],
  ['EstabelecimentoResponse', '/api/estabelecimento', () => S.estabelecimentoResponseSchema],
  [
    'ExtratoAcertoResponse',
    `/api/acertos?motoboyId=${M}&inicio=${INICIO}&fim=${FIM}`,
    () => S.extratoAcertoResponseSchema,
  ],
  [
    'EntregaAjusteValorResponse',
    `/api/entregas/${IDS_ACERTO.entregaSemRecibo}/ajustes`,
    () => S.entregaAjusteValorResponseSchema,
  ],
  ['ReciboResponse', `/api/recibos?motoboyId=${M}`, () => S.reciboResponseSchema],
  ['CaixaResponse', '/api/caixas/atual', () => S.caixaResponseSchema],
]

describe('mocks com exatamente os campos do DTO', () => {
  it.each(DTOS)('%s', async (_nome, caminho, schema) => {
    const corpo: unknown = await (await fetch(montarUrl(caminho))).json()
    const itens = (Array.isArray(corpo) ? corpo : [corpo]) as object[]
    expect(itens.length).toBeGreaterThan(0)
    for (const item of itens) {
      expect(Object.keys(item).sort()).toEqual(Object.keys(schema().shape).sort())
      expect(schema().safeParse(item).success).toBe(true)
    }
  })
})

describe('mocks seguem as regras do backend', () => {
  it('login de entregador no backoffice: 403 ACESSO_NEGADO (UC07 E4)', async () => {
    await expect(fazerLogin({ loginEmail: 'motoboy@teste.com', senha: 'senha123' })).rejects.toMatchObject({
      status: 403,
      codigo: 'ACESSO_NEGADO',
    })
  })

  it('refresh inválido: 401 NAO_AUTENTICADO', async () => {
    await expect(renovarToken('nao-existe')).rejects.toMatchObject({ status: 401, codigo: 'NAO_AUTENTICADO' })
  })

  it('despacho: entregador vira EM_ROTA, e a devolução traz de volta entregas e entregador', async () => {
    const lote = await despacharLote({
      motoboyId: IDS_MOTOBOYS.online1,
      entregaIds: [IDS_ENTREGAS.pendenteComRepasse],
    })
    expect((await listarEntregadoresDisponiveis()).map((m) => m.id)).not.toContain(IDS_MOTOBOYS.online1)
    expect((await listarPendentesDeDespacho()).map((e) => e.id)).not.toContain(IDS_ENTREGAS.pendenteComRepasse)

    await devolverLote(lote.id)
    expect((await listarEntregadoresDisponiveis()).map((m) => m.id)).toContain(IDS_MOTOBOYS.online1)
    expect((await listarPendentesDeDespacho()).map((e) => e.id)).toContain(IDS_ENTREGAS.pendenteComRepasse)
  })

  it('entrega em revisão não entra em lote: 422', async () => {
    await expect(
      despacharLote({ motoboyId: IDS_MOTOBOYS.online1, entregaIds: [IDS_ENTREGAS.revisaoSemDistancia] }),
    ).rejects.toMatchObject({ status: 422, codigo: 'ENTREGA_INAPTA_LOTE' })
  })

  it('devolver lote EM_ROTA: 422 TRANSICAO_ESTADO_INVALIDA', async () => {
    await expect(devolverLote(IDS_LOTES.emRota)).rejects.toMatchObject({
      status: 422,
      codigo: 'TRANSICAO_ESTADO_INVALIDA',
    })
  })

  it('gerar recibo consolida as linhas e o extrato volta recalculado pelo servidor', async () => {
    const recibo = await gerarRecibo({ motoboyId: M, periodoInicio: INICIO, periodoFim: FIM })
    expect(recibo).toMatchObject({ qtdEntregas: 1, valorTotal: 9, status: 'GERADO' })
    const extrato = await buscarExtrato(M, INICIO, FIM)
    expect(extrato.totalDevido).toBe(0)
    expect(extrato.totalConsolidado).toBe(18)
    expect((await marcarReciboPago(recibo.id)).status).toBe('PAGO')
  })

  it('caixa fechado é imutável: o ajuste responde CAIXA_FECHADO', async () => {
    const caixa = await buscarCaixaAtual()
    expect(await fecharCaixa(caixa!.id)).toMatchObject({ status: 'FECHADO', qtdRecibos: 1, valorTotal: 9 })
    await expect(ajustarRepasse(IDS_ACERTO.entregaSemRecibo, 11, 'correção')).rejects.toMatchObject({
      status: 422,
      codigo: 'CAIXA_FECHADO',
    })
  })
})
