import { useEffect } from 'react'
import type { RunState } from '../game/runTypes'
import { ALL_CLUBS } from '../game/worldcup'
import { defeatSfx, victorySfx } from '../sfx/crowd'
import { HeartbreakIcon, RestartIcon, SkullIcon } from '../ui/icons'
import { TrophyIcon } from './MapIcons'

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="cm-backdrop">{children}</div>
}

const lastMatchLine = (state: RunState) =>
  state.lastMatch && (
    <>
      Derrota para o {state.lastMatch.oppName} ({state.lastMatch.homeGoals}×{state.lastMatch.awayGoals})
      na fase {state.lastMatch.stage}.
    </>
  )

/** Tela de VIDA PERDIDA: perdeu uma partida mas ainda tem vida — a corrida continua. */
export function LifeLostModal({ state, onContinue }: { state: RunState; onContinue: () => void }) {
  useEffect(() => { defeatSfx() }, [])
  return (
    <Backdrop>
      <div className="cm-modal cm-modal-over">
        <div className="rq-over-emoji rq-over-red">
          <HeartbreakIcon size={56} />
        </div>
        <h2>VOCÊ PERDEU 1 VIDA</h2>
        <p className="cm-modal-sub">{lastMatchLine(state)}</p>
        <p className="cm-modal-sub">
          Resta {state.lives} vida: a próxima derrota elimina. O confronto continua no mapa — tente a
          revanche ou reforce o time antes.
        </p>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onContinue}>
          Continuar a corrida
        </button>
      </div>
    </Backdrop>
  )
}

/** Tela de ELIMINAÇÃO: as vidas acabaram, a corrida acaba — só reinicia do zero. */
export function GameOverModal({ state, onNewRun }: { state: RunState; onNewRun: () => void }) {
  useEffect(() => { defeatSfx() }, [])
  return (
    <Backdrop>
      <div className="cm-modal cm-modal-over">
        <div className="rq-over-emoji rq-over-bone">
          <SkullIcon size={56} />
        </div>
        <h2>ELIMINADO</h2>
        <p className="cm-modal-sub">{lastMatchLine(state)}</p>
        <p className="cm-modal-sub">Suas vidas acabaram. Fim de jornada — comece uma corrida nova do zero.</p>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onNewRun}>
          <RestartIcon size={15} className="cm-btn-ico-lead" /> Nova corrida
        </button>
      </div>
    </Backdrop>
  )
}

/** Tela de VITÓRIA: venceu o chefão final. */
export function VictoryModal({ state, onNewRun }: { state: RunState; onNewRun: () => void }) {
  useEffect(() => { victorySfx() }, [])
  const club = ALL_CLUBS[state.clubId]
  return (
    <Backdrop>
      <div className="cm-modal cm-modal-won">
        <div className="cm-won-trophy">
          <TrophyIcon size={78} />
        </div>
        <h2>VOCÊ VENCEU O CHEFÃO!</h2>
        <p className="cm-modal-sub">
          {state.managerName} levou o {club?.name ?? state.clubId} do primeiro quadradinho até o topo do
          mapa — jornada completa!
        </p>
        <div className="cm-won-stats">
          <span>{state.squad.length} jogadores no elenco final</span>
          <span>{state.coins} moedas guardadas</span>
        </div>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onNewRun}>
          Nova corrida
        </button>
      </div>
    </Backdrop>
  )
}
