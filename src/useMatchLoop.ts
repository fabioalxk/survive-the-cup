import { useEffect, useRef, useState } from 'react'
import type {
  Banner,
  Celebration,
  MatchEvent,
  MatchState,
  MatchStatus,
  TeamId,
  TeamStats,
  Vec2,
} from './sim/types'
import { applyFormation, type Rosters } from './sim/formation'
import { MATCH, PHYS } from './sim/constants'
import { createMatch, setMatchTeamNames, step, stepCelebration } from './sim/engine'
import { drawMatch, setMatchKits } from './render/renderer'
import { goalRoar, refWhistle } from './sfx/crowd'

/** Configuração opcional da partida (modo carreira): elencos, cores e nomes reais. */
export interface MatchSetup {
  rosters?: Rosters
  kits?: Record<'home' | 'away', { shirt: string; shorts: string; socks: string; text: string }>
  names?: Record<'home' | 'away', string>
}

export interface Hud {
  home: number
  away: number
  /** segundos de jogo */
  time: number
  /** acréscimos do tempo atual (s de jogo) */
  stoppage: number
  half: 1 | 2
  status: MatchStatus
  events: MatchEvent[]
  stats: { home: TeamStats; away: TeamStats }
  /** comemoração de gol em andamento (alimenta o banner central) */
  celebration: Celebration | null
  /** faixa do último lance (falta, pênalti, intervalo...) — anúncio efêmero */
  banner: Banner | null
}

const snapshot = (m: MatchState): Hud => ({
  home: m.score.home,
  away: m.score.away,
  time: m.time,
  stoppage: m.stoppage,
  half: m.half,
  status: m.status,
  events: m.events.slice().reverse(),
  stats: { home: m.stats.home, away: m.stats.away },
  celebration: m.celebration,
  banner: m.banner,
})

/**
 * Conecta o motor de simulação a um <canvas> com loop de passo fixo.
 * Devolve controles e um snapshot reativo do estado para a HUD.
 */
export const useMatchLoop = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  scale: number,
  setup?: MatchSetup,
) => {
  const setupRef = useRef(setup)
  const matchRef = useRef<MatchState>(createMatch(setup?.rosters))
  const runningRef = useRef(true)
  const speedRef = useRef(1.5)

  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1.5)
  const [hud, setHud] = useState<Hud>(() => snapshot(matchRef.current))

  useEffect(() => void (runningRef.current = running), [running])
  useEffect(() => void (speedRef.current = speed), [speed])

  // cores e nomes dos times (carreira) — aplica ao montar e limpa ao desmontar
  useEffect(() => {
    setMatchKits(setup?.kits ?? null)
    setMatchTeamNames(setup?.names ?? null)
    return () => {
      setMatchKits(null)
      setMatchTeamNames(null)
    }
  }, [setup])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let acc = 0
    let lastSec = -1
    let lastEvents = -1
    let lastStatus: MatchStatus | '' = ''
    let lastCeleb = false
    let lastBanner = -1
    let lastWhistling = false

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dtReal = Math.min(0.05, (now - last) / 1000)
      last = now

      const m = matchRef.current
      // a comemoração roda em tempo REAL (legível em qualquer velocidade); a
      // jogada normal corre acelerada conforme o controle de velocidade.
      const celebrating = m.celebration !== null
      // congelamento da faixa de transição de fase (1º tempo / intervalo): a
      // jogada NÃO corre enquanto a faixa central está na tela.
      const pausing = m.introPause > 0
      const stepping = runningRef.current && m.status === 'play' && !celebrating && !pausing
      if (celebrating && runningRef.current) {
        acc = 0 // sem dívida de passos pendentes ao voltar do congelamento
        stepCelebration(m, dtReal)
      } else if (pausing && runningRef.current) {
        // conta a pausa em tempo REAL (independe da velocidade); ao zerar, o jogo
        // recomeça exatamente quando a faixa sai da tela.
        acc = 0
        m.introPause = Math.max(0, m.introPause - dtReal)
      } else if (stepping) {
        acc += dtReal * speedRef.current
        let steps = 0
        // para de avançar assim que um passo dispara uma transição de fase
        // (introPause > 0): a jogada congela AQUI, sem correr por baixo da faixa.
        while (acc >= PHYS.dt && steps < 16 && m.introPause === 0) {
          step(m, PHYS.dt)
          acc -= PHYS.dt
          steps++
        }
        // descarta a dívida acumulada se estourou o teto (anti "spiral of death")
        if (acc > PHYS.dt) acc = PHYS.dt
      }

      // alpha = fração do passo já decorrida → render interpola prev→pos (suave).
      // Se uma transição de fase acabou de congelar (introPause), não interpola —
      // evita um "pulo" no frame em que os jogadores são recolocados na saída.
      const alpha = stepping && m.introPause === 0 ? Math.min(1, acc / PHYS.dt) : 1
      drawMatch(ctx, m, scale, alpha)

      // HUD atualiza ao mudar o segundo, surgir evento, acabar ou (des)comemorar
      const sec = Math.floor(m.time / MATCH.clockRate)
      const celeb = m.celebration !== null
      const bannerId = m.banner?.id ?? -1
      // dispara o rugido da torcida exatamente no início da comemoração
      if (celeb && !lastCeleb) goalRoar()
      // apito de fim de tempo: um toque quando o árbitro encerra o lance (a bola
      // ainda rola um instante) e o apito final quando entra o intervalo/fim.
      const whistling = m.finalWhistle > 0
      if (whistling && !lastWhistling) refWhistle('stop')
      if (!whistling && lastWhistling) refWhistle(m.status === 'over' ? 'full' : 'half')
      lastWhistling = whistling
      if (
        sec !== lastSec ||
        m.events.length !== lastEvents ||
        m.status !== lastStatus ||
        celeb !== lastCeleb ||
        bannerId !== lastBanner
      ) {
        lastSec = sec
        lastEvents = m.events.length
        lastStatus = m.status
        lastCeleb = celeb
        lastBanner = bannerId
        setHud(snapshot(m))
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [canvasRef, scale])

  const reset = () => {
    matchRef.current = createMatch(setupRef.current?.rosters)
    setHud(snapshot(matchRef.current))
  }

  /** Troca a tática de um time no meio da partida (mutação controlada do motor). */
  const setFormation = (team: TeamId, slots: Vec2[]) =>
    applyFormation(matchRef.current.players, team, slots)

  return { hud, running, setRunning, speed, setSpeed, reset, setFormation }
}
