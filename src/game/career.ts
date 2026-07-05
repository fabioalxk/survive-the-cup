import type {
  CareerState,
  ClubState,
  Division,
  Fixture,
  HistoryEntry,
  JobOffer,
} from './types'
import type { Attrs } from '../sim/types'
import { ATTR_FLOOR } from '../sim/chaos'
import { CLUBS_BY_DIVISION, ALL_CLUBS } from './clubs'
import { DIVISION_LEVEL, PLAYER_BOOST, generateClub, generateMarket } from './generate'
import { pushLog } from './log'
import { overallOf } from './overall'
import { buildFixtures, computeStandings, positionOf, totalRounds } from './schedule'
import { quickResult } from './quicksim'
import { teamStrength, bestEleven } from './strength'
import { makeRng, mixSeed, type Rng } from './random'

const CAREER_VERSION = 1

/** Acessos (sobem) e rebaixamentos (descem) por divisão — modelo enxuto 20-clubes. */
const PROMOTION_SLOTS: Record<Division, number> = { A: 0, B: 4, C: 4, D: 4 }
const RELEGATION_SLOTS: Record<Division, number> = { A: 4, B: 4, C: 4, D: 0 }

/** Divisão imediatamente acima/abaixo. */
const up = (d: Division): Division => (d === 'B' ? 'A' : d === 'C' ? 'B' : d === 'D' ? 'C' : 'A')
const down = (d: Division): Division => (d === 'A' ? 'B' : d === 'B' ? 'C' : d === 'C' ? 'D' : 'D')

/** Premiação (R$) por divisão — escala com o nível da competição. */
const PRIZE_BASE: Record<Division, number> = { A: 18_000_000, B: 9_000_000, C: 4_500_000, D: 2_200_000 }

/** Orçamento inicial ao assumir um clube de cada divisão. */
const START_BUDGET: Record<Division, number> = { A: 30_000_000, B: 14_000_000, C: 6_000_000, D: 2_500_000 }

const fmtMoney = (v: number): string =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : `R$ ${Math.round(v / 1000)}k`

// =====================================================================
// CRIAÇÃO DE TEMPORADA
// =====================================================================

/** Monta os 20 clubes de uma divisão: o clube do jogador + clubes reais do pool. */
const buildLeagueClubs = (
  division: Division,
  playerClub: ClubState,
  rng: Rng,
): Record<string, ClubState> => {
  const pool = CLUBS_BY_DIVISION[division].filter((c) => c.id !== playerClub.id)
  const clubs: Record<string, ClubState> = { [playerClub.id]: playerClub }
  for (const def of pool.slice(0, 19)) {
    clubs[def.id] = generateClub(def, division, rng)
  }
  return clubs
}

/** Inicia uma temporada na divisão dada, preservando o elenco do jogador. */
const startSeason = (state: CareerState, division: Division): void => {
  const rng = makeRng(mixSeed(state.seed, state.year))
  const playerClub = state.clubs[state.clubId]
  state.clubs = buildLeagueClubs(division, playerClub, rng)
  const clubIds = Object.keys(state.clubs)
  state.league = {
    division,
    clubIds,
    fixtures: buildFixtures(clubIds),
    round: 1,
    totalRounds: totalRounds(clubIds.length),
  }
  state.market = generateMarket(division, 16, rng)
  state.offers = []
  state.status = 'season'
}

/** Cria uma nova carreira: técnico assume um clube da Série D. */
export const newCareer = (
  managerName: string,
  startClubId: string,
  seed: number,
): CareerState => {
  const def = ALL_CLUBS[startClubId] ?? CLUBS_BY_DIVISION.D[0]
  const rng = makeRng(seed)
  const playerClub = generateClub(def, 'D', rng, PLAYER_BOOST)
  const state: CareerState = {
    version: CAREER_VERSION,
    managerName,
    seed,
    year: 2026,
    clubId: playerClub.id,
    clubs: { [playerClub.id]: playerClub },
    league: { division: 'D', clubIds: [], fixtures: [], round: 1, totalRounds: 0 },
    money: START_BUDGET.D,
    reputation: 25,
    history: [],
    trophies: [],
    offers: [],
    market: [],
    status: 'season',
    pendingDivision: 'D',
    lastSeason: null,
    log: [`${managerName} assume o ${def.name} na Série D. Boa sorte, treinador!`],
  }
  startSeason(state, 'D')
  return state
}

// =====================================================================
// SIMULAÇÃO DE RODADAS
// =====================================================================

const log = (state: CareerState, msg: string): void => pushLog(state.log, msg, 40)

