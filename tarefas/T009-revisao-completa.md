# T009 — Revisão completa do Backoffice: contrato real, erros, telas e refinamento

**Status:** EM_ANDAMENTO
**Fase:** F7 (refinamento)
**Depende de:** T008 (CONCLUIDA)
**Referências no DVP:** UC01, UC03 a UC07, HU01 a HU13, 1.4.4 (máquina de estados), RNF02 (painel em até 5 s), RNF06 (tempo real)
**Skills indicadas:** ui-states, frontend-data-contracts, frontend-api-integration-patterns, react-ui-patterns, tanstack-query-expert, zod-validation-expert, frontend-security-coder, auth-implementation-patterns, vitest-skill, playwright-skill, shadcn, tailwind-patterns

## Objetivo
Pedido direto do Eduardo (22/11/2026): uma revisão completa do Backoffice, com padrão alto. A T008 mostrou que mocks diferentes da realidade esconderam um bug fatal (o pino do mapa derrubava a página). Esta revisão precisa **provar que cada tela funciona com o contrato real do backend** e deixar a interface no nível de uma apresentação.

## Método (obrigatório)
1. **Inventário:** uma matriz de cada tela e cada endpoint que ela usa, com o schema Zod, o DTO real do backend, os estados tratados e os testes existentes. A matriz vai no relatório.
2. **Achados:** cada um com severidade (CRÍTICO, ALTO, MÉDIO, BAIXO), evidência (`arquivo:linha` e um cenário reproduzível) e a correção ou a justificativa de não corrigir.
3. **Correção:** todos os CRÍTICO e ALTO; os MÉDIO quando forem baratos e seguros; os BAIXO ficam listados.
4. **Teste antes:** toda correção de comportamento vem com um teste que falhava antes dela.
5. **Segunda passada adversarial**, no fim: "como eu quebraria esta tela?". Tente resposta lenta, erro no meio do fluxo, duplo clique, trocar de tela no meio da requisição, campo `null` inesperado, perfil sem permissão.

## Escopo

### A. Contrato real
- [ ] Para cada endpoint de `shared/api/endpoints.ts`, conferir o controller e o DTO **reais** na `develop` do backend (só leitura):
  - o schema Zod deve bater com o DTO: campos, nulabilidade e enums exatos;
  - remover o `// PROVISÓRIO` do que estiver confirmado;
  - o que não existir no backend continua marcado e vai listado no relatório.
- [ ] **Mocks fiéis:**
  - os handlers do MSW e as fábricas de teste devem seguir o formato real das respostas;
  - revise `src/test/setup.ts` e qualquer mock global de biblioteca: nenhum mock pode esconder um comportamento real, como aconteceu com o `Marker` na T008;
  - confira se cada endpoint devolve lista simples ou página.

### B. Tratamento de erros, tela por tela
- [ ] **Os quatro estados** (carregando, vazio, erro e sucesso) em todas as telas: Login, Início, Despacho, Monitoramento, Acerto, Caixa, Loja (parâmetros, faixas e integração), Restaurantes e Acesso negado.
- [ ] **Mapeamento de erros:**
  - `shared/api/erros.ts` cobre todos os códigos do enum real do backend, cada um com mensagem pt-BR;
  - `campos[]` vão para os campos do formulário;
  - 401 leva ao login;
  - 403 leva a Acesso negado;
  - erro de rede ou timeout mostra mensagem e "Tentar novamente";
  - resposta fora do schema vira erro tratado, nunca tela em branco.
- [ ] **Limite de erro** (`LimiteDeErro`, da T008) em volta de cada página e de cada área crítica, como os mapas: nenhuma exceção de renderização derruba o app inteiro.
- [ ] Erros fora do padrão também são tratados, como o 400 padrão do Spring que o backend ainda devolve em alguns casos. A T014 do backend está levando esses erros ao formato `ApiErrorResponse`, mas o front não pode depender disso.

### C. Regras de negócio na interface (Constituição, Artigo 5)
- [ ] Revisar e testar:
  - dinheiro só vindo do backend, e `null` exibido como "—";
  - ajuste, recibo e caixa conforme 5.2 e 5.3;
  - seleção limitada a `maxPedidosPorLote`;
  - despacho só para entregador ONLINE e ATIVO;
  - devolver lote só DESPACHADO;
  - ações oferecidas só conforme a máquina de estados;
  - escritas de dinheiro sem atualização otimista, com o botão bloqueado durante o envio e proteção contra duplo clique.

### D. Tempo real
- [ ] STOMP:
  - reconexão com recuo;
  - indicador "tempo real offline";
  - polling de reserva a cada 15 s;
  - eventos invalidam o cache;
  - nenhuma inscrição vaza ao trocar de tela.

### E. Refinamento
- [ ] **Telas para a apresentação em projetor**, testadas em 1366×768 e 1920×1080: sem rolagem horizontal, e os mapas aproveitando o espaço.
- [ ] Os mapas do Despacho e do Monitoramento **enquadram automaticamente** a loja e todos os pinos. Hoje, no zoom inicial, 3 de 15 entregas ficam fora da área visível.
- [ ] **Textos e formatação:**
  - textos em pt-BR consistentes;
  - moeda, km e data no fuso `America/Sao_Paulo`;
  - aviso de sucesso (toast) nas ações;
  - confirmação forte ao fechar o caixa;
  - diálogos acessíveis.
- [ ] **Acessibilidade** (7.6): rótulos, foco visível, Despacho operável pelo teclado, e cor nunca como único indicador.
- [ ] **Desempenho:**
  - o build avisa que o pacote passa de 500 kB: divida por rota com `React.lazy`, se for seguro;
  - `staleTime` coerente, sem refetch desnecessário.

