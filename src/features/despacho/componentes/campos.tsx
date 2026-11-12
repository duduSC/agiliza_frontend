/** Campos de formulário com rótulo e mensagem de erro acessíveis (Constituição, Artigo 7.6). */
import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/ui/lib/utils'

const CLASSE_INPUT =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive'

type PropsCampo = ComponentProps<'input'> & {
  rotulo: string
  erro?: string
  obrigatorio?: boolean
  ajuda?: ReactNode
}

export const CampoTexto = forwardRef<HTMLInputElement, PropsCampo>(function CampoTexto(
  { rotulo, erro, obrigatorio, ajuda, className, id, ...props },
  ref,
) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idErro = `${idCampo}-erro`
  const idAjuda = `${idCampo}-ajuda`
  const descritores = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(' ')
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={idCampo}>
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </Label>
      {/* <input> nativo: o `Input` do shadcn (React 18) não repassa `ref`, e o register do RHF precisa dela. */}
      <input
        ref={ref}
        className={CLASSE_INPUT}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-required={obrigatorio || undefined}
        aria-describedby={descritores || undefined}
        {...props}
      />
      {ajuda && (
        <p id={idAjuda} className="text-xs text-muted-foreground">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
})

type PropsSelecao = ComponentProps<'select'> & { rotulo: string; erro?: string }

export const CampoSelecao = forwardRef<HTMLSelectElement, PropsSelecao>(function CampoSelecao(
  { rotulo, erro, className, id, children, ...props },
  ref,
) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idErro = `${idCampo}-erro`
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={idCampo}>{rotulo}</Label>
      <select
        ref={ref}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
        {...props}
      >
        {children}
      </select>
      {erro && (
        <p id={idErro} className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
})
