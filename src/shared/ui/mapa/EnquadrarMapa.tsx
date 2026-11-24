import { useCallback, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { Focus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { limitesDoMapa, type PontoDoMapa } from './enquadramento'

/**
 * Enquadra todos os pinos quando o CONJUNTO deles muda (a loja chegou, entrou um pedido). Posição
 * que só se move não mexe no zoom que o operador escolheu; para isso há o botão, no canto inferior
 * direito, acima da atribuição (T010, referência visual).
 */
export function EnquadrarMapa({ pontos }: { pontos: readonly PontoDoMapa[] }) {
  const mapa = useMap()
  const atuais = useRef(pontos)
  atuais.current = pontos

  const enquadrar = useCallback(() => {
    const limites = limitesDoMapa(atuais.current)
    if (!limites) return
    // Folga para a altura do pino e do rótulo dele (em cima) e para o nome sob o entregador e o
    // próprio botão (embaixo).
    mapa.fitBounds(limites, {
      paddingTopLeft: [64, 88],
      paddingBottomRight: [64, 64],
      maxZoom: 15,
      animate: false,
    })
  }, [mapa])

  const conjunto = pontos
    .map((p) => p.id)
    .sort()
    .join(' ')

  useEffect(() => {
    if (conjunto) enquadrar()
  }, [conjunto, enquadrar])

  if (!conjunto) return null
  return (
    <div className="absolute right-2 bottom-7 z-[1000]">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="bg-white shadow-md"
        onClick={(evento) => {
          evento.stopPropagation()
          enquadrar()
        }}
        onDoubleClick={(evento) => evento.stopPropagation()}
      >
        <Focus aria-hidden="true" />
        Enquadrar todos
      </Button>
    </div>
  )
}
