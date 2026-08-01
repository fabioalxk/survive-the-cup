import type { TeamId } from '../sim/types'
import { FIELD } from '../sim/constants'
import { TEAMS } from '../sim/teams'
import type { MatchRenderer } from './three'
import type { KitColors } from './three/players'

/**
 * Fachada do render da partida. O desenho em si é 3D (ThreeJS, `./three`);
 * este módulo guarda só o que as telas precisam saber — proporção do canvas e
 * as preferências globais (uniformes, nomes, rótulos em pé) — para que
 * `MatchPlayer`/`App` continuem alheios ao motor gráfico.
 */

export type { KitColors }

/** margem (m) ao redor do campo — define a proporção do canvas (113 × 76). */
export const PAD = 4

export const canvasSize = (scale: number) => ({
  width: Math.round((FIELD.w + PAD * 2) * scale),
  height: Math.round((FIELD.h + PAD * 2) * scale),
})

/** Uniformes da partida: null = demo (Brasil × Argentina de `TEAMS`). */
let kitOverride: Record<TeamId, KitColors> | null = null
let labelsUpright = false
let showNames = false
let active: MatchRenderer | null = null

/** Cores em vigor para um time (carreira sobrepõe a demo). */
const kitInfo = (team: TeamId): KitColors => (kitOverride ? kitOverride[team] : TEAMS[team])

const kitPair = (): Record<TeamId, KitColors> => ({ home: kitInfo('home'), away: kitInfo('away') })

export const setMatchKits = (kits: Record<TeamId, KitColors> | null): void => {
  kitOverride = kits
  active?.setKits(kitPair())
}

export const setLabelsUpright = (v: boolean): void => {
  labelsUpright = v
  active?.setLabelsUpright(v)
}

export const setShowNames = (v: boolean): void => {
  showNames = v
  active?.setShowNames(v)
}

/**
 * Cria o renderer 3D preso a um canvas e o registra como o ativo — as
 * preferências já definidas (uniformes, nomes, rotação dos rótulos) valem de
 * imediato. Quem cria é dono: chame `dispose()` ao desmontar.
 *
 * O ThreeJS entra por `import()` dinâmico: ele responde por ~2/3 do bundle e só
 * a tela de partida precisa dele — menu, mapa e cartas abrem sem baixá-lo.
 */
export const createMatchRenderer = async (canvas: HTMLCanvasElement): Promise<MatchRenderer> => {
  const { MatchRenderer: Ctor } = await import('./three')
  const kits = kitPair()
  const r = new Ctor(canvas, {
    kits,
    accents: [kits.home.shirt, kits.away.shirt],
  })
  r.setLabelsUpright(labelsUpright)
  r.setShowNames(showNames)
  active = r
  return r
}

/** Desregistra o renderer ativo (chamado pelo dono ao descartar). */
export const releaseMatchRenderer = (r: MatchRenderer): void => {
  if (active === r) active = null
}