/** Joga uma partida (resultado rápido por força). */
const playFixture = (state: CareerState, f: Fixture, rng: Rng): void => {
  const home = state.clubs[f.homeId]
  const away = state.clubs[f.awayId]
  const r = quickResult(teamStrength(home), teamStrength(away), rng)
  f.homeGoals = r.homeGoals
  f.awayGoals = r.awayGoals
  f.played = true
}

/** Próxima partida do clube do jogador (não jogada). */
export const nextPlayerFixture = (state: CareerState): Fixture | null =>
  state.league.fixtures.find(
    (f) => !f.played && (f.homeId === state.clubId || f.awayId === state.clubId),
  ) ?? null

/** Resolve todas as partidas da rodada (uma delas já com placar fixo, se `pin`
 *  vier preenchido) e avança o contador — núcleo comum de `advanceRound` e
 *  `advanceRoundWithPlayerResult`, que só decidem QUAL fixture (se algum) fica
 *  de fora da simulação por já ter placar definido. */
const resolveRound = (
  state: CareerState,
  round: number,
  rng: Rng,
  pin?: { fixture: Fixture; homeGoals: number; awayGoals: number },
): void => {
  for (const f of state.league.fixtures) {
    if (f.round !== round || f.played) continue
    if (pin && f === pin.fixture) {
      f.homeGoals = pin.homeGoals
      f.awayGoals = pin.awayGoals
      f.played = true
    } else {
      playFixture(state, f, rng)
    }
  }
  state.league.round++
  if (state.league.round > state.league.totalRounds) endSeason(state)
}

/** Joga TODAS as partidas da rodada atual e avança o contador. */
export const advanceRound = (state: CareerState): void => {
  if (state.status !== 'season') return
  const { round } = state.league
  const rng = makeRng(mixSeed(mixSeed(state.seed, state.year), round))
  resolveRound(state, round, rng)
}

/**
 * Permite gravar um placar específico (ex.: vindo do motor animado que o jogador
 * assistiu) e simular o resto da rodada normalmente.
 */
export const advanceRoundWithPlayerResult = (
  state: CareerState,
  homeGoals: number,
  awayGoals: number,
): void => {
  if (state.status !== 'season') return
  const fixture = nextPlayerFixture(state)
  const { round } = state.league
  const rng = makeRng(mixSeed(mixSeed(state.seed, state.year), round))
  resolveRound(state, round, rng, fixture ? { fixture, homeGoals, awayGoals } : undefined)
}

/** Joga a temporada inteira de uma vez (a partir da rodada atual). */
export const simulateSeason = (state: CareerState): void => {
  while (state.status === 'season') advanceRound(state)
}

// =====================================================================
// FIM DE TEMPORADA: classificação, prêmios, acesso/queda, ofertas
// =====================================================================

const prizeFor = (division: Division, position: number): number => {
  const factor = Math.max(0.15, 1 - (position - 1) * 0.045)
  return Math.round(PRIZE_BASE[division] * factor)
}

/** Envelhece e desenvolve o elenco do jogador entre temporadas (sem turbo). */
const agePlayers = (club: ClubState): void => {
  club.squad = club.squad.filter((p) => p.age < 37) // aposentadorias
  for (const p of club.squad) {
    p.age++
    const young = p.age <= 24
    const delta = young ? 1 : p.age <= 29 ? 0 : -1
    if (delta !== 0) developPlayer(p, delta)
  }
}

/** Aplica +/- pontos aos atributos e recalcula overall/valor. */
const developPlayer = (
  p: { role: import('../sim/types').Role; attrs: Attrs; overall: number; value: number; age: number },
  points: number,
): void => {
  for (const k in p.attrs) {
    const key = k as keyof Attrs
    p.attrs[key] = Math.max(ATTR_FLOOR, Math.min(99, p.attrs[key] + points))
  }
  p.overall = overallOf(p.role, p.attrs)
  const base = Math.pow(Math.max(0, p.overall - 40) / 10, 2.4) * 120_000
  const ageMul = p.age <= 24 ? 1.15 : p.age <= 28 ? 1 : p.age <= 31 ? 0.7 : 0.4
  p.value = Math.round((base * ageMul) / 10_000) * 10_000
}

const makeOffer = (division: Division, excludeId: string, rng: Rng): JobOffer | null => {
  const pool = CLUBS_BY_DIVISION[division].filter((c) => c.id !== excludeId)
  if (pool.length === 0) return null
  const def = pool[rng.int(0, pool.length - 1)]
  return { clubId: def.id, division, clubName: def.name }
}

