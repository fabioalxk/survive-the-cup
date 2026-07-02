import { useState } from 'react'
import { ALL_CLUBS } from '../game/worldcup'
import { benchHasUpgrade, continueAfterDefeat, START_LIVES } from '../game/run'
import { ClubBadge } from '../ui/ClubBadge'
import { ClipboardIcon, CoinIcon, FlameIcon, HeartIcon, MapIcon, RestartIcon, ShirtIcon } from '../ui/icons'
import MapView from './MapView'
import SquadRunView from './SquadRunView'
import TacticsView from './TacticsView'
import RunMatchView from './RunMatchView'
import RewardCards from './RewardCards'
import BlessingView from './BlessingView'
import MarketNodeView from './MarketNodeView'
import GymNodeView from './GymNodeView'
import PotionsHud from './PotionsHud'
import { GameOverModal, LifeLostModal, VictoryModal } from './RunModals'
import type { RunApi } from './useRun'

type Tab = 'map' | 'squad' | 'tactics'

/** Casca do modo roguelike: cabeçalho + abas (mapa/elenco) + o que o status da corrida exigir. */
export default function RunShell({ api }: { api: RunApi }) {
  const state = api.state!
  const { act } = api
  const [tab, setTab] = useState<Tab>('map')

  if (state.status === 'match') return <RunMatchView state={state} act={act} />

  const club = ALL_CLUBS[state.clubId]

  return (
    <div className="cm-shell rq-run-shell">
      {(tab === 'squad' || tab === 'tactics') && (
        <div key={tab} className={`rq-shell-bg rq-scene-${tab}`} aria-hidden />
      )}
      <header className="cm-header">
        <div className="cm-header-club">
          {club && <ClubBadge club={club} size={32} />}
          <div>
            <strong>{club?.name ?? state.clubId}</strong>
            <span className="cm-header-sub">Téc. {state.managerName} · Survive the Cup</span>
          </div>
        </div>
        <div className="cm-header-stats">
          {state.ascension > 0 && (
            <span className="rq-asc-chip" title={`Ascension ${state.ascension} — dificuldade aumentada`}>
              <FlameIcon size={13} /> A{state.ascension}
            </span>
          )}
          <span className="cm-lives-chip" title="Vidas — dá para perder 1 partida; a 2ª derrota elimina">
            {Array.from({ length: Math.max(START_LIVES, state.lives) }, (_, i) => (
              <HeartIcon key={i} size={16} className={i < state.lives ? 'cm-life' : 'cm-life cm-life-off'} />
            ))}
          </span>
          <PotionsHud state={state} act={act} />
          <span className="cm-coin-chip" title="Moedas">
            <CoinIcon size={17} /> {state.coins}
          </span>
          <button className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico" onClick={api.reset} title="Recomeçar do zero">
            <RestartIcon size={15} />
          </button>
        </div>
      </header>

      <nav className="cm-nav">
        <button className={`cm-nav-btn ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}>
          <span className="cm-nav-ico">
            <MapIcon size={18} />
          </span>
          <span>Mapa</span>
        </button>
        <button className={`cm-nav-btn ${tab === 'squad' ? 'active' : ''}`} onClick={() => setTab('squad')}>
          <span className="cm-nav-ico">
            <ShirtIcon size={18} />
            {benchHasUpgrade(state) && (
              <span className="cm-nav-dot" title="Você tem reservas melhores que titulares" />
            )}
          </span>
          <span>Meu Time</span>
        </button>
        <button className={`cm-nav-btn ${tab === 'tactics' ? 'active' : ''}`} onClick={() => setTab('tactics')}>
          <span className="cm-nav-ico">
            <ClipboardIcon size={18} />
          </span>
          <span>Tática</span>
        </button>
      </nav>

      <main className="cm-main">
        {tab === 'map' && <MapView state={state} act={act} />}
        {tab === 'squad' && <SquadRunView state={state} act={act} />}
        {tab === 'tactics' && <TacticsView state={state} act={act} />}
      </main>

      {state.status === 'blessing' && <BlessingView state={state} act={act} />}
      {state.status === 'reward' && <RewardCards state={state} act={act} />}
      {state.status === 'market' && <MarketNodeView state={state} act={act} />}
      {state.status === 'gym' && <GymNodeView state={state} act={act} />}
      {state.status === 'lifelost' && (
        <LifeLostModal state={state} onContinue={() => act(continueAfterDefeat)} />
      )}
      {state.status === 'gameover' && <GameOverModal state={state} onNewRun={api.reset} />}
      {state.status === 'victory' && <VictoryModal state={state} onNewRun={api.reset} />}
    </div>
  )
}
