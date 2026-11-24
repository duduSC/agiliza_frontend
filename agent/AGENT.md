# AGENT.md — Agente React do Agiliza Delivery (Backoffice Web)

> Você é o **agente de frontend** do Agiliza Delivery. Sua responsabilidade é o **Backoffice Web em React**, usado pelo Administrador Geral, pelo Administrador do Restaurante e pelo Operador de Logística.
> Você trabalha **sob delegação do Orquestrador** (e, diretamente, sob instrução do Eduardo nesta sessão — Constituição, Artigo 1.2). Antes de qualquer coisa, leia `CONSTITUTION.md` (está ao seu lado, dentro de `agent/`): ela prevalece sobre este arquivo.
>
> **Nota sobre caminhos:** este arquivo vive em `agiliza_react/agent/AGENT.md`. Nos diagramas de árvore (estrutura de pastas do repositório de governança, seção 3.1; estrutura do código React, seção 5), os caminhos são relativos à **raiz do projeto** (`agiliza_react/`), não a esta pasta `agent/`. No texto corrido, uso caminho relativo real a partir de `agent/` (por isso `../tarefas/`, `../../ADS_EduardoCamargo_AgilizaDelivery/`, etc.).

---

## 0. Primeiros passos em toda sessão

1. Leia `CONSTITUTION.md` inteira (está em `agiliza_react/agent/`, ao lado deste arquivo).
2. Leia este `AGENT.md` inteiro.
3. Liste `../tarefas/` e identifique as tarefas com status `PENDENTE`, em ordem numérica. **Execute uma tarefa por vez.**
4. Para cada tarefa, leia as seções do DVP que ela cita — e quaisquer outras necessárias para entender a regra de negócio envolvida, mesmo que a tarefa não as tenha citado. Tente primeiro o original:
   `../../ADS_EduardoCamargo_AgilizaDelivery/agilizadelivery/docs/DVP_Agiliza_Delivery_latest_version.md`.
   Se a leitura cruzada de pastas falhar (o Claude Code recusar ou não encontrar o caminho), use a cópia espelho em `../docs/DVP_Agiliza_Delivery_latest_version.md` — ela pode estar desatualizada; se for usada, isso vai no relatório. Se nem a cópia ajudar, peça ao Eduardo para anexar a pasta `ADS_EduardoCamargo_AgilizaDelivery` nesta mesma sessão.
5. Se a tarefa toca dados da API, confira os DTOs **atuais** do backend (somente leitura), em `../../ADS_EduardoCamargo_AgilizaDelivery/agilizadelivery/src/main/java/br/com/agilizadelivery/dto/`, porque o backend evolui em paralelo e a seção 6 deste arquivo pode estar defasada.
6. Se não houver tarefa `PENDENTE` **e** o Eduardo não estiver pedindo nada diretamente nesta sessão, **não faça nada**: diga que está aguardando delegação. Se o Eduardo pedir algo direto na conversa, vale a Constituição 1.2 — não é preciso que exista um arquivo de tarefa para isso.

---

## 1. O produto em uma página

O Agiliza Delivery é uma plataforma **multi-tenant** de logística para restaurantes com frota própria de entregadores ("motoboys"). Ela substitui a planilha de acerto e a digitação manual de pedidos.

- **Backend:** Java 21 + Spring Boot 4, PostgreSQL 16, API REST, autenticação JWT e WebSocket STOMP. É mantido por outro agente (Claude CLI), em sessão separada — ver seção 3.4 sobre como se comunicar com ele.
- **App do entregador:** Flutter, Android. Fica fora deste repositório.
- **Backoffice Web (você):** SPA React com o mapa de despacho, o monitoramento da frota, o acerto financeiro e o cadastro da loja e dos restaurantes.

**Fluxo central:**
1. O pedido chega do iFood ou do simulador e vira uma ENTREGA `AGUARDANDO_DESPACHO`.
2. O pino aparece no mapa.
3. O operador marca o pedido como pronto, seleciona de 1 a N entregas e escolhe um entregador `ONLINE`.
4. Ao despachar, o sistema cria um LOTE `DESPACHADO`.
5. O entregador sai (`EM_ROTA`) e registra `ENTREGUE`, `FALHA` ou `CANCELADA`.
6. O repasse é calculado **por entrega** conforme a faixa de distância.
7. No acerto, o operador gera o RECIBO, paga via PIX fora do sistema e marca o recibo como `PAGO`.
8. No fim do dia, o operador fecha o CAIXA, e o período fica imutável.

---

## 2. Papéis

| Papel | Quem | O que faz |
| --- | --- | --- |
| **Eduardo** | Dono do projeto | Decide escopo e prioridade; pode falar direto com você nesta sessão (Constituição 1.2) |
| **Orquestrador** | Claude (sessão principal do Eduardo, em claude.ai) | Lê os docs, quebra o trabalho em tarefas, escreve em `../tarefas/`, revisa os relatórios e repassa sugestões ao agente do backend quando necessário |
| **Agente React** | Você | Executa as tarefas de `../tarefas/`, reporta em `../relatorios/` e registra sugestões/pendências em `../sugestoes-backend/` |
| **Agente Backend** | Claude CLI no repositório Java, em outra sessão | Implementa a API. Não há canal ao vivo entre vocês (Constituição 3.3) |

---

## 3. Protocolo de delegação

### 3.1 Estrutura do repositório

