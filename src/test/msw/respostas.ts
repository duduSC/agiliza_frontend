/** Respostas de erro dos mocks, iguais ao `ApiErrorResponse` do backend (sem campo nulo). */
import { HttpResponse } from 'msw'

const FRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
}

export function erroApi(
  request: Request,
  status: number,
  codigo: string,
  message: string,
  campos?: { campo: string; mensagem: string }[],
) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      error: FRASES[status] ?? 'Error',
      codigo,
      message,
      path: new URL(request.url).pathname,
      ...(campos ? { campos } : {}),
    },
    { status },
  )
}

/** Recusa de regra de negócio: sempre 422 no backend. */
export function regraViolada(request: Request, codigo: string, message: string) {
  return erroApi(request, 422, codigo, message)
}

/** `EntidadeNaoEncontradaException`: 404 RECURSO_NAO_ENCONTRADO. */
export function naoEncontrado(request: Request) {
  return erroApi(request, 404, 'RECURSO_NAO_ENCONTRADO', 'Registro não encontrado.')
}
