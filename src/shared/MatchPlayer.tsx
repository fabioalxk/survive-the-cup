import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { canvasSize, setLabelsUpright, setShowNames } from '../render/renderer'
import { useMatchLoop, type MatchSetup } from '../useMatchLoop'
import { isMuted, primeAudio, setMuted } from '../sfx/crowd'
import type { Vec2 } from '../sim/types'
import type { GenPlayer } from '../game/types'
import { lineupFor, lineupFromSlots } from '../game/lineup'
import { resolveKits, withKitDefaults } from '../game/kits'
import { defaultFormation, formationName } from '../sim/formation'
import { ClubBadge, type BadgeClub } from '../ui/ClubBadge'
import { EventBanner } from '../ui/EventBanner'
import FormationEditor from '../ui/FormationEditor'
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CloseIcon,
  CompressIcon,
  ExpandIcon,
  PauseIcon,
  PlayIcon,
  SoundIcon,
  SpeedIcon,
  WhistleIcon,
} from '../ui/icons'
import { MatchHistory } from './MatchHistory'
import { useEscapeKey } from './useEscapeKey'

/* px por metro do canvas: 12 → 1356×912 nativo, nítido mesmo em tela cheia no desktop */
const SCALE = 12

/** Velocidades nomeadas — mais claras que "3× 9× 18×". */
const SPEEDS: [string, number][] = [
  ['Normal', 1.5],
  ['Rápido', 4],
  ['Turbo', 6],
]