/** Encerra a temporada: tabela final, história, prêmios, acesso/queda, ofertas. */
const endSeason = (state: CareerState): void => {
  const standings = computeStandings(state.league.clubIds, state.league.fixtures)
  const division = state.league.division
  const position = positionOf(standings, state.clubId)
  const champion = position === 1
  const clubName = state.clubs[state.clubId].name

  // ZEROU: campeão da elite
  if (division === 'A' && champion) {
    state.trophies.push(`Campeão da Série A de ${state.year}`)
    const entry: HistoryEntry = { year: state.year, clubName, division, position, champion: true, promoted: false, relegated: false }
    state.history.push(entry)
    state.lastSeason = entry
    state.status = 'won'
    log(state, `🏆 CAMPEÃO BRASILEIRO! O ${clubName} é campeão da Série A de ${state.year}!`)
    return
  }

  const promotedAtAll = division !== 'A' && position <= PROMOTION_SLOTS[division]
  const relegated = position > state.league.clubIds.length - RELEGATION_SLOTS[division]
  const nextDivision: Division = promotedAtAll ? up(division) : relegated ? down(division) : division

  if (champion) state.trophies.push(`Campeão da Série ${division} de ${state.year}`)

  const entry: HistoryEntry = {
    year: state.year,
    clubName,
    division,
    position,
    champion,
    promoted: promotedAtAll,
    relegated,
  }
  state.history.push(entry)
  state.lastSeason = entry
  state.pendingDivision = nextDivision

  // premiação
  const prize = prizeFor(division, position)
  state.money += prize

  // narração
  if (champion) log(state, `🏆 ${clubName} é CAMPEÃO da Série ${division}! +${fmtMoney(prize)}.`)
  else log(state, `Série ${division}: ${clubName} terminou em ${position}º. +${fmtMoney(prize)} de premiação.`)
  if (promotedAtAll) log(state, `⬆️ ACESSO! O ${clubName} sobe para a Série ${nextDivision}!`)
  if (relegated) log(state, `⬇️ Rebaixamento: o ${clubName} cai para a Série ${nextDivision}.`)

  // reputação
  state.reputation = Math.max(0, Math.min(100, state.reputation + (champion ? 14 : promotedAtAll ? 9 : relegated ? -8 : position <= 8 ? 2 : -3)))

  // envelhece o elenco e renova o mercado da próxima divisão
  agePlayers(state.clubs[state.clubId])
  const rng = makeRng(mixSeed(mixSeed(state.seed, state.year), 7777))
  state.market = generateMarket(nextDivision, 16, rng)

  // ofertas de clubes maiores (se a reputação estiver alta e foi bem)
  state.offers = []
  if (state.reputation >= 45 && (champion || promotedAtAll || position <= 4)) {
    const target = nextDivision === 'A' ? 'A' : up(nextDivision)
    const offer = makeOffer(target, state.clubId, rng)
    if (offer) {
      state.offers.push(offer)
      log(state, `📞 O ${offer.clubName} (Série ${offer.division}) quer você como técnico!`)
    }
  }

  state.status = 'season_end'
}

// =====================================================================
// TRANSIÇÃO ENTRE TEMPORADAS / DECISÕES
// =====================================================================

/** Avança da tela de fim de temporada para a janela de transferências. */
export const openTransferWindow = (state: CareerState): void => {
  if (state.status === 'season_end') state.status = 'transfer'
}

/** Fecha a janela: vai para ofertas (se houver) ou começa a próxima temporada. */
export const closeTransferWindow = (state: CareerState): void => {
  if (state.status !== 'transfer') return
  if (state.offers.length > 0) state.status = 'offers'
  else beginNextSeason(state)
}

/** Começa a próxima temporada na divisão pendente. */
export const beginNextSeason = (state: CareerState): void => {
  state.year++
  startSeason(state, state.pendingDivision)
  const div = state.pendingDivision
  log(state, `Início da temporada ${state.year} — ${state.clubs[state.clubId].name} na Série ${div}.`)
}

/** Aceita uma oferta: assume o novo clube (elenco da divisão dele). */
export const acceptOffer = (state: CareerState, clubId: string): void => {
  const offer = state.offers.find((o) => o.clubId === clubId)
  if (!offer) return
  const rng = makeRng(mixSeed(state.seed, mixSeed(state.year, 999)))
  const def = ALL_CLUBS[offer.clubId]
  const newClub = generateClub(def, offer.division, rng, PLAYER_BOOST)
  // remove o vínculo antigo; o novo clube entra no dicionário
  state.clubId = newClub.id
  state.clubs = { [newClub.id]: newClub }
  state.pendingDivision = offer.division
  state.money = START_BUDGET[offer.division]
  state.reputation = Math.min(100, state.reputation + 5)
  state.offers = []
  log(state, `✍️ Você assinou com o ${def.name} (Série ${offer.division})!`)
  beginNextSeason(state)
}

