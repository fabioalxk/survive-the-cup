import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { canvasSize, setLabelsUpright } from '../render/renderer'
import { useMatchLoop, type MatchSetup } from '../useMatchLoop'
import { primeAudio } from '../sfx/crowd'
import type { Vec2 } from '../sim/types'
import type { GenPlayer } from '../game/types'
import { lineupFor } from '../game/lineup'
import { resolveKits } from '../game/kits'
import { defaultFormation, formationName } from '../sim/formation'
import { ClubBadge, type BadgeClub } from '../ui/ClubBadge'
import { EventBanner } from '../ui/EventBanner'
import FormationEditor from '../ui/FormationEditor'
import { ClipboardIcon, CloseIcon, PauseIcon, PlayIcon, SkipIcon, WhistleIcon } from '../ui/icons'
import { MatchHistory } from './MatchHistory'

/* px por metro do canvas: 10 → 1130×760 nativo, nítido mesmo ampliado no desktop */
const SCALE = 10

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
  onSkip,
  onFormationChange,
  extraControls,
}: {
  home: MatchSide
  away: MatchSide
  onDone: (homeGoals: number, awayGoals: number) => void
  /** se fornecido, mostra um botão "pular" que resolve a partida sem animação. */
  onSkip?: () => void
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
  const [tactics, setTactics] = useState(false)
  // âncoras vigentes da partida — a fonte local enquanto o jogo roda
  const [slots, setSlots] = useState<Vec2[]>(() => (home.formation ?? defaultFormation()).map((s) => ({ ...s })))
  const wasRunning = useRef(true)

  // uniformes resolvidos: visitante troca p/ reserva se houver conflito de cor
  const kits = useMemo(
    () => resolveKits({ shirt: home.shirt, text: home.text }, { shirt: away.shirt, text: away.text }),
    [home, away],
  )

  // elencos, cores e nomes reais — memoizados p/ não recriar a partida a cada render
  const setup = useMemo<MatchSetup>(
    () => ({
      rosters: { home: lineupFor(home.squad, home.formation), away: lineupFor(away.squad, away.formation) },
      kits,
      names: { home: home.name, away: away.name },
    }),
    [home, away, kits],
  )

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

  useEffect(() => {
    if (!tactics) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTactics()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tactics])

  // No intervalo os times trocam de lado no campo (attackDir inverte no motor);
  // o placar acompanha, mantendo cada time do lado em que seu goleiro está.
  const swapped = hud.half === 2
  const left = swapped ? { side: away, goals: hud.away } : { side: home, goals: hud.home }
  const right = swapped ? { side: home, goals: hud.home } : { side: away, goals: hud.away }

  return (
    <div className="cm-match">
      <div className="cm-scoreboard">
        <span className="cm-sb-team">
          <span className="cm-sb-stripe" style={{ background: left.side.shirt }} aria-hidden />
          <ClubBadge club={left.side} size={30} />
          <span className="cm-sb-name">{left.side.name}</span>
        </span>
        <span className="cm-sb-score">
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
            <div className="cm-tactics-panel" onClick={(e) => e.stopPropagation()}>
              <div className="cm-tactics-head">
                <span className="tv-name">Esquema: {formationName(slots)}</span>
                <button className="cm-tactics-close" onClick={closeTactics} title="Voltar ao jogo">
                  <CloseIcon size={16} />
                </button>
              </div>
              <FormationEditor
                slots={slots}
                xi={xi}
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
              <div className="cm-over-score">
                <span className="cm-over-team">{home.name}</span>
                <strong>
                  {hud.home}
                  <small>×</small>
                  {hud.away}
                </strong>
                <span className="cm-over-team">{away.name}</span>
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
          >
            {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
          <div className="cm-speed">
            {SPEEDS.map(([label, s]) => (
              <button
                key={s}
                className={`cm-btn cm-btn-sm ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {label}
              </button>
            ))}
          </div>
          {onFormationChange && (
            <button className="cm-btn cm-btn-sm" onClick={openTactics} title="Trocar a tática">
              <ClipboardIcon size={13} className="cm-btn-ico-lead" /> Tática
            </button>
          )}
          {extraControls?.({ pause: freeze, resume: unfreeze })}
          {onSkip && (
            <button className="cm-btn cm-btn-ghost cm-btn-sm" onClick={onSkip}>
              Pular <SkipIcon size={13} className="cm-btn-ico-trail" />
            </button>
          )}
        </div>
      )}

      <MatchHistory events={hud.events} />
    </div>
  )
}
