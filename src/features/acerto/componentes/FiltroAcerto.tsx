/**
 * Filtro por entregador e periodo para o extrato do acerto (UC03, T006).
 */
import { useState } from 'react'
import type { MotoboyResponse } from '@/shared/api/schemas'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export type FiltroAcertoValues = {
  motoboyId: string
  inicio: string
  fim: string
}

type Props = {
  motoboys: MotoboyResponse[]
  aoFiltrar: (filtro: FiltroAcertoValues) => void
  carregando?: boolean
}

export function FiltroAcerto({ motoboys, aoFiltrar, carregando }: Props) {
  const [motoboyId, setMotoboyId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (motoboyId && inicio && fim) {
      aoFiltrar({ motoboyId, inicio, fim })
    }
  }

  const podeSubmeter = motoboyId !== '' && inicio !== '' && fim !== ''

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-motoboy">Entregador</Label>
        <select
          id="filtro-motoboy"
          value={motoboyId}
          onChange={(e) => setMotoboyId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Selecionar entregador"
        >
          <option value="">Selecione...</option>
          {motoboys.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-inicio">Data inicio</Label>
        <Input
          id="filtro-inicio"
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-fim">Data fim</Label>
        <Input
          id="filtro-fim"
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="w-40"
        />
      </div>

      <Button type="submit" disabled={!podeSubmeter || carregando}>
        {carregando ? 'Carregando...' : 'Filtrar'}
      </Button>
    </form>
  )
}
