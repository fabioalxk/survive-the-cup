import { useEffect, useRef, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { optimizeStartingXI, swapStarter } from '../game/run'
import { RoleTag, attrColor, byRole } from '../ui/attrDisplay'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import { PlayerDetailPop } from '../ui/PlayerDetail'
import { BenchIcon, SwapIcon } from '../ui/icons'
import type { GenPlayer } from '../game/types'
import type { RunApi } from './useRun'

type Side = 'starter' | 'bench'

/**
 * Escalação da corrida: 2 colunas lado a lado, Titulares × Banco. A regra é
 * SEMPRE a mesma e nunca muda de nome: toque em um jogador, depois toque no
 * jogador do OUTRO lado — eles trocam de lugar na hora. Sem modos escondidos,
 * sem botões que mudam de rótulo: só apontar quem entra e quem sai.
 */
export default function SquadRunView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const starters = state.squad.filter((p) => state.startingIds.includes(p.id)).sort(byRole)
  const bench = state.squad.filter((p) => !state.startingIds.includes(p.id)).sort(byRole)
  const all = [...starters, ...bench]

  const [selId, setSelId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; warn?: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const sel = all.find((p) => p.id === selId) ?? null
  const selSide: Side | null = sel ? (state.startingIds.includes(sel.id) ? 'starter' : 'bench') : null

  const fireToast = (msg: string, warn?: boolean) => {
    setToast({ msg, warn })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  const pick = (p: GenPlayer, side: Side) => {
    if (!sel || !selSide) {
      setSelId(p.id)
      return
    }
    if (p.id === sel.id) {
      setSelId(null)
      return
    }
    if (side === selSide) {
      setSelId(p.id)
      return
    }
    const benchP = side === 'bench' ? p : sel
    const starterP = side === 'starter' ? p : sel
    const losesOnlyGk =
      starterP.role === 'GK' && benchP.role !== 'GK' && starters.filter((s) => s.role === 'GK').length === 1
    act((s) => swapStarter(s, benchP.id, starterP.id))
    fireToast(
      losesOnlyGk
        ? `⚠ ${benchP.name} entra, mas o time fica sem um goleiro de verdade`
        : `✓ ${benchP.name} entra no lugar de ${starterP.name}`,
      losesOnlyGk,
    )
    setSelId(null)
  }

  const card = (p: GenPlayer, side: Side) => {
    const isSel = p.id === selId
    const isSwapTarget = !!sel && selSide !== null && selSide !== side
    return (
      <li key={p.id}>
        <button
          className={`rq-card ${isSel ? 'is-sel' : ''} ${isSwapTarget ? 'is-swap-target' : ''}`}
          onClick={() => pick(p, side)}
        >
          <PlayerAvatar teamId={state.clubId} name={p.name} id={p.id} size={34} />
          <span className="rq-card-info">
            <strong>{p.name}</strong>
            <span className="rq-card-sub">
              <RoleTag role={p.role} />
            </span>
          </span>
          <span className="rq-card-ovr" style={{ color: attrColor(p.overall) }}>
            {p.overall}
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="rq-squad-simple">
      <div className="rq-simple-top">
        <p className="rq-simple-hint">Toque em 2 jogadores — um de cada lado — pra trocar de lugar.</p>
        <button className="cm-btn cm-btn-ghost cm-btn-sm" onClick={() => act((s) => optimizeStartingXI(s))}>
          Melhor time
        </button>
      </div>

      <div className="rq-simple-cols">
        <div className="rq-simple-col">
          <h3>
            Titulares <span>{starters.length}/11</span>
          </h3>
          <ul>{starters.map((p) => card(p, 'starter'))}</ul>
        </div>

        <span className="rq-simple-swap-ico" aria-hidden>
          <SwapIcon size={16} />
        </span>

        <div className="rq-simple-col">
          <h3>
            Banco <span>{bench.length}</span>
          </h3>
          {bench.length === 0 ? (
            <div className="rq-empty">
              <BenchIcon size={52} className="rq-empty-ico" />
              <strong>Banco vazio</strong>
              <p>Vença partidas ou compre no mercado pra ganhar reforços.</p>
            </div>
          ) : (
            <ul>{bench.map((p) => card(p, 'bench'))}</ul>
          )}
        </div>
      </div>

      {sel && (
        <PlayerDetailPop
          player={sel}
          teamId={state.clubId}
          extra={<> · {selSide === 'starter' ? 'Titular' : 'Reserva'}</>}
          onClose={() => setSelId(null)}
        />
      )}

      {toast && <div className={`rq-toast ${toast.warn ? 'rq-toast-warn' : ''}`}>{toast.msg}</div>}
    </div>
  )
}