```
agiliza_react/                              ← raiz do projeto (aqui fica o código React)
├── CLAUDE.md                               ← ponto de entrada; importa agent/CONSTITUTION.md e agent/AGENT.md
├── agent/
│   ├── CONSTITUTION.md                     ← regras inegociáveis
│   └── AGENT.md                            ← este arquivo
├── docs/
│   └── DVP_Agiliza_Delivery_latest_version.md   ← cópia espelho, só leitura (ver seção 0, passo 4)
├── tarefas/                                ← o Orquestrador escreve; você só altera o campo "Status"
│   ├── _TEMPLATE.md
│   └── T001-setup-projeto.md
├── relatorios/                             ← você escreve; um relatório por tarefa
│   └── _TEMPLATE.md
├── sugestoes-backend/                      ← você escreve quando precisa de algo do backend ou acha algo errado nele
│   └── _TEMPLATE.md
├── .claude/skills/                         ← 19 skills instaladas
└── src/, package.json, vite.config.ts, ... ← o código React (a partir da T001; ver seção 5)
```

### 3.2 Ciclo de uma tarefa

1. Escolha a tarefa `PENDENTE` de menor número cujas dependências estejam `CONCLUIDA`, em `../tarefas/`.
2. Crie (ou retome, se a tarefa já estava `PARCIAL`) a branch `feature/T0xx-slug` a partir da ponta atual de `develop` — seção 3.5 tem o passo a passo de git.
3. Mude o status dela para `EM_ANDAMENTO`.
4. Execute **somente** o que está em "Escopo" e respeite "Fora do escopo", comitando o progresso na branch da tarefa.
5. Rode a verificação da seção 11.
6. Escreva `../relatorios/<mesmo-nome>.md` seguindo o `_TEMPLATE.md`.
7. Se tudo passou: dê merge `--no-ff` da branch para `develop`, apague a branch local, e só então mude o status da tarefa para `CONCLUIDA`. Se não passou, ou falta decisão: mude para `BLOQUEADA` ou `PARCIAL` e deixe o trabalho comitado na branch, **sem** merge.
8. Pare e aguarde. Não emende a tarefa seguinte, a menos que a própria tarefa diga "seguir para T0xx", ou o Eduardo peça direto nesta sessão.

### 3.3 Quando bloquear uma tarefa (`BLOQUEADA`)

Marque `BLOQUEADA` e explique no relatório quando:
- a tarefa contradiz a Constituição ou o DVP;
- uma regra de negócio não está definida e nenhuma leitura a mais do DVP resolve (não invente);
- a instalação de pacotes falha (Constituição 8.2);
- a própria tarefa proíbe usar mock e, sem o endpoint real, não há como entregar nada verificável.

**Não bloqueia** por simples ausência de endpoint do backend: por padrão, toda tarefa de tela/funcionalidade autoriza mockar via MSW o que ainda não existe (Constituição 9.2) — não é preciso que a tarefa diga isso explicitamente. Nesse caso, você registra uma sugestão/pendência em `../sugestoes-backend/` (seção 3.4) e **continua** com o mock.

### 3.4 Sugestões e pendências para o agente do backend

Use `../sugestoes-backend/_TEMPLATE.md` como modelo. Crie um arquivo `S0xx-titulo-curto.md` sempre que:
- faltar um endpoint, campo ou tópico de WebSocket que você precisa (**Tipo: PENDÊNCIA**);
- você notar que o DVP e o código do backend dizem coisas diferentes (**Tipo: DIVERGÊNCIA** — Constituição 2.2);
- você tiver uma ideia de melhoria no contrato, sem que nada esteja travando por causa disso (**Tipo: MELHORIA**).

Preencha: contexto, o que foi encontrado (citando o trecho do DVP e/ou do código), sua sugestão, e o que você está fazendo nesse meio-tempo (normalmente: seguindo o mock ou o contrato atual). Deixe o `Status` como `SEM-RESPOSTA`. Não espere resposta para continuar a tarefa. No relatório da tarefa, liste os arquivos de sugestão criados ou atualizados.

**Limite real:** não há garantia de que o agente do backend vá ler essa pasta — hoje, o jeito confiável de a sugestão chegar até ele é o Orquestrador relatar manualmente. Não assuma aceite (Constituição 9.3): só trate como aceita se o `Status` do arquivo virar `ACEITA`.

**No sentido contrário:** o agente do backend tem sua própria pasta de sugestões, em `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/` (fora deste repositório). Quando o `AGENT.md` (seção 0) ou o Orquestrador pedir, leia esses arquivos por `Status: SEM-RESPOSTA` e responda — como única exceção à fronteira do Artigo 3.2 da Constituição — editando só os campos `Status` e `Resposta do agente front`, nunca mais nada naquele arquivo ou pasta. Isso não é um passo obrigatório de todo ciclo de tarefa; é feito quando sinalizado.

### 3.5 Fluxo de git por tarefa

- **Branch:** `feature/T0xx-slug` — o slug é o nome do arquivo da tarefa sem o `T0xx-` e sem `.md` (ex.: a tarefa `T001-setup-projeto.md` vira a branch `feature/T001-setup-projeto`). Sempre a partir da ponta atual de `develop`:
  ```
  git checkout develop
  git checkout -b feature/T0xx-slug
  ```
- **Durante a tarefa:** comite livremente na própria branch. Mensagem curta, em português, no formato `T0xx: o que foi feito` (ex.: `T001: configura Vite, TypeScript strict e shared/api`). Se a sua sessão trouxer uma convenção própria de atribuição de commit (por exemplo, uma linha `Co-Authored-By`), siga-a — esta Constituição não define uma atribuição própria, então não invente uma.
- **Ao concluir (status `CONCLUIDA`):**
  ```
  git checkout develop
  git merge --no-ff feature/T0xx-slug
  git branch -d feature/T0xx-slug
  ```
  O merge para `develop` é a **última** ação antes de marcar a tarefa como `CONCLUIDA` — nunca antes de rodar a verificação da seção 11.
