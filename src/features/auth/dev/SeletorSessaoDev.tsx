/**
 * PROVISÓRIO (até a F7) — seletor de sessão de desenvolvimento: escolhe um perfil e um
 * estabelecimento fictício e preenche a store de sessão. NÃO é tela de login e NÃO entra no
 * build de produção (carregado só via `import()` condicionado a `SESSAO_DEV_HABILITADA`).
 */
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/shared/ui/button'
import { LABEL_PERFIL_USUARIO, PERFIS_USUARIO, type PerfilUsuario } from '@/shared/dominio'
import { useSessaoStore, type ResultadoInicioSessao } from '../sessaoStore'
import { ESTABELECIMENTOS_DEV, montarUsuarioDev } from './usuariosDev'

export const MARCADOR_SELETOR_DEV = 'Sessão de desenvolvimento (provisória)'

type Props = {
  aoIniciar: (perfil: PerfilUsuario) => void
}

export default function SeletorSessaoDev({ aoIniciar }: Props) {
  const iniciarSessao = useSessaoStore((s) => s.iniciarSessao)
  const [perfil, setPerfil] = useState<PerfilUsuario>('OPERADOR')
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>(
    ESTABELECIMENTOS_DEV[0]?.id ?? '',
  )
  const [recusa, setRecusa] = useState<string | null>(null)
  const idPerfil = useId()
  const idEstab = useId()
  const semEstabelecimento = perfil === 'ADMIN_GERAL'

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const usuario = montarUsuarioDev(perfil, semEstabelecimento ? null : estabelecimentoId)
    const resultado: ResultadoInicioSessao = iniciarSessao({ usuario, token: null })
    if (resultado.ok) {
      setRecusa(null)
      aoIniciar(perfil)
    } else {
      setRecusa(resultado.mensagem)
    }
  }

  return (
    <form
      onSubmit={enviar}
      aria-label={MARCADOR_SELETOR_DEV}
      className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-dashed border-amber-500 bg-amber-50 p-4"
    >
      <p className="text-sm font-semibold text-amber-900">{MARCADOR_SELETOR_DEV}</p>
      <p className="text-xs text-amber-900">
        Só existe em desenvolvimento/mocks. Dados fictícios, sem token. O login real chega na F7.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={idPerfil} className="text-sm font-medium">
          Perfil
        </label>
        <select
          id={idPerfil}
          value={perfil}
          onChange={(e) => {
            setPerfil(e.target.value as PerfilUsuario)
            setRecusa(null)
          }}
          className="h-9 rounded-md border bg-white px-2 text-sm"
        >
          {PERFIS_USUARIO.map((p) => (
            <option key={p} value={p}>
              {LABEL_PERFIL_USUARIO[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={idEstab} className="text-sm font-medium">
          Estabelecimento fictício
        </label>
        <select
          id={idEstab}
          value={semEstabelecimento ? '' : estabelecimentoId}
          disabled={semEstabelecimento}
          onChange={(e) => setEstabelecimentoId(e.target.value)}
          className="h-9 rounded-md border bg-white px-2 text-sm disabled:opacity-60"
        >
          {semEstabelecimento && <option value="">Nenhum (administrador geral)</option>}
          {ESTABELECIMENTOS_DEV.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      {recusa && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {recusa}
        </p>
      )}

      <Button type="submit">Iniciar sessão de desenvolvimento</Button>
    </form>
  )
}
