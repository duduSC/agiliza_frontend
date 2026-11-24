// API publica do modulo `monitoramento` (AGENT.md, secao 5).
export { MonitoramentoPagina } from './paginas/MonitoramentoPagina'
// Operação unificada (T010): o Despacho usa a mesma frota e a mesma regra de "sem sinal".
export { useEntregadoresNoMapa } from './api/hooks'
export { posicaoDesatualizada } from './util'