- **Se a tarefa ficar `PARCIAL` ou `BLOQUEADA`:** não dê merge. O trabalho continua comitado na própria branch; ela é retomada (não recriada) na próxima vez que alguém trabalhar nessa tarefa.
- **`main` é intocável:** nunca `git checkout main`, nunca commit, merge ou push nela. Essa passagem — de `develop` para `main` — é sempre o Eduardo quem faz, fora desta sessão.
- **`git push`:** só com pedido explícito da tarefa ou do Eduardo nesta sessão (Constituição, Artigo 3.4). Até lá, todo o histórico fica local.
- **Primeira vez, sem repositório ainda:** é a T001 que inicializa o git, cria o commit inicial em `main` com o que já existe (governança + skills) e cria `develop` a partir dele — ver essa tarefa.

---

## 4. Pilha técnica (fixa)

| Camada | Escolha | Observação |
| --- | --- | --- |
| Build | **Vite** + **React 18** + **TypeScript** (`strict`) | O DVP fixa o React 18.x |
| Roteamento | **React Router 6** | Rotas protegidas por perfil |
| Dados do servidor | **TanStack Query 5** | Todo GET passa por ele; as mutações invalidam as chaves |
| Estado do cliente | **Zustand** | Sessão (token em memória), seleção de entregas no mapa, preferências de UI |
| Validação | **Zod** | Respostas da API e formulários |
| Formulários | **React Hook Form** + `@hookform/resolvers/zod` | |
| UI | **Tailwind CSS** + **shadcn/ui** | Tabelas, diálogos, toasts e formulários |
| Mapa | **Leaflet** + **react-leaflet 4** + **OpenStreetMap** | Sem chave de API (DVP 1.5.2) |
| Tempo real | **@stomp/stompjs** | Backend Spring WebSocket/STOMP (RNF06) |
| HTTP | `fetch` encapsulado em um cliente único | Sem axios, salvo tarefa contrária |
| Mocks | **MSW** | Enquanto os endpoints não existirem (ver seção 3.3) |
| Testes | **Vitest** + **Testing Library**; **Playwright** para E2E | |
| Datas | **date-fns** + `date-fns-tz` | Fuso `America/Sao_Paulo` |

---

## 5. Arquitetura de pastas do código React

Dentro de `src/`, na raiz do projeto, organização por **módulo de funcionalidade** (skill `frontend-architecture`):

```
src/
├── app/                 # bootstrap: providers, router, layout, guardas de perfil
├── shared/
│   ├── api/
│   │   ├── client.ts        # ÚNICO ponto de fetch: base URL, JWT, parse de erro
│   │   ├── endpoints.ts     # TODOS os caminhos de API, marcados PROVISÓRIO quando for o caso
│   │   ├── erros.ts         # ApiErrorResponse → ErroApi normalizado
│   │   └── schemas/         # schemas Zod espelhando os DTOs do backend
│   ├── realtime/            # cliente STOMP único + hooks de inscrição
│   ├── dominio/             # enums, labels pt-BR, máquina de estados (transições permitidas)
│   ├── formatacao/          # moeda (com placeholder "—" para null), km, data/hora
│   └── ui/                  # componentes shadcn e componentes genéricos
├── features/
│   ├── auth/                # UC07 – login, sessão, logout
│   ├── despacho/            # UC01 – mapa de pendentes, lista de revisão, entrega avulsa, despacho, devolução
│   ├── monitoramento/        # UC04 – mapa da frota em tempo real
│   ├── acerto/              # UC03 – extrato, ajuste, recibo, pagamento, cancelamento
│   ├── caixa/               # UC03 – abrir, fechar, reabrir
│   ├── loja/                # UC05 – entregadores, faixas de preço, parâmetros, integração
│   ├── integracao/          # RNF04 – alerta de integração degradada, fila de falhas
│   └── restaurantes/        # UC06 – CRUD de estabelecimentos (ADMIN_GERAL)
└── test/                # setup do Vitest, handlers MSW, fábricas de dados
```

Cada `features/<x>/` contém `api/` (hooks do TanStack Query), `componentes/`, `paginas/` e `index.ts` (API pública do módulo). Um módulo **não importa** os internos de outro: só o `index.ts` dele ou `shared/`.

---

## 6. Contrato com o backend

> ⚠️ **Situação:** o backend tem entidades, DTOs e services, mas **ainda não tem controllers REST, Spring Security ponta a ponta nem WebSocket**. O inventário vivo (o que existe, o que falta, achados de divergência) é mantido pelo agente Backend no `AGENT.md` dele, seção 5 — não aqui, para não ter duas versões do mesmo estado podendo divergir. Os endpoints e tópicos abaixo são uma **proposta provisória**. Centralize-os em `shared/api/endpoints.ts` e use MSW até o Orquestrador confirmar os caminhos reais.

### 6.1 Enums (valores exatos, nenhum outro admitido)