/** Recusa todas as ofertas e segue com o clube atual. */
export const declineOffers = (state: CareerState): void => {
  state.offers = []
  if (state.status === 'offers') beginNextSeason(state)
}

// =====================================================================
// TRANSFERÊNCIAS
// =====================================================================

export const SQUAD_MAX = 26
export const SQUAD_MIN = 14

/** Contrata um jogador do mercado (se houver verba e vaga). */
export const signPlayer = (state: CareerState, playerId: number): boolean => {
  const idx = state.market.findIndex((m) => m.id === playerId)
  if (idx < 0) return false
  const m = state.market[idx]
  const club = state.clubs[state.clubId]
  if (state.money < m.fee || club.squad.length >= SQUAD_MAX) return false
  const { fee, ...player } = m
  void fee
  club.squad.push(player)
  state.money -= m.fee
  state.market.splice(idx, 1)
  log(state, `Contratado: ${m.name} (${m.overall} OVR) por ${fmtMoney(m.fee)}.`)
  return true
}

/** Vende um jogador do elenco (recebe ~90% do valor de mercado). */
export const sellPlayer = (state: CareerState, playerId: number): boolean => {
  const club = state.clubs[state.clubId]
  if (club.squad.length <= SQUAD_MIN) return false
  const idx = club.squad.findIndex((p) => p.id === playerId)
  if (idx < 0) return false
  const p = club.squad[idx]
  const fee = Math.round(p.value * 0.9)
  club.squad.splice(idx, 1)
  state.money += fee
  log(state, `Vendido: ${p.name} por ${fmtMoney(fee)}.`)
  return true
}

// =====================================================================
// AUTO-PLAY (TURBO) — joga a carreira inteira até zerar
// =====================================================================

/**
 * Reforça o elenco na janela: treina o núcleo jovem e contrata os melhores
 * reforços que melhoram o time, mirando ficar acima da média da divisão.
 */
export const autoStrengthen = (state: CareerState): void => {
  const div = state.pendingDivision
  const target = DIVISION_LEVEL[div] + 10
  const club = state.clubs[state.clubId]

  // contrata reforços fortes que melhoram o time, enquanto há verba
  const sorted = () => [...state.market].sort((a, b) => b.overall - a.overall)
  let guard = 0
  while (state.money > 0 && guard++ < 30) {
    const best = sorted()[0]
    if (!best || best.fee > state.money) break
    const worst = [...club.squad].sort((a, b) => a.overall - b.overall)[0]
    if (best.overall <= worst.overall) break
    if (club.squad.length >= SQUAD_MAX) sellPlayer(state, worst.id)
    if (!signPlayer(state, best.id)) break
  }

  // treino do núcleo até o time dominar a divisão (garante o acesso/título)
  guard = 0
  while (teamStrength(club) < target && guard++ < 60) {
    const core = [...club.squad].sort((a, b) => b.overall - a.overall).slice(0, 14)
    for (const p of core) if (p.age <= 32 && p.overall < 96) developPlayer(p, 2)
  }
}

export interface AutoPlayResult {
  seasons: number
  won: boolean
  history: HistoryEntry[]
}

/**
 * Joga automaticamente até zerar (campeão da Série A) ou atingir o teto de
 * temporadas. Exercita TODO o loop: rodadas, fim de temporada, transferências,
 * ofertas e transições de divisão — é a base do teste de "zerar em <1 min".
 */
export const autoPlay = (state: CareerState, maxSeasons = 30): AutoPlayResult => {
  let seasons = 0
  while (state.status !== 'won' && state.status !== 'sacked' && seasons < maxSeasons) {
    if (state.status === 'season') {
      simulateSeason(state)
    } else if (state.status === 'season_end') {
      openTransferWindow(state)
    } else if (state.status === 'transfer') {
      autoStrengthen(state)
      closeTransferWindow(state)
      seasons++
    } else if (state.status === 'offers') {
      // segue com o próprio clube (acesso é o caminho mais rápido ao topo)
      declineOffers(state)
    }
  }
  return { seasons, won: state.status === 'won', history: state.history }
}

export { fmtMoney, teamStrength, bestEleven }
