/**
 * Harness de experimento: isola UM atributo para medir seu impacto real na
 * simulação. 11 contra 11, todos os atributos em 50 para os dois times, exceto
 * o atributo testado — que fica em 100 para TODOS os jogadores do time "teste"
 * (o time "controle" mantém 50 em tudo). Roda N partidas completas no motor
 * físico (`src/sim/engine.ts`) e agrega os placares/estatísticas.
 *
 * Seed manual (não `Date.now()`): garante que 1000 partidas em sequência não
 * colidam no mesmo milissegundo e virem clones umas das outras.
 */
import { createMatch, step, stepCelebration } from '../../sim/engine'
import { PHYS } from '../../sim/constants'
import { seedRng } from '../../sim/rng'
import type { Attrs } from '../../sim/types'
import { FORMATION_433, ROLES_433, type SeedPlayer } from '../../sim/teams'

const ATTR_KEYS: (keyof Attrs)[] = [
  'pace', 'acceleration', 'strength',
  'dribbling', 'firstTouch', 'passing', 'finishing', 'tackling',
  'positioning',
  'goalkeeping',
]

const flatAttrs = (value: number): Attrs => {
  const a = {} as Attrs
  for (const k of ATTR_KEYS) a[k] = value
  return a
}

const buildTeam = (attr: keyof Attrs, value: number): SeedPlayer[] =>
  ROLES_433.map((role, i) => ({
    id: i + 1,
    number: i + 1,
    name: `#${i + 1}`,
    role,
    attrs: { ...flatAttrs(50), [attr]: value },
    formationPos: { ...FORMATION_433[i] },
  }))

export interface MatchOutcome {
  testGoals: number
  controlGoals: number
  testShots: number
  controlShots: number
  testShotsOnTarget: number
  controlShotsOnTarget: number
  testPossessionTicks: number
  controlPossessionTicks: number
  testFouls: number
  controlFouls: number
}

const MAX_STEPS = 400_000 // guarda anti-loop-infinito (partida real usa ~10-15 mil passos)

/** Roda UMA partida completa: `attr` a 100 no time "teste", 50 no "controle".
 *  `testSide` decide qual lado (home/away) é o time teste — cancela o viés
 *  estrutural do mando de campo (home sempre bate o pontapé inicial do 1º tempo). */
export const simulateOne = (attr: keyof Attrs, seed: number, testSide: 'home' | 'away'): MatchOutcome => {
  const testTeam = buildTeam(attr, 100)
  const controlTeam = buildTeam(attr, 50) // tudo 50, igual à base
  const home = testSide === 'home' ? testTeam : controlTeam
  const away = testSide === 'home' ? controlTeam : testTeam
  const match = createMatch({ home, away })
  match.rngState = seedRng(seed) // sobrescreve o Date.now() interno p/ reprodutibilidade

  let guard = 0
  while (match.status !== 'over' && guard++ < MAX_STEPS) {
    if (match.celebration) stepCelebration(match, PHYS.dt)
    else step(match, PHYS.dt)
  }
  if (match.status !== 'over') throw new Error(`partida não terminou em ${MAX_STEPS} passos (seed ${seed})`)

  const testStats = testSide === 'home' ? match.stats.home : match.stats.away
  const controlStats = testSide === 'home' ? match.stats.away : match.stats.home
  const testGoals = testSide === 'home' ? match.score.home : match.score.away
  const controlGoals = testSide === 'home' ? match.score.away : match.score.home

  return {
    testGoals,
    controlGoals,
    testShots: testStats.shots,
    controlShots: controlStats.shots,
    testShotsOnTarget: testStats.shotsOnTarget,
    controlShotsOnTarget: controlStats.shotsOnTarget,
    testPossessionTicks: testStats.possessionTicks,
    controlPossessionTicks: controlStats.possessionTicks,
    testFouls: testStats.fouls,
    controlFouls: controlStats.fouls,
  }
}

/** Roda `trials` partidas para o atributo dado, alternando o lado do time
 *  "teste" a cada partida (metade em casa, metade fora). */
export const runExperiment = (attr: keyof Attrs, trials: number, baseSeed: number): MatchOutcome[] => {
  const results: MatchOutcome[] = []
  for (let i = 0; i < trials; i++) {
    const seed = baseSeed + i * 104_729 // primo grande: espalha bem as seeds
    const testSide = i % 2 === 0 ? 'home' : 'away'
    results.push(simulateOne(attr, seed, testSide))
  }
  return results
}