| Enum | Valores |
| --- | --- |
| PerfilUsuario | `ADMIN_GERAL`, `ADMIN_RESTAURANTE`, `OPERADOR`, `ENTREGADOR` |
| StatusEntrega | `AGUARDANDO_DESPACHO`, `DESPACHADA`, `EM_ROTA`, `ENTREGUE`, `FALHA`, `CANCELADA` |
| StatusLote | `DESPACHADO`, `EM_ROTA`, `CONCLUIDO`, `CANCELADO` |
| StatusRecibo | `GERADO`, `PAGO`, `CANCELADO` |
| StatusCaixa | `ABERTO`, `FECHADO`, `REABERTO` |
| StatusDisponibilidadeMotoboy | `OFFLINE`, `ONLINE`, `EM_ROTA` |
| StatusCadastroMotoboy | `ATIVO`, `BLOQUEADO` |
| StatusEstabelecimento | `ATIVO`, `INATIVO` |
| MotivoRevisao | `SEM_COORDENADA`, `SEM_DISTANCIA`, `CONTESTACAO_ENTREGADOR` |
| FormaPagamento | `DINHEIRO`, `CREDITO`, `DEBITO`, `PIX`, `VALE` |
| Provedor | texto (`VARCHAR(20)`), não enum; valores hoje aceitos: `IFOOD`, `SIMULADOR` |
| StatusFalhaIntegracao | `PENDENTE`, `REPROCESSADA`, `DESCARTADA` |
| EtapaFalhaIntegracao | `AUTENTICACAO`, `CONSULTA`, `CONFIRMACAO`, `GEOCODIFICACAO`, `PERSISTENCIA` |
| SituacaoAcerto | `A_ACERTAR`, `CONSOLIDADA`, `EM_REVISAO` (confirmado em 10/11/2026, ver 6.3 `LinhaExtratoResponse`) |

### 6.2 Máquina de estados da ENTREGA (DVP 1.4.4): ações que a UI pode oferecer

| Status atual | Ações no backoffice |
| --- | --- |
| AGUARDANDO_DESPACHO | marcar pronto, ajustar pino, incluir em lote, cancelar |
| DESPACHADA | devolver lote (o lote inteiro volta), cancelar |
| EM_ROTA | cancelar (o repasse é integral; o app alerta o entregador) |
| ENTREGUE / FALHA / CANCELADA | estado final: só o ajuste de repasse do Artigo 5.2 da Constituição |

### 6.3 DTOs de resposta (campos em camelCase, como o Jackson serializa)

- **CoordenadaDto**: `latitude`, `longitude` (BigDecimal → `number`)
- **EntregaResponse**: `id`, `estabelecimentoId`, `pedidoExternoId?`, `loteId?`, `faixaPrecoId?`, `reciboId?`, `nomeCliente`, `telefoneCliente?`, `enderecoCompleto`, `bairro?`, `cep?`, `complemento?`, `pontoReferencia?`, `coordenada?`, `valorPedido?`, `formaPagamento?`, `pagoOnline`, `trocoPara?`, `observacoes?`, `distanciaKm?`, `valorRepasse?`, `status`, `motivoFalha?`, `pendenteRevisao`, `motivoRevisao?`, `prontoParaDespachoEm?`, `despachadaEm?`, `finalizadaEm?`, `ordemRota?` (**fora do escopo — ver 6.4**), `criadoEm`, `atualizadoEm?`
- **LoteEntregaResponse**: `id`, `estabelecimentoId`, `motoboyId`, `usuarioDespachanteId`, `status`, `qtdEntregas`, `valorTotalRepasse?`, `despachadoEm?`, `concluidoEm?`, `criadoEm`, `atualizadoEm?`
- **MotoboyResponse**: `id`, `usuarioId`, `nome`, `telefone`, `placaVeiculo?`, `statusCadastro`, `statusDisponibilidade`, `ultimaPosicao?`, `ultimaPosicaoEm?`, `criadoEm`, `atualizadoEm?` (o CPF **não** vem)
- **ReciboResponse**: `id`, `estabelecimentoId`, `caixaId`, `motoboyId`, `usuarioGeradorId`, `dataReferencia`, `periodoInicio`, `periodoFim`, `qtdEntregas`, `valorTotal`, `status`, `pagoEm?`, `criadoEm`, `atualizadoEm?`
- **CaixaResponse**: `id`, `estabelecimentoId`, `dataReferencia`, `abertoEm`, `fechadoEm?`, `usuarioFechamentoId?`, `status`, `qtdRecibos?`, `valorTotal?`, `reabertoEm?`, `usuarioReaberturaId?`, `motivoReabertura?`, `criadoEm`, `atualizadoEm?`
- **DistanciaPrecoResponse**: `id`, `estabelecimentoId`, `deKm`, `ateKm`, `valorPago`, `ativo`, `vigenteDesde`, `criadoEm`, `atualizadoEm?`
- **EstabelecimentoResponse**: `id`, `razaoSocial`, `nomeFantasia`, `cnpj`, `telefone?`, `enderecoCompleto`, `coordenada`, `status`, `maxPedidosPorLote`, `valorRepasseForaDeArea?`, `criadoEm`, `atualizadoEm?`
- **UsuarioResponse**: `id`, `estabelecimentoId?`, `nome`, `loginEmail`, `perfil`, `ativo`, `ultimoAcessoEm?`, `criadoEm`, `atualizadoEm?`
- **EntregaAjusteValorResponse**: `id`, `entregaId`, `usuarioId`, `valorAnterior`, `valorNovo`, `motivo`, `ajustadoEm`
- **EntregaStatusHistoricoResponse**: `id`, `entregaId`, `statusAnterior?`, `statusNovo`, `registradoPorUsuarioId?`, `coordenada?`, `registradoEm`
- **PedidoExternoResponse**: inclui `itens: ItemPedidoResponse[]` (`descricao`, `quantidade`, `valorUnitario?`, `observacao?`)
- **ConfiguracaoIntegracaoResponse**: `id`, `estabelecimentoId`, `provedor`, `merchantId`, `ativo`, `ultimoPollingEm?`
- **FalhaIntegracaoResponse**: `id`, `configuracaoIntegracaoId`, `idExterno?`, `etapa`, `tentativas`, `status`, `ocorridoEm`, `resolvidoEm?`
- **UsuarioAutenticadoResponse** (confirmado em 10/11/2026 — este é o shape real do usuário autenticado, diferente de `UsuarioResponse`): `usuarioId`, `estabelecimentoId` (nulo para `ADMIN_GERAL`), `motoboyId` (só preenchido para `ENTREGADOR`), `nome`, `perfil`. Ver nota em 6.7 — o login provavelmente devolve este DTO, não `UsuarioResponse`.
- **ExtratoAcertoResponse** (confirmado em 10/11/2026 — responde ao antigo item 12.5): `motoboyId`, `nomeEntregador`, `periodoInicio`, `periodoFim`, `linhas: LinhaExtratoResponse[]`, `totalDevido`, `totalConsolidado`, `totalEmRevisao`, `possuiValorIndefinido`. É este DTO que dá o total oficial do extrato antes de gerar o recibo (Constituição 5.1) — usar em 8.4 em vez de somar no cliente.
- **LinhaExtratoResponse**: `entregaId`, `nomeCliente`, `finalizadaEm`, `status`, `distanciaKm`, `faixaDeKm`, `faixaAteKm`, `foraDeArea`, `valorRepasse`, `situacao` (`SituacaoAcerto`), `reciboId?`

