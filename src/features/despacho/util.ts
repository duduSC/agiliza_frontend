import { useEffect, useState } from 'react'
import { ehErroApi } from '@/shared/api'

/** Mensagem pt-BR para qualquer erro vindo de uma chamada (já normalizado em `ErroApi`). */
export function mensagemDoErro(erro: unknown): string {
  if (ehErroApi(erro)) return erro.mensagem
  return 'Não foi possível concluir a operação.'
}

/** "Agora" que avança sozinho, para o tempo de espera não ficar parado na tela. */
export function useAgora(intervaloMs = 30_000): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}