### F. Segurança
- [ ] Token em memória, cache limpo no logout, nenhum `console.log` com dado sensível, nenhum `dangerouslySetInnerHTML`, e o CPF nunca reexibido.

### G. Testes
- [ ] Hoje o `test:e2e` roda com `--pass-with-no-tests`, sem nenhum teste. Crie **testes E2E com Playwright e MSW** para os fluxos principais:
  - login → início → despacho com seleção e despacho;
  - acerto → gerar recibo → pagar;
  - fechar o caixa;
  - acesso negado por perfil.

### H. Sugestões do backend
- [ ] Leia `../../ADS_EduardoCamargo_AgilizaDelivery/agente_backend/sugestoes-frontend/` e responda as que estão `SEM-RESPOSTA`: S001, S005, S010, S011 e S012. Edite só `Status` e `Resposta do agente front` (Constituição 3.3).
  - Para as que eram da fase F6, cortada pela D007, use `RESOLVIDA` ou `REJEITADA` citando a D007, conforme o caso.
  - Leia também as sugestões novas que a T014 do backend criar, se aparecerem durante a sua tarefa.

## Fora do escopo
- Tela de cadastro de entregadores: continua como esqueleto até decisão do Eduardo.
- Funcionalidades novas, mudança de pilha e qualquer mudança no backend.
- Persistir o refresh token no `sessionStorage` (pendência separada).

## Regras de negócio envolvidas
- Constituição, Artigos 5, 6 e 7 inteiros.

## Critérios de aceite
- A tabela do relatório mostra, para cada endpoint usado, o schema conferido com o DTO real.
- Nenhuma tela fica em branco: há teste que força erro de renderização e erro de rede em cada página.
- Os mapas enquadram todos os pinos.
- Os E2E dos fluxos principais passam.
- `npm run typecheck`, `lint`, `test`, `build` e `test:e2e` passam.
- A tabela completa de achados está no relatório.

## Mocks / backend
- O backend real está em `http://localhost:8080` (perfil h2, carga de demonstração e simulador ligados). Ele é do Eduardo: **não reinicie, não pare**.
- Contra o backend real, faça **só leituras**: navegar e listar. Nenhuma ação que mude dinheiro ou o estado do dia (fechar caixa, gerar, pagar ou cancelar recibo, ajustar, despachar, cancelar entrega). Essas ficam nos testes com MSW.
- O Vite do Eduardo, na porta 5173, serve **esta pasta** com HMR: suas edições aparecem na tela dele. Use a 5173 só para verificação de leitura. Um Vite seu em outra porta é recusado pelo CORS do backend.
- Não abra nem leia arquivos `.env`.
- **Memória:** o PC tem 7,7 GB, e o Docker está usando cerca de 4 GB. Rode o Vitest com no máximo 2 workers (`npx vitest run --maxWorkers=2`) e um comando pesado por vez. Em 17/11, a sobrecarga da máquina derrubou o banco do backend.
- A T014 do backend corre em paralelo, num worktree separado, e não mexe no backend do Eduardo. Siga o contrato da `develop` do backend. Se ele mudar durante a sua tarefa, siga o novo e registre.

## Ao terminar
Escreva `../relatorios/T009-revisao-completa.md`, faça o merge para `develop` e pare.


## Atualização do ambiente (22/11/2026, Orquestrador)
O Eduardo parou o backend e o front dele, que estavam rodando. Com isso:
- A porta 5173 está livre: você pode subir o seu próprio Vite nela, para verificação visual e para o Playwright com MSW.
- **Não há backend rodando.** Não suba um: subir o backend escreve na pasta do backend (Constituição 3.2).
  - Valide com o MSW, no formato real.
  - O agente backend pode subir um backend na 8080 durante os testes dele. Se encontrar um respondendo, faça só leituras e não dependa dele.
  - A conferência contra o backend real fica com o Orquestrador, depois das duas revisões.
- Continuam valendo: Vitest com `--maxWorkers=2`, um comando pesado por vez e não ler `.env`.
## Retomada (22/11/2026 11:00, Orquestrador): substitui a "Atualização do ambiente"
- A T014 do backend está CONCLUIDA (`develop` 8c02b47). O contrato a seguir é esse. Leia e responda `agente_backend/sugestoes-frontend/S013-revisao-t014-mudancas-visiveis.md`: `topicoIntegracao` não existe e derruba a sessão STOMP se assinado; há 422, 409 e 503 novos; os horários agora são sempre de São Paulo.
- `sugestoes-backend/S001` foi respondida (RESOLVIDA) pelo backend e está sem commit neste repositório: comite junto.
- Visto pelo Orquestrador, para incluir na revisão: `features/monitoramento/util.ts` usa `new Date(...)` no lugar do interpretador de São Paulo de `shared/formatacao/dataHora.ts`, e `ListaEntregadores.tsx` mostra "Ultima posicao" sem acentos.
- O Eduardo vai testar o app no celular: a 8080 e a 5173 voltam a ser dele. Suba o seu Vite (só com MSW) na 5174 e não dependa do backend real.
- Cerca de 1,7 GB livres em C:. Não rode `playwright install`, use `--trace off` sem vídeo, Vitest com `--maxWorkers=2`, um comando pesado por vez e nenhum com menos de 1 GB livre (espere até 5 minutos; se não voltar, pare e reporte). Não apague nada para abrir espaço.
- Comite a cada área concluída: o limite de uso já interrompeu as tarefas duas vezes.