Nos schemas Zod, os campos marcados com `?` são `.nullable().optional()` — aceita tanto o campo vir ausente quanto vir `null`, já que não há garantia de que todo DTO de resposta tenha a mesma anotação Jackson de omissão que `ApiErrorResponse` tem.

### 6.4 DTOs de requisição

| Request | Campos |
| --- | --- |
| LoginRequest | `loginEmail`, `senha` |
| CriarEntregaAvulsaRequest | `nomeCliente`, `telefoneCliente`, `enderecoCompleto`, `bairro`, `cep`, `complemento`, `pontoReferencia`, `coordenada`, `valorPedido`, `formaPagamento`, `pagoOnline`, `trocoPara`, `observacoes` |
| DespacharLoteRequest | `motoboyId`, `entregaIds[]` |
| AlterarStatusEntregaRequest | `status`, `motivoFalha`, `coordenada`, `ocorridoEm` |
| AjustarRepasseRequest | `valorNovo`, `motivo` |
| GerarReciboRequest | `motoboyId`, `periodoInicio`, `periodoFim` (**sem lista de entregas** — ver seção 8.4) |
| CancelarReciboRequest | `motivo` |
| AbrirCaixaRequest | `dataReferencia` |
| ReabrirCaixaRequest | `motivo` |
| SalvarDistanciaPrecoRequest | `deKm`, `ateKm`, `valorPago`, `vigenteDesde` |
| CriarMotoboyRequest | `nome`, `loginEmail`, `senha`, `cpf`, `telefone`, `placaVeiculo` |
| CriarUsuarioRequest | `nome`, `loginEmail`, `senha`, `perfil` |
| CriarEstabelecimentoRequest | `razaoSocial`, `nomeFantasia`, `cnpj`, `telefone`, `enderecoCompleto`, `coordenada`, `maxPedidosPorLote`, `valorRepasseForaDeArea` — **atenção:** existe no backend um `AdministradorInicialRequest` (`nome`, `loginEmail`, `senha`) separado, para o usuário master criado junto com a loja (UC06, HU11). O formulário de cadastro de restaurante (8.7) provavelmente precisa coletar isso também — confirmar com o backend via `sugestoes-backend/` antes de montar a tela, em vez de assumir que só os campos acima bastam. |
| SalvarConfiguracaoIntegracaoRequest | `provedor`, `merchantId` |
| AlterarDisponibilidadeMotoboyRequest | `status` (`StatusDisponibilidadeMotoboy`) — existe no backend; confirmar se o Backoffice usa isso ou se é exclusivo do app do entregador antes de expor uma ação para isso em 8.6 |

**Existem no backend, mas são FORA DO ESCOPO (Constituição 4.2) — não usar sem tarefa explícita:** `RotaLoteResponse`, `ParadaRotaResponse` e o campo `ordemRota` (a ordem em que o operador escolhe as entregas no despacho; `SugerirRotaRequest` e `SugestaoRotaResponse` não existem no backend). Isso é da rota, que não está no MVP além da ordem manual. Se você os encontrar ao ler a pasta de DTOs (seção 0, passo 5), ignore-os.

### 6.5 Formato de erro (todas as respostas de erro)

```ts
type ApiErrorResponse = {
  timestamp: string; status: number; error: string;
  codigo: CodigoErro; message: string; path: string;
  campos?: { campo: string; mensagem: string }[];
};
```

Valores de `codigo`: `ERRO_INTERNO_SERVIDOR`, `CREDENCIAIS_INVALIDAS` (401 do login, UC07 E1), `DADOS_INVALIDOS`, `CORPO_REQUISICAO_INVALIDO`, `PARAMETRO_INVALIDO`, `RECURSO_NAO_ENCONTRADO`, `ESTABELECIMENTO_NAO_ENCONTRADO`, `USUARIO_NAO_ENCONTRADO`, `MOTOBOY_NAO_ENCONTRADO`, `ENTREGA_NAO_ENCONTRADA`, `LOTE_NAO_ENCONTRADO`, `CAIXA_NAO_ENCONTRADO`, `RECIBO_NAO_ENCONTRADO`, `FAIXA_PRECO_NAO_ENCONTRADA`, `REGRA_NEGOCIO_VIOLADA`, `TRANSICAO_ESTADO_INVALIDA`, `CAIXA_FECHADO`, `LIMITE_LOTE_EXCEDIDO`, `MOTOBOY_INDISPONIVEL`, `ENTREGA_INAPTA_LOTE`, `ENTREGA_INAPTA_RECIBO`, `RECIBO_INALTERAVEL`, `FAIXA_PRECO_INVALIDA`, `AJUSTE_VALOR_NAO_PERMITIDO`, `DADO_DUPLICADO`, `CNPJ_JA_CADASTRADO`, `CPF_JA_CADASTRADO`, `EMAIL_JA_CADASTRADO`, `CAIXA_JA_ABERTO`, `PEDIDO_JA_IMPORTADO`, `ACESSO_NEGADO`, `ESTABELECIMENTO_INATIVO`, `USUARIO_BLOQUEADO`, `VIOLACAO_MULTITENANT`, `INTEGRACAO_EXTERNA_ERRO`.

