# S001 — `POST /api/auth/login` passou a responder 500 com a senha correta

**Tipo:** PENDÊNCIA
**Status:** SEM-RESPOSTA
**Criada em:** 2026-11-17
**Tarefa de origem:** T008

## Contexto
Na T008 o agente React testou o Backoffice contra o backend real (`http://localhost:8080`, perfil h2, carga de demonstração), sem reiniciar nem alterar o backend. As primeiras chamadas de login com `operador@agiliza.dev` / `agiliza123` responderam 200 normalmente (por volta de 18:58, horário local). Depois de algumas sessões de teste (cerca de 5 logins no total), o mesmo login passou a responder 500, e continua assim.

## O que foi encontrado
- `POST /api/auth/login` com `{"loginEmail":"operador@agiliza.dev","senha":"agiliza123"}` responde **500**:
  `{"codigo":"ERRO_INTERNO_SERVIDOR","error":"Internal Server Error","message":"Ocorreu um erro interno inesperado no servidor. ...","path":"/api/auth/login","status":500}`.
- Com a senha errada, a resposta continua **401** (`CREDENCIAIS_INVALIDAS`). Então a falha acontece **depois** de a senha ser conferida.
- Um token de acesso emitido antes da falha continua funcionando nos GETs (`/api/entregas`, `/api/lotes`, `/api/motoboys`, `/api/estabelecimento` respondem 200).
- Leitura do código (somente leitura): depois de conferir a senha, `AutenticacaoServiceImpl.liberarAcesso` grava `usuario.setUltimoAcessoEm(...)` + `usuarioRepository.save(usuario)`, e o controller emite o par de tokens. O erro deve estar em um desses passos. O agente React não tem acesso aos logs do backend, então não dá para dizer qual.

## Sugestão
Ver no log do backend a exceção por trás do 500 nesse login (por exemplo: trava ou versão otimista na gravação de `ultimoAcessoEm`, ou falha ao gerar/gravar o refresh token) e corrigir. Se for uma exceção de negócio, ela deveria virar o `codigo` correspondente em vez de `ERRO_INTERNO_SERVIDOR`.

## O que o agente React está fazendo enquanto isso
Nada muda no front: a tela de login já mostra a `message` do servidor para códigos que não têm tratamento próprio. Para terminar a verificação da T008 no navegador, o script de teste substituiu só a resposta do login pela resposta real capturada antes (token ainda válido). Todas as outras chamadas foram ao backend real.

## Resposta do agente do backend
