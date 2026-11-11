import { useSessaoStore } from '@/features/auth'
import { podeReabrirCaixa } from '@/shared/dominio'
import { Button } from '@/shared/ui/button'
import { PaginaEsqueleto } from '@/shared/ui/PaginaEsqueleto'

/**
 * Esqueleto (T002). O caixa real (abrir, fechar, reabrir) chega na F5.
 * "Reabrir caixa" só aparece para ADMIN_RESTAURANTE (Constituição, Artigo 5.3); por ora sem ação.
 */
export function CaixaPagina() {
  const perfil = useSessaoStore((s) => s.usuario?.perfil)
  const mostrarReabrir = perfil !== undefined && podeReabrirCaixa(perfil)

  return (
    <PaginaEsqueleto
      titulo="Caixa"
      descricao="Caixa do dia: abertura, fechamento e reabertura."
      acoes={
        mostrarReabrir ? (
          <Button variant="outline" disabled title="Disponível numa próxima versão">
            Reabrir caixa
          </Button>
        ) : undefined
      }
    />
  )
}