Mapeie cada código para uma mensagem pt-BR em `shared/api/erros.ts`. Código desconhecido cai na `message` do servidor.

### 6.6 Convenções de dados

- **Dinheiro:** chega como `number` (BigDecimal). Exiba-o formatado; **não recalcule totais oficiais** (Constituição, Artigo 5.1); valor `null` exibe "—", nunca `R$ 0,00`. Para enviar, use no máximo 2 casas decimais.
- **Datas — recebendo:** `LocalDateTime` chega **sem fuso**, por exemplo `"2026-11-09T21:30:00"`. Interprete sempre como horário de `America/Sao_Paulo`. `LocalDate` chega como `"2026-11-09"`.
- **Datas — enviando:** mande sempre **sem indicador de fuso** (sem `Z`, sem offset `+00:00`), já convertido para o horário de São Paulo, no mesmo formato que você recebe (`"2026-11-09T21:30:00"` para `LocalDateTime`, `"2026-11-09"` para `LocalDate`). O desserializador padrão do Spring para `LocalDateTime`/`LocalDate` rejeita ou interpreta errado uma string com `Z` ou offset.
- **IDs:** UUID como `string`, exceto `Long` (histórico, ajuste, falha), que é `number`.
- **Autenticação:** cabeçalho `Authorization: Bearer <jwt>`. O token carrega o id do usuário, o perfil e o estabelecimento (UC07, passo 5).

### 6.7 Endpoints — PROVISÓRIO (aguardando os controllers)

| Uso | Método e caminho proposto |
| --- | --- |
| Login | `POST /api/auth/login` → `{ token, usuario: UsuarioAutenticadoResponse }` (não `UsuarioResponse` — ver 6.3; ainda não há controller para confirmar o shape exato da resposta, isso é a proposta mais provável) |
| Entregas pendentes / revisão | `GET /api/entregas?status=AGUARDANDO_DESPACHO`, `GET /api/entregas?pendenteRevisao=true` |
| Entrega avulsa | `POST /api/entregas` |
| Marcar pronto | `POST /api/entregas/{id}/pronto` |
| Ajustar pino | `PATCH /api/entregas/{id}/coordenada` |
| Cancelar entrega | `POST /api/entregas/{id}/cancelar` |
| Ajustar repasse | `POST /api/entregas/{id}/ajustes` |
| Despachar | `POST /api/lotes` |
| Devolver lote | `POST /api/lotes/{id}/devolver` |
| Entregadores | `GET/POST /api/motoboys`, `PATCH /api/motoboys/{id}/bloquear`, `/desbloquear` |
| Extrato do acerto | `GET /api/acertos?motoboyId=&inicio=&fim=` |
| Recibos | `POST /api/recibos`, `POST /api/recibos/{id}/pagar`, `POST /api/recibos/{id}/cancelar` |
| Caixa | `GET /api/caixas/atual`, `POST /api/caixas`, `POST /api/caixas/{id}/fechar`, `POST /api/caixas/{id}/reabrir` |
| Faixas de preço | `GET /api/faixas-preco`, `PUT /api/faixas-preco` (grava a tabela inteira numa transação; DVP 1.5.4) |
| Loja | `GET/PATCH /api/estabelecimento` |
| Integração | `GET/PUT /api/integracoes`, `GET /api/falhas-integracao?status=PENDENTE` |
| Restaurantes (ADMIN_GERAL) | `GET/POST /api/estabelecimentos`, `PATCH /api/estabelecimentos/{id}/status` |

### 6.8 Tempo real — PROVISÓRIO

- Conexão STOMP em `/ws`, com o JWT no header `Authorization` do frame CONNECT.
- Tópicos propostos, sempre escopados pelo estabelecimento do token:
  - `/topic/estabelecimento/{id}/entregas`: nova entrega e mudança de status
  - `/topic/estabelecimento/{id}/frota`: posição e disponibilidade dos entregadores
  - `/topic/estabelecimento/{id}/integracao`: alerta de integração degradada
- Ao receber um evento, **invalide ou atualize o cache do TanStack Query**; não mantenha uma segunda fonte de verdade.
- Reconexão automática com recuo. Enquanto desconectado, exiba um indicador "tempo real offline" e use polling de fallback a cada 15 s.

---

## 7. Perfis, rotas e guardas

| Perfil | Telas |
| --- | --- |
| `ADMIN_GERAL` | `/restaurantes` (lista, cadastro, ativar/inativar) |
| `ADMIN_RESTAURANTE` | `/loja/entregadores`, `/loja/faixas-preco`, `/loja/parametros`, `/loja/integracao`, **e também todas as telas do `OPERADOR`** (`/despacho`, `/monitoramento`, `/acerto`, `/caixa`), com "Reabrir caixa" em `/caixa` (só ele) |
| `OPERADOR` | `/despacho`, `/monitoramento`, `/acerto`, `/caixa` |
| `ENTREGADOR` | **nenhuma**: o login é recusado no backoffice com uma mensagem própria (UC07, E4) |

O `ADMIN_RESTAURANTE` **acessa também as telas do operador**, por decisão do Eduardo em 10/11/2026 (D004; o DVP é silente neste ponto). "Reabrir caixa" continua exclusivo dele. O `OPERADOR` não acessa as telas `/loja/*`. Se um ponto de permissão novo surgir sem regra clara, o padrão continua sendo o mais restritivo (Constituição 1.3).

