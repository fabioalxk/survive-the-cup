import { useState } from 'react'
import type { CareerState } from '../game/types'
import {
  advanceRound,
  closeTransferWindow,
  fmtMoney,
  nextPlayerFixture,
} from '../game/career'
import { computeStandings, positionOf } from '../game/schedule'
import { divisionName } from './format'
import Standings from './Standings'
import SquadView from './SquadView'
import { ClubBadge } from '../ui/ClubBadge'
import { ArtIcon } from '../ui/ArtIcon'
import { PlayIcon, RestartIcon } from '../ui/icons'
import MarketView from './MarketView'
import MatchView from './MatchView'
import { OffersModal, SeasonEndModal, WonModal } from './Modals'
import type { CareerApi } from './useCareer'

type Tab = 'home' | 'squad' | 'market' | 'table'

const TABS: [Tab, string, string][] = [
  ['home', 'home', 'Início'],
  ['squad', 'jersey', 'Meu Time'],
  ['market', 'cart', 'Contratar'],
  ['table', 'chart', 'Tabela'],
]

export default function GameShell({ api }: { api: CareerApi }) {
  const state = api.state!
  const { act } = api
  const [tab, setTab] = useState<Tab>('home')
  const [watching, setWatching] = useState(false)

  const inTransfer = state.status === 'transfer'

  if (watching && state.status === 'season') {
    return <MatchView state={state} act={act} onDone={() => setWatching(false)} />
  }

  return (
    <div className="cm-shell">
      <Header state={state} onReset={api.reset} />

      <nav className="cm-nav">
        {TABS.map(([id, icon, label]) => (
          <button
            key={id}
            className={`cm-nav-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <span className="cm-nav-ico">
              <ArtIcon name={icon} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="cm-main">
        {inTransfer && <TransferBanner act={act} />}
        {tab === 'home' && !inTransfer && (
          <Dashboard
            state={state}
            act={act}
            onWatch={() => setWatching(true)}
            onSeeTable={() => setTab('table')}
          />
        )}
        {tab === 'home' && inTransfer && <SquadView state={state} act={act} />}
        {tab === 'squad' && <SquadView state={state} act={act} />}
        {tab === 'market' && <MarketView state={state} act={act} />}
        {tab === 'table' && (
          <div className="cm-card">
            <h3>{divisionName(state.league.division)} — Classificação</h3>
            <Standings state={state} />
          </div>
        )}
      </main>

      {state.status === 'season_end' && <SeasonEndModal state={state} act={act} />}
      {state.status === 'offers' && <OffersModal state={state} act={act} />}
      {state.status === 'won' && <WonModal state={state} onNewGame={api.reset} />}
    </div>
  )
}

function Header({ state, onReset }: { state: CareerState; onReset: () => void }) {
  const club = state.clubs[state.clubId]
  return (
    <header className="cm-header">
      <div className="cm-header-club">
        <ClubBadge club={club} size={32} />
        <div>
          <strong>{club.name}</strong>
          <span className="cm-header-sub">
            {divisionName(state.league.division)} · {state.year} · Téc. {state.managerName}
          </span>
        </div>
      </div>
      <div className="cm-header-stats">
        <span title="Dinheiro disponível">
          <ArtIcon name="coin" /> {fmtMoney(state.money)}
        </span>
        <button
          className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
          onClick={onReset}
          title="Começar de novo"
          aria-label="Começar de novo"
        >
          <RestartIcon size={14} />
        </button>
      </div>
    </header>
  )
}

function TransferBanner({ act }: { act: CareerApi['act'] }) {
  return (
    <div className="cm-transfer-banner">
      <div>
        <strong>
          <ArtIcon name="cart" /> Hora de contratar!
        </strong>
        <span>Reforce o time antes da próxima temporada. Veja a aba “Contratar”.</span>
      </div>
      <button
        className="cm-btn cm-btn-primary cm-btn-lg"
        onClick={() => act((s) => closeTransferWindow(s))}
      >
        Começar temporada →
      </button>
    </div>
  )
}

function Dashboard({
  state,
  act,
  onWatch,
  onSeeTable,
}: {
  state: CareerState
  act: CareerApi['act']
  onWatch: () => void
  onSeeTable: () => void
}) {
  const fixture = nextPlayerFixture(state)
  const home = fixture ? state.clubs[fixture.homeId] : null
  const away = fixture ? state.clubs[fixture.awayId] : null
  const myHome = fixture?.homeId === state.clubId

  const standings = computeStandings(state.league.clubIds, state.league.fixtures)
  const myRow = standings.find((s) => s.clubId === state.clubId)
  const myPos = positionOf(standings, state.clubId)
  const totalRounds = state.league.totalRounds
  const round = Math.min(state.league.round, totalRounds)
  const venue = (
    <>
      <ArtIcon name={myHome ? 'home' : 'plane'} /> {myHome ? 'Em casa' : 'Fora de casa'}
    </>
  )

  if (!fixture || !home || !away) {
    return (
      <div className="cm-dash">
        <div className="cm-hero">
          <p className="cm-empty">Temporada encerrada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-dash">
      <div className="cm-hero">
        <div className="cm-hero-round">
          Rodada {round} de {totalRounds} · {divisionName(state.league.division)}
        </div>

        <div className="cm-hero-match">
          <HeroTeam club={myHome ? home : away} you={myHome} />
          <span className="cm-hero-vs">×</span>
          <HeroTeam club={myHome ? away : home} you={!myHome} flip />
        </div>

        <div className="cm-hero-venue">{venue}</div>

        <button className="cm-play" onClick={onWatch}>
          <PlayIcon size={18} className="cm-btn-ico-lead" /> Jogar partida
        </button>
        <button className="cm-skip" onClick={() => act((s) => advanceRound(s))}>
          ou pule e veja só o placar
        </button>
      </div>

      <button className="cm-campaign" onClick={onSeeTable}>
        <span className="cm-campaign-label">Sua posição</span>
        <span className="cm-campaign-pos">
          {myPos > 0 ? `${myPos}º` : '—'}
          <small> · {myRow ? myRow.pts : 0} pts</small>
        </span>
        <span className="cm-campaign-arrow">Ver tabela ›</span>
      </button>

      {state.log.length > 0 && (
        <div className="cm-card cm-log">
          <h3>
            <ArtIcon name="news" /> Notícias
          </h3>
          <ul>
            {state.log.slice(0, 4).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function HeroTeam({
  club,
  you,
  flip,
}: {
  club: CareerState['clubs'][string]
  you: boolean
  flip?: boolean
}) {
  return (
    <div className={`cm-hero-team ${flip ? 'flip' : ''}`}>
      <ClubBadge club={club} size={48} />
      <div className="cm-hero-team-id">
        <strong>{club.name}</strong>
        {you && <span className="cm-hero-you">Seu time</span>}
      </div>
    </div>
  )
}
