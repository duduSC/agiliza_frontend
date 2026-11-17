# T008 — Página inicial depois do login e despacho travando com o backend real

**Status:** EM_ANDAMENTO
**Fase:** F7 (integração para 17/11)
**Depende de:** T007
**Referências no DVP:** UC01 (despacho), HU01–HU03, RNF02 (painel em até 5 s)
**Skills indicadas:** as de estados de tela e contratos de dados que você já usa (`.claude/skills/`)

## Objetivo
Pedido direto do Eduardo (17/11/2026), depois de testar o Backoffice contra o backend real:
1. Depois do login, o usuário vai para uma **página inicial** (`/inicio`), e não direto para o despacho.
2. A tela de **Despacho trava e não carrega** com o backend real. Descobrir a causa e corrigir.

## Escopo
- [ ] **Causa do travamento do Despacho**, com o backend real (`VITE_USE_MOCKS=false`, `VITE_API_URL=http://localhost:8080`):
  - reproduzir o problema;
  - registrar no relatório a causa exata: requisição, resposta, erro no console e trecho do código;
  - corrigir.

  Suspeitas a conferir, sem tomar nenhuma como certa:
  - formato real das respostas de `/api/entregas`, `/api/lotes` e `/api/motoboys`, diferente do mock (por exemplo, lista simples em vez de página, ou nomes de campos);
  - `coordenada` `null` ou em outro formato quebrando o mapa;
  - laço de renderização ou de *refetch*;
  - inscrição STOMP em `/ws` falhando e travando a tela;
  - erro sem tratamento (Constituição: toda tela trata carregando, vazio, erro e sucesso).
- [ ] Se a causa for formato de contrato, siga o backend real (o código do backend é a fonte da verdade do contrato) e ajuste os mocks do MSW e os testes para o formato real. Se a divergência for do backend, registre em `../sugestoes-backend/` e contorne no front, sem quebrar.
- [ ] **Página inicial `/inicio`:**
  - é o destino depois do login e da rota `/`;
  - mostra o nome do usuário, o perfil, o estabelecimento (quando houver) e atalhos (cartões) para as telas que **aquele perfil** pode acessar, pela mesma configuração de telas que o menu já usa;
  - entra no menu lateral como primeiro item ("Início");
  - sem métricas nem números inventados: se quiser algum número, só os que já vêm de endpoints existentes, com os estados de carregando e de erro.
- [ ] Esta tarefa substitui a regra do `AGENT.md`, seção 7 ("depois do login, redirecione para a primeira tela do perfil"), por decisão do Eduardo de 17/11. O Orquestrador atualiza o `AGENT.md` depois; você não precisa editá-lo.
- [ ] Ajustar o redirecionamento depois do login:
  - se havia um destino guardado (o usuário foi mandado ao login a partir de uma rota protegida), volta para ele;
  - se não havia, vai para `/inicio`.
- [ ] Atualizar os testes que esperam `/despacho` como destino padrão (`App.test.tsx` e outros) e acrescentar testes para:
  - login → `/inicio`;
  - os atalhos certos por perfil;
  - o Despacho exibindo os dados no formato real, incluindo entrega sem coordenada.

## Fora do escopo
- Tela de cadastro de entregadores (`/loja/entregadores` continua esqueleto).
- Mudanças no backend.

## Regras de negócio envolvidas
- Constituição do front: estados de tela, perfis e acesso, e o formato de erro `ApiErrorResponse`.

## Critérios de aceite
- Dado o operador `operador@agiliza.dev`, quando ele faz login, então vê `/inicio` com atalhos para Despacho, Monitoramento, Acerto e Caixa.
- Dado o backend real com 4 ou mais entregas aguardando despacho, quando o operador abre o Despacho, então a tela carrega em até 5 s, com as entregas na lista e no mapa, sem travar.
- `npm run test` e `npm run build` passam.

## Ambiente (importante)
- **O backend já está rodando** em `http://localhost:8080`, no perfil h2, com a carga de demonstração e o simulador de pedidos ligados. **Não reinicie, não pare e não suba outro backend nem container Docker.** O ambiente é do Eduardo.
- **Não abra, não leia e não edite arquivos `.env`.** Passe as variáveis na linha de comando ao subir o Vite, por exemplo `VITE_USE_MOCKS=false VITE_API_URL=http://localhost:8080`.
- O CORS do backend só aceita a origem `http://localhost:5173`. Se o Eduardo já estiver com o front rodando nessa porta, use o dele. Não mate o processo dele; nesse caso, registre no relatório o que conseguiu verificar.
- Login de teste: `operador@agiliza.dev` / `agiliza123` (só desenvolvimento).
- A `develop` foi recriada pelo Orquestrador em 17/11 a partir da `main`, porque tinha sido renomeada. Trabalhe normalmente a partir dela. A `main` continua intocável.

## Ao terminar
Escreva `../relatorios/T008-pagina-inicial-e-despacho-com-backend-real.md`, faça o merge para `develop` e pare.