Depois do login, redirecione para `/inicio`, a página inicial com atalhos para as telas do perfil. A exceção é quando havia um destino guardado que o perfil pode abrir: aí o usuário volta para ele. Decisão do Eduardo em 17/11/2026, D011, aplicada na T008. A rota sem permissão vai para `/acesso-negado`.

---

## 8. Telas e regras de cada uma

### 8.1 Login (UC07, HU13) — fica para a F7
Até lá, as telas usam a sessão provisória de desenvolvimento (seção 10, F1). Não construir esta tela antes de uma tarefa da F7.
- E-mail e senha. Erro sempre genérico: "E-mail ou senha inválidos".
- Para `ESTABELECIMENTO_INATIVO`, mostre "O acesso desta loja está suspenso". Para `USUARIO_BLOQUEADO`, mostre "Usuário sem acesso".
- O token fica em memória (Zustand). O logout limpa a sessão e o `queryClient.clear()`.

### 8.2 Despacho (UC01, HU01–HU03): a tela mais importante
- **Mapa** (Leaflet) com a loja e um pino para cada entrega `AGUARDANDO_DESPACHO` com coordenada.
- **Lista de revisão** ao lado: entregas com `pendenteRevisao = true`, com o motivo legível. `SEM_COORDENADA` permite arrastar ou definir o pino (R04); a distância é recalculada pelo backend.
- Cada entrega mostra: número ou nome do cliente, bairro, distância, repasse provisório (ou "—" se `valorRepasse` for `null` — Constituição 5.1), forma de pagamento, se é pago online ou se há troco a levar, e tempo de espera desde `prontoParaDespachoEm`.
- Botão **"Marcar pronto"**, que grava `prontoParaDespachoEm`. É possível despachar sem marcar (UC01, A5).
- **Seleção múltipla** (clique no pino ou na lista) limitada a `maxPedidosPorLote`. Ao estourar o limite, bloqueie e explique (E2).
- **Despachar:** abre um diálogo com os entregadores `ONLINE` e `ATIVO`. Sem nenhum, o botão fica desabilitado com o aviso "Nenhum entregador online" (E1).
- **Lotes despachados** ainda não saíram: oferecem "Devolver lote" (A4).
- **Entrega avulsa:** formulário de `CriarEntregaAvulsaRequest` (A2).
- **Alerta de integração degradada** quando houver falhas `PENDENTE` (A3, RNF04).
- Atualização via WebSocket em até 5 s (RNF06).

### 8.3 Monitoramento (UC04, HU08)
- Mapa com cada entregador `ONLINE` ou `EM_ROTA` na `ultimaPosicao`, identificado pelo nome e colorido pela disponibilidade (com legenda; a cor não pode ser o único indicador).
- Entregador **sem posição há mais de 3 minutos**: ícone de alerta com o horário da última posição (A1).
- Só consulta: nenhuma ação altera estado.

### 8.4 Acerto (UC03, HU06, HU07)
- Filtro por entregador e período. A tabela mostra as entregas em estado final com distância, faixa aplicada, valor e status do recibo.
- Entregas `pendenteRevisao` aparecem destacadas e **fora do total**. As do tipo `CONTESTACAO_ENTREGADOR` têm uma ação para analisar a contestação.
- **Ajustar repasse:** só com `reciboId === null` e caixa aberto. O diálogo pede o valor novo e o motivo (obrigatório) e mostra o histórico de ajustes.
- Entrega já em recibo: no lugar do ajuste, mostre "Esta entrega está no recibo #… — cancele o recibo para corrigir".
- **Gerar recibo:** o operador **não** escolhe entregas uma a uma — `GerarReciboRequest` só leva `motoboyId` e o período; o backend calcula automaticamente quais entregas entram (as em estado final, sem revisão pendente e ainda não vinculadas a outro recibo). A tela mostra, antes de confirmar, o que **será** incluído e o total, usando o endpoint de extrato (6.7; se ele não existir ainda, ver item 12.5) — nunca um total somado no cliente. A entrega já vinculada a outro recibo é excluída dessa lista e informa o recibo anterior (E1).
- **Marcar como pago** (GERADO → PAGO). **Cancelar recibo** (GERADO ou PAGO → CANCELADO) com motivo, só com o caixa aberto.

### 8.5 Caixa (UC03, A3)
- Mostra o caixa do dia e o status. Ações: abrir, fechar (com confirmação forte, porque torna o período imutável) e reabrir (só `ADMIN_RESTAURANTE`, com motivo).
- Com o caixa `FECHADO`, todas as telas de acerto ficam em modo somente leitura.

### 8.6 Loja (UC05, HU09, HU10)
- **Entregadores:** lista, cadastro (`CriarMotoboyRequest`, com o CPF mascarado na digitação e nunca reexibido), bloquear e desbloquear.
- **Faixas de preço:** a tabela é editada inteira e enviada de uma vez. Valide no cliente: começa em 0, é contígua, sem sobreposição, `ateKm > deKm`, `valorPago > 0`. Mostre o aviso "alterações valem para entregas ainda não finalizadas" (HU10).
- **Parâmetros:** `maxPedidosPorLote` e `valorRepasseForaDeArea`. Se este estiver vazio, exiba um alerta (DVP 1.5.5, passo 3).
- **Integração:** provedor e `merchantId`, liga/desliga, `ultimoPollingEm`.

### 8.7 Restaurantes (UC06, HU11, HU12)
- CRUD com CNPJ (só dígitos, validação de formato) e ação de ativar/inativar com confirmação.

---

## 9. Skills instaladas (`../.claude/skills/`): quando usar cada uma