const fmtClock = (sec: number) => {
  const m = Math.floor(sec / 60)
  return `${String(m).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

/** Um lado da partida: identidade visual (escudo/cores) + elenco gerado. */
export interface MatchSide extends BadgeClub {
  name: string
  squad: GenPlayer[]
  /** Âncoras da formação tática; ausente → 4-3-3 padrão. */
  formation?: Vec2[]
  /**
   * true (modo run): `squad[i]` entra EXATAMENTE no slot `i` da formação, sem
   * re-agrupar por função — a escalação do campinho vale ao pé da letra.
   */
  slotOrdered?: boolean
  /** Cor de shorts/meião (seleções reais têm; clubes fictícios não — ver `withKitDefaults`). */
  shorts?: string
  socks?: string
}

/**
 * Tela de partida ANIMADA reutilizável: dado o mandante e o visitante (identidade
 * + elenco), monta a escalação, resolve o conflito de uniformes e roda o motor
 * de simulação de verdade num <canvas>. Usada tanto pela liga (`career/MatchView`)
 * quanto pela corrida roguelike (`run/RunMatchView`) — o desfecho (placar final)
 * é devolvido via `onDone`; quem chama decide o que fazer com o resultado.
 */
export default function MatchPlayer({
  home,
  away,
  onDone,
  onFormationChange,
  extraControls,
}: {
  home: MatchSide
  away: MatchSide
  onDone: (homeGoals: number, awayGoals: number) => void
  /**
   * se fornecido, mostra o botão "Tática": pausa o jogo e abre o campinho para
   * remodelar o esquema DURANTE a partida. A mudança vale na hora no motor e é
   * repassada aqui para quem chama persistir (ex.: `formationSlots` da run).
   */
  onFormationChange?: (slots: Vec2[]) => void
  /** controles extras na barra da partida (ex.: poções da run) — recebe `pause`/`resume` p/ congelar e retomar o jogo. */
  extraControls?: (m: { pause: () => void; resume: () => void }) => ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [tactics, setTactics] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const [speedMenu, setSpeedMenu] = useState(false)
  const speedBtnRef = useRef<HTMLButtonElement>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const [speedMenuPos, setSpeedMenuPos] = useState({ left: 0, bottom: 0 })
  // âncoras vigentes da partida — a fonte local enquanto o jogo roda
  const [slots, setSlots] = useState<Vec2[]>(() => (home.formation ?? defaultFormation()).map((s) => ({ ...s })))
  const wasRunning = useRef(true)

  // uniformes resolvidos: visitante troca p/ reserva se houver conflito de cor
  const kits = useMemo(
    () => resolveKits(withKitDefaults(home), withKitDefaults(away)),
    [home, away],
  )

  // elencos, cores e nomes reais — memoizados p/ não recriar a partida a cada render
  const setup = useMemo<MatchSetup>(() => {
    const lineup = (side: MatchSide) =>
      side.slotOrdered
        ? lineupFromSlots(side.squad, side.formation ?? defaultFormation())
        : lineupFor(side.squad, side.formation)
    return {
      rosters: { home: lineup(home), away: lineup(away) },
      kits,
      names: { home: home.name, away: away.name },
    }
  }, [home, away, kits])

  // titulares que entraram em campo, na ordem dos slots — congelados na criação
  // da partida (o motor não re-escala no meio do jogo, o campinho tático também não)
  const xi = useRef(setup.rosters!.home).current

  // Em retrato (celular) o campo gira 90° no CSS; avisa o renderer p/ manter os
  // rótulos (número e nome) na vertical. Acompanha a rotação do aparelho.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const sync = () => setLabelsUpright(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      setLabelsUpright(false)
    }
  }, [])

  // nomes dos jogadores sempre visíveis acima do campo
  useEffect(() => {
    setShowNames(true)
    return () => setShowNames(false)
  }, [])

  const { hud, running, setRunning, speed, setSpeed, setFormation } = useMatchLoop(canvasRef, SCALE, setup)
  const size = canvasSize(SCALE)
  const over = hud.status === 'over'

  const changeFormation = (next: Vec2[]) => {
    setSlots(next)
    setFormation('home', next)
    onFormationChange?.(next)
  }
  // congela o jogo lembrando se rodava, p/ retomar como estava (tática e poções)
  const freeze = () => {
    wasRunning.current = running
    setRunning(false)
  }
  const unfreeze = () => setRunning(wasRunning.current)
  const openTactics = () => {
    freeze()
    setTactics(true)
  }
  const closeTactics = () => {
    setTactics(false)
    unfreeze()
  }

  useEscapeKey(closeTactics, tactics)
  useEscapeKey(() => setSpeedMenu(false), speedMenu)

  // menu de velocidade (estilo YouTube): fecha ao clicar fora. O menu é
  // portalado pra dentro de `rootRef` (não `.cm-match-controls`) porque a barra
  // tem `overflow-x: auto` — isso força o eixo Y a cortar também (regra do
  // CSS), então um popover posicionado ali dentro nunca apareceria.
  const toggleSpeedMenu = () => {
    if (!speedMenu && speedBtnRef.current) {
      const r = speedBtnRef.current.getBoundingClientRect()
      setSpeedMenuPos({ left: r.left, bottom: window.innerHeight - r.top + 8 })
    }
    setSpeedMenu((v) => !v)
  }
  useEffect(() => {
    if (!speedMenu) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (speedBtnRef.current?.contains(t) || speedMenuRef.current?.contains(t)) return
      setSpeedMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [speedMenu])
  const speedLabel = SPEEDS.find(([, s]) => s === speed)?.[0] ?? SPEEDS[0][0]

  // acompanha entrar/sair da tela cheia (inclusive via Esc, que o navegador trata)
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void rootRef.current?.requestFullscreen()
  }

  // No intervalo os times trocam de lado no campo (attackDir inverte no motor);
  // o placar acompanha, mantendo cada time do lado em que seu goleiro está.
  const swapped = hud.half === 2
  const left = swapped ? { side: away, goals: hud.away } : { side: home, goals: hud.home }
  const right = swapped ? { side: home, goals: hud.home } : { side: away, goals: hud.away }

  return (
    <div className="cm-match" ref={rootRef}>
      {/* palco: campo + HUD sobreposto (placar/controles) — no desktop vira overlay de transmissão */}
      <div className="cm-stage">
      <div className="cm-scoreboard">
        <span className="cm-sb-team">
          <span className="cm-sb-stripe" style={{ background: left.side.shirt }} aria-hidden />
          <ClubBadge club={left.side} size={30} />
          <span className="cm-sb-name">{left.side.name}</span>
        </span>
        <span
          className="cm-sb-score"
          role="status"
          aria-live="polite"
          aria-label={`Placar: ${left.side.name} ${left.goals}, ${right.side.name} ${right.goals}`}
        >
          {left.goals}
          <small>×</small>
          {right.goals}
        </span>
        <span className="cm-sb-team cm-sb-team-away">
          <span className="cm-sb-name">{right.side.name}</span>
          <ClubBadge club={right.side} size={30} />
          <span className="cm-sb-stripe" style={{ background: right.side.shirt }} aria-hidden />
        </span>
        <span className="cm-sb-clock">{over ? 'FIM' : fmtClock(hud.time)}</span>
      </div>

      <div className="cm-pitch">
        <canvas
          ref={canvasRef}
          className="cm-pitch-canvas"
          width={size.width}
          height={size.height}
          onClick={primeAudio}
        />
        {!over && (
          <EventBanner
            b={hud.banner}
            resolveTeam={(t) => ({ shirt: t === 'home' ? home.shirt : away.shirt })}
          />
        )}
        {tactics && !over && (
          <div className="cm-match-over cm-tactics-over" onClick={closeTactics}>
            <div
              className="cm-tactics-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Táticas"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cm-tactics-head">
                <span className="tv-name">Esquema: {formationName(slots)}</span>
                <button
                  className="cm-tactics-close"
                  onClick={closeTactics}
                  title="Voltar ao jogo"
                  aria-label="Voltar ao jogo"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <FormationEditor
                slots={slots}
                xi={xi}
                teamId={home.id}
                onPreset={changeFormation}
                onMove={(index, pos) => changeFormation(slots.map((s, j) => (j === index ? pos : s)))}
              />
              <button className="cm-btn cm-btn-go cm-btn-lg cm-btn-block cm-tactics-btn-bottom" onClick={closeTactics}>
                Voltar ao jogo
              </button>
            </div>
          </div>
        )}
        {over && (
          <div className="cm-match-over">
            <div>
              <div className="cm-over-emoji">
                <WhistleIcon size={44} />
              </div>
              <h2>Fim de jogo</h2>
              <div
                className="cm-over-score"
                aria-label={`Placar final: ${home.name} ${hud.home}, ${away.name} ${hud.away}`}
              >
                <span className="cm-over-team" aria-hidden>
                  {home.name}
                </span>
                <strong aria-hidden>
                  {hud.home}
                  <small>×</small>
                  {hud.away}
                </strong>
                <span className="cm-over-team" aria-hidden>
                  {away.name}
                </span>
              </div>
              <button
                className="cm-btn cm-btn-go cm-btn-lg cm-btn-block"
                onClick={() => onDone(hud.home, hud.away)}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}
      </div>

      {!over && (
        <div className="cm-match-controls">
          <button
            className="cm-btn cm-btn-play-pause"
            onClick={() => setRunning(!running)}
            title={running ? 'Pausar' : 'Jogar'}
            aria-label={running ? 'Pausar' : 'Jogar'}
          >
            {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
          <button
            ref={speedBtnRef}
            className="cm-btn cm-btn-sm cm-speed-btn"
            onClick={toggleSpeedMenu}
            title="Velocidade da partida"
            aria-haspopup="menu"
            aria-expanded={speedMenu}
          >
            <SpeedIcon size={14} className="cm-btn-ico-lead" />
            {speedLabel}
            <ChevronDownIcon size={12} className={`cm-speed-caret${speedMenu ? ' open' : ''}`} />
          </button>
          {speedMenu &&
            rootRef.current &&
            createPortal(
              <div
                className="cm-speed-menu"
                role="menu"
                ref={speedMenuRef}
                style={{ left: speedMenuPos.left, bottom: speedMenuPos.bottom }}
              >
                {SPEEDS.map(([label, s]) => (
                  <button
                    key={s}
                    className={`cm-speed-opt${speed === s ? ' active' : ''}`}
                    role="menuitemradio"
                    aria-checked={speed === s}
                    onClick={() => {
                      setSpeed(s)
                      setSpeedMenu(false)
                    }}
                  >
                    <span>{label}</span>
                    {speed === s && <CheckIcon size={14} />}
                  </button>
                ))}
              </div>,
              rootRef.current,
            )}
          {onFormationChange && (
            <button className="cm-btn cm-btn-sm" onClick={openTactics} title="Trocar a tática">
              <ClipboardIcon size={13} className="cm-btn-ico-lead" /> Tática
            </button>
          )}
          {extraControls?.({ pause: freeze, resume: unfreeze })}
          <button
            className="cm-btn cm-btn-sm cm-btn-ico"
            onClick={() => {
              setMuted(!muted)
              setMutedState(!muted)
            }}
            title={muted ? 'Ativar som' : 'Silenciar'}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            <SoundIcon size={14} muted={muted} />
          </button>
          <button
            className="cm-btn cm-btn-sm cm-btn-fullscreen"
            onClick={toggleFullscreen}
            title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {fullscreen ? <CompressIcon size={14} /> : <ExpandIcon size={14} />}
          </button>
        </div>
      )}
      </div>

      <MatchHistory events={hud.events} />
    </div>
  )
}
