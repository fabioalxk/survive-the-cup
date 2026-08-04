import { useRef, useState } from 'react'
import { ALL_CLUBS } from '../game/worldcup'
import { continueAfterDefeat, START_LIVES } from '../game/run'
import { STAGE_COUNT } from '../game/runGen'
import { ClubBadge } from '../ui/ClubBadge'
import { CoinIcon, FlameIcon, HeartIcon, HelpIcon, RestartIcon, SoundIcon } from '../ui/icons'
import { isMuted, setMuted } from '../sfx/crowd'
import { useInert } from '../shared/useInert'
import MapView from './MapView'
import PreMatchView from './PreMatchView'
import RunMatchView from './RunMatchView'
import RewardCards from './RewardCards'
import BlessingView from './BlessingView'
import MarketNodeView from './MarketNodeView'
import GymNodeView from './GymNodeView'
import PotionsHud from './PotionsHud'
import RunToast from './RunToast'
import { ConfirmResetModal, GameOverModal, HelpModal, LifeLostModal, VictoryModal } from './RunModals'
import type { RunApi } from './useRun'

/**
 * Casca do modo roguelike — SEM abas: o mapa é a única tela-base e cada passo
 * da jornada (vestiário, partida, recompensa, mercado, academia) abre por cima
 * conforme o `status` da corrida. Uma ação por tela.
 */
export default function RunShell({ api }: { api: RunApi }) {
  const state = api.state!
  const { act } = api
  const [confirmReset, setConfirmReset] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const headerRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // toda tela de decisão (vestiário, mercado, academia...) é um backdrop cheio
  // que cobre cabeçalho e mapa por cima — sem isto, dava pra dar Tab e ativar
  // um nó do mapa (ou o mudo/ajuda/recomeçar do cabeçalho) por baixo do modal,
  // invisível mas ainda focável pelo teclado.
  const overlayOpen = state.status !== 'map' || confirmReset || showHelp
  useInert(headerRef, overlayOpen)
  useInert(mainRef, overlayOpen)

  if (state.status === 'match') return <RunMatchView state={state} act={act} />

  const club = ALL_CLUBS[state.clubId]
  // fase atual (1-based, o chefão é a última) — rótulo e pips leem do mesmo valor
  const phase = Math.min(state.stage + 1, STAGE_COUNT + 1)

  return (
    <div className="cm-shell rq-run-shell">
      <header className="cm-header" ref={headerRef}>
        <div className="cm-header-club">
          {club && <ClubBadge club={club} size={30} />}
          <div>
            <strong>{club?.name ?? state.clubId}</strong>
            <span className="cm-header-sub">Téc. {state.managerName} · Survive the Cup</span>
          </div>
        </div>
        <div className="rq-topbar-phase">
          <span className="rq-topbar-stage">
            Fase <b>{phase}</b> de {STAGE_COUNT + 1}
          </span>
          {/* um pip por fase, acesos até a atual. A barra de preenchimento antiga
              ficava 100% vazia na fase 1 (stage=0) e lia como componente
              quebrado; com os pips o jogador ainda conta quanto falta. */}
          <div className="rq-map-pips" aria-hidden>
            {Array.from({ length: STAGE_COUNT + 1 }, (_, i) => (
              <span key={i} className={`rq-map-pip${i < phase ? ' rq-map-pip-on' : ''}`} />
            ))}
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
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
            onClick={() => {
              setMuted(!muted)
              setMutedState(!muted)
            }}
            title={muted ? 'Ativar som' : 'Silenciar'}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            <SoundIcon size={16} muted={muted} />
          </button>
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
            onClick={() => setShowHelp(true)}
            title="Como jogar"
            aria-label="Como jogar"
          >
            <HelpIcon size={16} />
          </button>
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
            onClick={() => setConfirmReset(true)}
            title="Recomeçar do zero"
            aria-label="Recomeçar do zero"
          >
            <RestartIcon size={15} />
          </button>
        </div>
        <RunToast log={state.log} />
      </header>

      <main className="cm-main" ref={mainRef}>
        <MapView state={state} act={act} />
      </main>

      {state.status === 'blessing' && (
        <BlessingView state={state} act={act} onHelp={() => setShowHelp(true)} />
      )}
      {state.status === 'prematch' && <PreMatchView state={state} act={act} />}
      {state.status === 'reward' && (
        <RewardCards state={state} act={act} onHelp={() => setShowHelp(true)} />
      )}
      {state.status === 'market' && (
        <MarketNodeView state={state} act={act} onHelp={() => setShowHelp(true)} />
      )}
      {state.status === 'gym' && (
        <GymNodeView state={state} act={act} onHelp={() => setShowHelp(true)} />
      )}
      {state.status === 'lifelost' && (
        <LifeLostModal state={state} onContinue={() => act(continueAfterDefeat)} />
      )}
      {state.status === 'gameover' && <GameOverModal state={state} onNewRun={api.reset} />}
      {state.status === 'victory' && <VictoryModal state={state} onNewRun={api.reset} />}
      {confirmReset && (
        <ConfirmResetModal onConfirm={api.reset} onCancel={() => setConfirmReset(false)} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