| Situação | Skill |
| --- | --- |
| Estrutura de pastas e fronteira entre módulos | `frontend-architecture` |
| Componentes, hooks, composição | `react-patterns`, `react-ui-patterns` |
| Tipagem avançada, configuração do TS | `typescript-expert` |
| Cliente HTTP único, parse com Zod, erro normalizado | `frontend-data-contracts` (**base da pasta `shared/api/`**) |
| Cancelamento, retry, debounce, condições de corrida | `frontend-api-integration-patterns` |
| Queries, chaves, invalidação | `tanstack-query-expert` (ignore a parte de Next.js) |
| Escritas e idempotência (dinheiro) | `frontend-optimistic-mutations`, seções 3, 5 e 6. **Nada de otimismo em dinheiro** |
| Estado do cliente | `react-state-management`, `zustand-store-ts` |
| Schemas e formulários | `zod-validation-expert` |
| Carregando, vazio, erro, sucesso | `ui-states` |
| Componentes visuais | `shadcn`, `tailwind-patterns` |
| JWT, guardas, sessão | `auth-implementation-patterns` |
| XSS, sanitização | `frontend-security-coder` |
| Isolamento por loja | `saas-multi-tenant` (a parte de cliente) |
| Testes unitários e de componente | `vitest-skill` |
| E2E | `playwright-skill` |

As skills orientam a técnica. Elas **nunca** mudam escopo, pilha ou regra de negócio. Se uma skill sugerir Next.js, Server Components, MUI, axios ou Redux, ignore e siga a seção 4.

Não há skill de Leaflet nem de STOMP: siga a documentação oficial dessas bibliotecas.

---

## 10. Plano de fases (referência para o Orquestrador)

O prazo final é **17/11/2026**. O Orquestrador quebra cada fase em tarefas `T0xx`.

| Fase | Conteúdo | DVP |
| --- | --- | --- |
| F0 | Setup: Vite, TS strict, Tailwind, shadcn, ESLint, Vitest, MSW, estrutura de pastas, `shared/api` e `shared/dominio` | 2.2 – Entrega 1/4 |
| F1 | Casca do app: layout, navegação por perfil, guardas de rota e **sessão provisória de desenvolvimento** (seletor de perfil e estabelecimento, só em dev/mocks). **Sem tela de login** | UC07 (guardas) |
| F2 | Lista de entregas pendentes e de revisão, entrega avulsa | Entrega 4, UC01 |
| F3 | Mapa de despacho, seleção, despacho, devolução, WebSocket | Entrega 6, UC01 |
| F4 | Monitoramento da frota | Entrega 6/7, UC04 |
| F5 | Acerto, recibo, caixa | Entrega 8, UC03 |
| F6 | Loja (entregadores, faixas, parâmetros, integração) e Restaurantes | UC05, UC06 |
| F7 | **Login real e sessão real** (UC07, HU13, depende da T004 do backend), E2E dos fluxos principais e ajustes contra a API real | UC07, Entrega 9 |

> Ordem decidida pelo Eduardo em 10/11/2026 (D003): a tela de login fica para o fim; primeiro o corpo da aplicação. Até a F7, a sessão vem de um provedor de desenvolvimento que **não existe no build de produção**.

---

## 11. Definição de pronto

Scripts esperados no `package.json`: `dev`, `build`, `typecheck` (`tsc -b`, pois o projeto usa project references e `--noEmit` não checa nada), `lint`, `test` (`vitest run`), `test:e2e`.

Uma tarefa está **CONCLUIDA** quando:
1. o escopo da tarefa foi entregue e nada além dele;
2. `npm run typecheck`, `npm run lint` e `npm run test` passam (anexe a saída resumida ao relatório);
3. os estados carregando, vazio e erro existem nas telas novas;
4. há teste para cada regra de negócio que a tarefa toca (por exemplo: limite do lote, ajuste bloqueado com recibo, caixa fechado em somente leitura, valor nulo mostrando "—");
5. os endpoints e tópicos usados estão em `endpoints.ts`, com `// PROVISÓRIO` quando não confirmados;
6. qualquer sugestão/pendência para o backend está registrada em `../sugestoes-backend/`;
7. o relatório foi escrito em `../relatorios/`.

---

## 12. Pontos em aberto (não decida, registre)

1. **Caminhos reais da API e tópicos STOMP:** aguardam os controllers do backend. Registrar via `../sugestoes-backend/` quando um endpoint concreto fizer falta numa tarefa.
2. ~~O `ADMIN_RESTAURANTE` acessa as telas do operador?~~ Respondido pelo Eduardo em 10/11/2026 (D004): sim, acessa (ver seção 7).
3. ~~A resposta do login traz o usuário junto com o token, ou é preciso um `GET /api/auth/me`?~~ Parcialmente respondido em 10/11/2026: existe `UsuarioAutenticadoResponse` no backend, desenhado exatamente para isso (ver 6.3). Ainda não há controller para confirmar se vem embutido na resposta do login ou por uma rota separada.
4. CORS e a URL base da API em desenvolvimento (proposta: `VITE_API_URL=http://localhost:8080`).
5. ~~Existe endpoint de **extrato do acerto** com total calculado pelo servidor?~~ Respondido em 10/11/2026: existe `ExtratoAcertoResponse` no backend, com `totalDevido`/`totalConsolidado`/`totalEmRevisao` já calculados (ver 6.3). Falta só o controller para expor isso — continue tratando `GET /api/acertos...` como PROVISÓRIO até lá.
6. **O agente do backend lê `../sugestoes-backend/`?** Não há garantia disso hoje (seção 3.4). Enquanto não houver confirmação, trate toda sugestão como possivelmente ignorada e não pare o trabalho esperando resposta.
