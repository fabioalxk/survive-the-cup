import type { Attrs, Vec2 } from '../sim/types'
import { clampSlot, defaultFormation } from '../sim/formation'
import type { GenPlayer } from './types'
import type { BlessingKind, PotionKind, RunNode, RunState } from './runTypes'
import { ALL_CLUBS } from './worldcup'
import {
  generateMap,
  generateRewardCards,
  generateStarPlayer,
  generateStartSquad,
  generateWonderkid,
} from './runGen'
import { generatePlayer, valueOf } from './generate'
import { overallOf } from './overall'
import { bestEleven, squadStrength } from './strength'
import { quickResult } from './quicksim'
import { makeRng, mixSeed, type Rng } from './random'
import { clampAscension, gymTrains, offerLevelPenalty } from './ascension'

const RUN_VERSION = 5
export const START_COINS = 100
/** Vidas da run: pode perder 1 partida e continuar; a 2ª derrota elimina. */
export const START_LIVES = 2
export const SQUAD_MIN = 11
export const SQUAD_MAX = 23
/** Quanto cada melhoramento da academia soma ao atributo (teto 100). */
export const GYM_GAIN = 20

// ---- Poções: ganhas ao vencer, usadas num jogador, valem por UMA partida ----
/** Quanto a poção soma ao atributo — pode PASSAR de 100 (teto 150). */
export const POTION_BOOST = 50
export const POTION_ATTR_CAP = 150
export const POTIONS_MAX = 3
/** Chance de uma vitória (fora o chefão) render uma poção. */
const POTION_DROP_CHANCE = 0.5
export const POTION_KINDS: PotionKind[] = ['strength', 'pace']
export const POTION_INFO: Record<PotionKind, { label: string; emoji: string }> = {
  strength: { label: 'Poção de Força', emoji: '💪' },
  pace: { label: 'Poção de Velocidade', emoji: '⚡' },
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))

/** Valor de mercado desta run, em MOEDAS (escala bem menor que o R$ da liga). */
export const coinValueOf = (overall: number, age: number): number => {
  const base = Math.pow(Math.max(0, overall - 35) / 10, 2.1) * 6
  const ageMul = age <= 24 ? 1.15 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.45
  return Math.max(4, Math.round(base * ageMul))
}

const log = (state: RunState, msg: string): void => {
  state.log.unshift(msg)
  if (state.log.length > 30) state.log.pop()
}

const nodeOf = (state: RunState, id: string | null): RunNode | undefined =>
  state.nodes.find((n) => n.id === id)

/** Garante 11 titulares válidos (some jogador vendido/trocado é reposto pelo melhor do banco). */
const ensureStartingXI = (state: RunState): void => {
  const squadIds = new Set(state.squad.map((p) => p.id))
  state.startingIds = state.startingIds.filter((id) => squadIds.has(id))
  if (state.startingIds.length >= 11) {
    state.startingIds = state.startingIds.slice(0, 11)
    return
  }
  const starters = new Set(state.startingIds)
  const fill = bestEleven(state.squad.filter((p) => !starters.has(p.id)))
  for (const p of fill) {
    if (state.startingIds.length >= 11) break
    state.startingIds.push(p.id)
  }
}

/** Cria uma nova corrida: técnico + clube escolhido, elenco cru de 11, mapa gerado. */
export const newRun = (managerName: string, clubId: string, seed: number, ascension = 0): RunState => {
  ascension = clampAscension(ascension)
  const rng = makeRng(seed)
  const squad = generateStartSquad(rng, clubId)
  const nodes = generateMap(rng, clubId, ascension)
  const state: RunState = {
    version: RUN_VERSION,
    seed,
    managerName,
    clubId,
    ascension,
    squad,
    startingIds: bestEleven(squad).map((p) => p.id),
    formationSlots: defaultFormation(),
    coins: START_COINS,
    lives: START_LIVES,
    stage: 0,
    nodes,
    availableNodeIds: nodes.filter((n) => n.stage === 1).map((n) => n.id),
    currentNodeId: null,
    pendingReward: null,
    potions: [],
    activePotions: [],
    pendingPotion: null,
    pendingBlessings: rollBlessings(rng),
    lastMatch: null,
    status: 'blessing',
    log: [
      `${managerName} assume o ${ALL_CLUBS[clubId]?.name ?? clubId} para a jornada.${ascension > 0 ? ` 🔥 Ascension ${ascension}.` : ''}`,
    ],
  }
  return state
}

/** Rng determinístico por nó (mesma seed da run + id do nó = sempre igual num replay). */
const rngForNode = (state: RunState, nodeId: string): Rng =>
  makeRng(mixSeed(state.seed, [...nodeId].reduce((s, c) => s + c.charCodeAt(0), 0)))

export const startingXI = (state: RunState): GenPlayer[] =>
  state.squad.filter((p) => state.startingIds.includes(p.id))

/** Entra num nó disponível: abre a partida, o mercado ou a academia. */
export const enterNode = (state: RunState, nodeId: string): void => {
  if (state.status !== 'map') return
  if (!state.availableNodeIds.includes(nodeId)) return
  const node = nodeOf(state, nodeId)
  if (!node || node.cleared) return
  state.currentNodeId = nodeId
  state.status = node.kind === 'market' ? 'market' : node.kind === 'gym' ? 'gym' : 'match'
}

/** Volta ao mapa a partir de um nó de mercado/academia, liberando a próxima fase. */
export const leaveNode = (state: RunState): void => {
  const node = nodeOf(state, state.currentNodeId)
  if (!node || (node.kind !== 'market' && node.kind !== 'gym')) return
  clearNode(state, node)
}

/**
 * Marca o nó como concluído e avança o "cursor" do mapa: só se escolhe UM
 * caminho por corrida (como no Slay the Spire) — os outros nós da mesma fase
 * continuam visíveis no mapa (mostram o caminho não escolhido) mas deixam de
 * ser alcançáveis; só os nós ligados ao que acabou de ser limpo ficam disponíveis.
 */
const clearNode = (state: RunState, node: RunNode): void => {
  node.cleared = true
  state.stage = node.stage
  state.availableNodeIds = node.next
  state.currentNodeId = null
  state.status = 'map'
}

// =====================================================================
// BÊNÇÃO DA LARGADA (estilo Neow do Slay the Spire): 3 ofertas antes do
// 1º nó — 1 segura, 1 de poder e 1 amaldiçoada. O jogador leva UMA.
// =====================================================================

export const BLESS_COINS = 150
export const BLESS_PACT_COINS = 300
export const BLESS_CAPTAIN_BOOST = 10

export type BlessingTone = 'safe' | 'power' | 'cursed'

export const BLESSING_INFO: Record<
  BlessingKind,
  { emoji: string; label: string; desc: string; tone: BlessingTone }
> = {
  sponsor: {
    emoji: '💰',
    label: 'Patrocínio Master',
    desc: `Ganhe ${BLESS_COINS} moedas para gastar no mercado.`,
    tone: 'safe',
  },
  potionkit: {
    emoji: '🧪',
    label: 'Kit do Preparador',
    desc: `Comece com o inventário cheio: ${POTIONS_MAX} poções sortidas.`,
    tone: 'safe',
  },
  extralife: {
    emoji: '❤️',
    label: 'Torcida Apaixonada',
    desc: 'Ganhe 1 vida extra para a jornada inteira.',
    tone: 'safe',
  },
  star: {
    emoji: '🌟',
    label: 'O Craque',
    desc: 'Um craque de outro nível chega e já assume a titularidade.',
    tone: 'power',
  },
  captain: {
    emoji: '🎖️',
    label: 'Braçadeira de Capitão',
    desc: `Seu melhor jogador ganha +${BLESS_CAPTAIN_BOOST} em TODOS os atributos.`,
    tone: 'power',
  },
  wonderkid: {
    emoji: '💎',
    label: 'Joia da Base',
    desc: 'Uma promessa de 17 anos, caótica e imprevisível, sobe para o elenco.',
    tone: 'power',
  },
  pact: {
    emoji: '😈',
    label: 'Pacto com o Agente',
    desc: `Ganhe ${BLESS_PACT_COINS} moedas… mas PERDE 1 vida.`,
    tone: 'cursed',
  },
}

const blessingsOf = (tone: BlessingTone): BlessingKind[] =>
  (Object.keys(BLESSING_INFO) as BlessingKind[]).filter((k) => BLESSING_INFO[k].tone === tone)

/** Sorteia as 3 ofertas da largada: sempre 1 segura + 1 de poder + 1 amaldiçoada. */
const rollBlessings = (rng: Rng): BlessingKind[] =>
  (['safe', 'power', 'cursed'] as BlessingTone[]).map((tone) => rng.pick(blessingsOf(tone)))

const applyBlessing = (state: RunState, kind: BlessingKind, rng: Rng): void => {
  switch (kind) {
    case 'sponsor':
      state.coins += BLESS_COINS
      break
    case 'potionkit':
      while (state.potions.length < POTIONS_MAX) state.potions.push(rng.pick(POTION_KINDS))
      break
    case 'extralife':
      state.lives += 1
      break
    case 'star': {
      const p = generateStarPlayer(rng)
      state.squad.push(p)
      optimizeStartingXI(state)
      log(state, `🌟 ${p.name} (${p.overall} OVR) chega como o craque do time.`)
      break
    }
    case 'captain': {
      const captain = [...startingXI(state)].sort((a, b) => b.overall - a.overall)[0]
      for (const k of Object.keys(captain.attrs) as (keyof Attrs)[])
        captain.attrs[k] = clamp(captain.attrs[k] + BLESS_CAPTAIN_BOOST, 1, 100)
      refreshRating(captain)
      log(state, `🎖️ ${captain.name} vestiu a braçadeira: agora ${captain.overall} OVR.`)
      break
    }
    case 'wonderkid': {
      const p = generateWonderkid(rng)
      state.squad.push(p)
      log(state, `💎 ${p.name}, ${p.age} anos, sobe da base (${p.overall} OVR) para o banco.`)
      break
    }
    case 'pact':
      state.coins += BLESS_PACT_COINS
      state.lives -= 1
      break
  }
}

/** Escolhe UMA das 3 bênçãos da largada e começa a jornada no mapa. */
export const pickBlessing = (state: RunState, index: number): void => {
  if (state.status !== 'blessing' || !state.pendingBlessings) return
  const kind = state.pendingBlessings[index]
  if (!kind) return
  applyBlessing(state, kind, rngForNode(state, 'blessing:' + kind))
  const info = BLESSING_INFO[kind]
  log(state, `${info.emoji} Bênção da largada: ${info.label}.`)
  state.pendingBlessings = null
  state.status = 'map'
}

// =====================================================================
// POÇÕES (ganhas ao vencer; efeito de UMA partida, revertido no apito final)
// =====================================================================

/** Recalcula nota geral e valor após mudar atributos (fonte única do recálculo). */
const refreshRating = (p: GenPlayer): void => {
  p.overall = overallOf(p.role, p.attrs)
  p.value = valueOf(p.overall, p.age)
}

/**
 * Usa uma poção do inventário num jogador: +50 no atributo correspondente,
 * podendo PASSAR de 100 (teto 150). Pode ser tomada no mapa ou NO MEIO da
 * partida (o motor lê os atributos ao vivo) — o efeito acaba no apito final.
 */
export const usePotion = (state: RunState, index: number, playerId: number): boolean => {
  if (state.status !== 'map' && state.status !== 'match') return false
  const kind = state.potions[index]
  const p = state.squad.find((pl) => pl.id === playerId)
  if (!kind || !p) return false
  const before = p.attrs[kind]
  const amount = Math.min(POTION_ATTR_CAP, before + POTION_BOOST) - before
  if (amount <= 0) return false
  state.potions.splice(index, 1)
  p.attrs[kind] += amount
  refreshRating(p)
  state.activePotions.push({ playerId, attr: kind, amount })
  const info = POTION_INFO[kind]
  log(state, `${info.emoji} ${p.name} tomou a ${info.label}: ${before} → ${p.attrs[kind]} até o fim da partida.`)
  return true
}

/** Apito final: reverte todos os efeitos de poção (o boost vale por UMA partida). */
const expirePotions = (state: RunState): void => {
  if (state.activePotions.length === 0) return
  for (const a of state.activePotions) {
    const p = state.squad.find((pl) => pl.id === a.playerId)
    if (!p) continue
    p.attrs[a.attr] -= a.amount
    refreshRating(p)
  }
  state.activePotions = []
  log(state, '🧪 O efeito das poções acabou — atributos de volta ao normal.')
}

/** Vitória pode OFERECER uma poção (se houver espaço) — pegar é um clique na recompensa. */
const maybeDropPotion = (state: RunState, rng: Rng): void => {
  state.pendingPotion = null
  if (state.potions.length >= POTIONS_MAX || rng.next() >= POTION_DROP_CHANCE) return
  const kind = rng.pick(POTION_KINDS)
  state.pendingPotion = kind
  log(state, `${POTION_INFO[kind].emoji} A vitória rendeu uma ${POTION_INFO[kind].label} — pegue-a na recompensa!`)
}

/** Pega a poção oferecida na tela de recompensa: vai para o inventário do cabeçalho. */
export const claimPotion = (state: RunState): boolean => {
  if (state.status !== 'reward' || !state.pendingPotion) return false
  if (state.potions.length >= POTIONS_MAX) return false
  const kind = state.pendingPotion
  state.potions.push(kind)
  state.pendingPotion = null
  log(state, `${POTION_INFO[kind].emoji} ${POTION_INFO[kind].label} guardada — use-a num jogador antes de uma partida.`)
  return true
}

// =====================================================================
// PARTIDAS
// =====================================================================

const penaltyChance = (finishing: number, composure: number, gk: Attrs): number => {
  const off = (finishing + composure) / 2 / 100
  const def = gk.goalkeeping / 100
  return clamp(0.55 + off * 0.4 - def * 0.28, 0.3, 0.95)
}

/** Disputa de pênaltis (empate na eliminatória tem que ter um vencedor). */
const penaltyShootout = (home: GenPlayer[], away: GenPlayer[], rng: Rng): 'home' | 'away' => {
  const takers = (squad: GenPlayer[]) =>
    [...squad].filter((p) => p.role !== 'GK').sort((a, b) => b.attrs.finishing - a.attrs.finishing)
  const gkOf = (squad: GenPlayer[]) => squad.find((p) => p.role === 'GK') ?? squad[0]
  const homeTakers = takers(home)
  const awayTakers = takers(away)
  const homeGk = gkOf(home).attrs
  const awayGk = gkOf(away).attrs
  let hs = 0
  let as_ = 0
  for (let round = 0; round < 5; round++) {
    const ht = homeTakers[round % homeTakers.length]
    const at = awayTakers[round % awayTakers.length]
    if (rng.next() < penaltyChance(ht.attrs.finishing, ht.attrs.positioning, awayGk)) hs++
    if (rng.next() < penaltyChance(at.attrs.finishing, at.attrs.positioning, homeGk)) as_++
  }
  // morte súbita: continua cobrando em pares até desempatar
  let round = 5
  while (hs === as_ && round < 25) {
    const ht = homeTakers[round % homeTakers.length]
    const at = awayTakers[round % awayTakers.length]
    if (rng.next() < penaltyChance(ht.attrs.finishing, ht.attrs.positioning, awayGk)) hs++
    if (rng.next() < penaltyChance(at.attrs.finishing, at.attrs.positioning, homeGk)) as_++
    round++
  }
  return hs >= as_ ? 'home' : 'away'
}

/** Recompensa em moedas por vencer um nó de partida — cresce com a fase. */
const matchReward = (stage: number, rng: Rng): number => 30 + stage * 8 + rng.int(0, 15)

/** Sufixo de rng por tentativa: um replay após perder uma vida não repete o mesmo resultado. */
const attemptSalt = (state: RunState): string => `:t${START_LIVES - state.lives}`

/**
 * Resolve o desfecho de uma partida jogada (animada ou rápida) e avança a run:
 * - vitória: recompensa cheia em moedas + 3 cartas (ou o troféu, no chefão);
 * - empate: classifica sem brilho — metade das moedas, sem cartas (só o chefão
 *   exige um campeão e vai para os pênaltis);
 * - derrota: consome 1 vida; sem vidas restantes, elimina.
 */
export const finishMatch = (state: RunState, homeGoals: number, awayGoals: number): void => {
  const node = nodeOf(state, state.currentNodeId)
  if (!node || !node.opponent || state.status !== 'match') return
  const rng = rngForNode(state, node.id + attemptSalt(state))
  const oppName = ALL_CLUBS[node.opponent.clubId]?.name ?? node.opponent.clubId
  const draw = homeGoals === awayGoals

  if (draw && node.kind !== 'boss') {
    const reward = Math.max(1, Math.round(matchReward(node.stage, rng) / 2))
    state.coins += reward
    state.lastMatch = { oppName, homeGoals, awayGoals, won: false, drawn: true, stage: node.stage }
    log(state, `Empate com o ${oppName} (${homeGoals}×${awayGoals}). Classificado: +${reward} moedas, sem reforço.`)
    expirePotions(state)
    clearNode(state, node)
    return
  }

  let won = homeGoals > awayGoals
  if (draw) {
    // chefão precisa de um campeão: empate decide nos pênaltis
    won = penaltyShootout(startingXI(state), bestEleven(node.opponent.squad), rng) === 'home'
  }
  // pênaltis inclusos, a partida acabou: o efeito das poções termina aqui
  expirePotions(state)
  state.lastMatch = { oppName, homeGoals, awayGoals, won, drawn: false, stage: node.stage }

  if (!won) {
    state.lives -= 1
    if (state.lives <= 0) {
      log(state, `Eliminado! Derrota para o ${oppName} (${homeGoals}×${awayGoals}) — as vidas acabaram.`)
      state.status = 'gameover'
      return
    }
    log(state, `Derrota para o ${oppName} (${homeGoals}×${awayGoals}). 💔 Perdeu 1 vida — resta ${state.lives}.`)
    state.currentNodeId = null
    state.status = 'lifelost'
    return
  }

  const reward = matchReward(node.stage, rng)
  state.coins += reward
  log(state, `Vitória sobre o ${oppName} (${homeGoals}×${awayGoals})! +${reward} moedas.`)

  if (node.kind === 'boss') {
    clearNode(state, node)
    state.status = 'victory'
    log(state, `🏆 ${state.managerName} venceu o chefão final!`)
    return
  }

  state.pendingReward = generateRewardCards(node.stage, rng, state.ascension)
  maybeDropPotion(state, rng)
  clearNode(state, node)
  state.status = 'reward'
}

/** Fecha o aviso de vida perdida e volta ao mapa (o nó perdido continua disponível para revanche). */
export const continueAfterDefeat = (state: RunState): void => {
  if (state.status !== 'lifelost') return
  state.status = 'map'
}

/** Simula a partida do nó atual instantaneamente (pular/auto-play), sem animação. */
export const quickPlayNode = (state: RunState): void => {
  const node = nodeOf(state, state.currentNodeId)
  if (!node || !node.opponent) return
  const rng = rngForNode(state, node.id + ':quick' + attemptSalt(state))
  const home = squadStrength(startingXI(state))
  const away = squadStrength(bestEleven(node.opponent.squad))
  const r = quickResult(home, away, rng)
  finishMatch(state, r.homeGoals, r.awayGoals)
}

// =====================================================================
// RECOMPENSA (3 cartas)
// =====================================================================

/** Escolhe uma das 3 cartas oferecidas: entra no elenco pelo BANCO (não titular). */
export const pickReward = (state: RunState, index: number): void => {
  if (state.status !== 'reward' || !state.pendingReward) return
  const chosen = state.pendingReward[index]
  if (!chosen) return
  state.squad.push(chosen)
  if (state.squad.length > SQUAD_MAX) {
    const worst = [...state.squad].sort((a, b) => a.overall - b.overall)[0]
    if (worst.id !== chosen.id) state.squad = state.squad.filter((p) => p.id !== worst.id)
  }
  log(state, `Reforço: ${chosen.name} (${chosen.overall} OVR) entra no banco.`)
  if (state.pendingPotion) {
    log(state, `${POTION_INFO[state.pendingPotion].emoji} A ${POTION_INFO[state.pendingPotion].label} ficou para trás…`)
  }
  state.pendingReward = null
  state.pendingPotion = null
  ensureStartingXI(state)
  state.status = 'map'
}

// =====================================================================
// ESCALAÇÃO (titulares × banco)
// =====================================================================

/** Promove um reserva a titular no lugar de um titular escolhido (troca simples). */
export const swapStarter = (state: RunState, benchId: number, starterId: number): void => {
  const idx = state.startingIds.indexOf(starterId)
  if (idx < 0) return
  if (!state.squad.some((p) => p.id === benchId)) return
  if (state.startingIds.includes(benchId)) return
  state.startingIds[idx] = benchId
}

/**
 * Há algum reserva no banco melhor que o titular mais fraco da mesma posição?
 * Usado pra acender um aviso ("dá pra melhorar o time") na aba Meu Time.
 */
export const benchHasUpgrade = (state: RunState): boolean => {
  const starters = state.squad.filter((p) => state.startingIds.includes(p.id))
  const bench = state.squad.filter((p) => !state.startingIds.includes(p.id))
  return bench.some((b) => {
    const sameRole = starters.filter((s) => s.role === b.role)
    const worst = sameRole.length ? sameRole : starters
    return worst.some((s) => b.overall > s.overall)
  })
}

/** Escala automaticamente os 11 melhores do elenco (botão "melhor time" na UI). */
export const optimizeStartingXI = (state: RunState): void => {
  state.startingIds = bestEleven(state.squad).map((p) => p.id)
}

// =====================================================================
// TÁTICA (formação — presets e arrasto das âncoras na aba Tática)
// =====================================================================

/** Aplica um preset de formação (4-4-2, 3-5-2…) — sempre uma CÓPIA das âncoras. */
export const setFormation = (state: RunState, slots: Vec2[]): void => {
  if (slots.length !== 11) return
  state.formationSlots = slots.map((s) => ({ ...s }))
}

/** Move uma âncora da formação (arrasto no campinho). O goleiro (slot 0) é fixo. */
export const moveFormationSlot = (state: RunState, index: number, pos: Vec2): void => {
  if (index <= 0 || index >= state.formationSlots.length) return
  state.formationSlots[index] = clampSlot(pos)
}

// =====================================================================
// MERCADO (só dentro de um nó de mercado)
// =====================================================================

export interface ShopOffer {
  player: GenPlayer
  fee: number
}

/** Gera a oferta do mercado deste nó (determinística — mesma cada vez que se abre). */
export const shopOffers = (state: RunState): ShopOffer[] => {
  const node = nodeOf(state, state.currentNodeId)
  if (!node || node.kind !== 'market') return []
  const rng = rngForNode(state, node.id + ':shop')
  const roles = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'] as const
  const level = 45 + node.stage * 6 - offerLevelPenalty(state.ascension)
  return Array.from({ length: 5 }, () => {
    const p = generatePlayer(rng.pick([...roles]), level + rng.range(-6, 14), rng.int(1, 39), rng)
    return { player: p, fee: Math.max(4, Math.round(coinValueOf(p.overall, p.age) * rng.range(0.9, 1.2))) }
  })
}

/** Compra um jogador do mercado deste nó (soma ao elenco, pelo banco). */
export const buyPlayer = (state: RunState, offer: ShopOffer): boolean => {
  if (state.status !== 'market') return false
  if (state.coins < offer.fee || state.squad.length >= SQUAD_MAX) return false
  state.coins -= offer.fee
  state.squad.push(offer.player)
  log(state, `Contratado: ${offer.player.name} por ${offer.fee} moedas.`)
  ensureStartingXI(state)
  return true
}

/** Vende um jogador do elenco (nunca pode ficar com menos de 11). */
export const sellPlayer = (state: RunState, playerId: number): boolean => {
  if (state.status !== 'market') return false
  if (state.squad.length <= SQUAD_MIN) return false
  const idx = state.squad.findIndex((p) => p.id === playerId)
  if (idx < 0) return false
  const p = state.squad[idx]
  const fee = Math.round(coinValueOf(p.overall, p.age) * 0.85)
  state.squad.splice(idx, 1)
  state.coins += fee
  log(state, `Vendido: ${p.name} por ${fee} moedas.`)
  ensureStartingXI(state)
  return true
}

// =====================================================================
// ACADEMIA (só dentro de um nó de academia)
// =====================================================================

/** Bufa MUITO um atributo de um jogador (+GYM_GAIN, teto 100) — usos por nó de academia limitados por `gymTrains`. */
export const boostAttribute = (state: RunState, playerId: number, attr: keyof Attrs): boolean => {
  if (state.status !== 'gym') return false
  const p = state.squad.find((pl) => pl.id === playerId)
  // já no teto do treino (ou acima dele, por poção) — não pode reduzir o atributo
  if (!p || p.attrs[attr] >= 100) return false
  p.attrs[attr] = clamp(p.attrs[attr] + GYM_GAIN, 1, 100)
  refreshRating(p)
  log(state, `${p.name} treinou forte: +${GYM_GAIN} em atributo, agora ${p.overall} OVR.`)
  return true
}

// =====================================================================
// AUTO-PLAY — joga a run inteira sozinha (usado por testes headless e por um
// eventual botão de "simular resto" na UI).
// =====================================================================

/**
 * Ganho na força do MELHOR XI possível se `candidate` entrasse no elenco —
 * conta o encaixe de posição de verdade (um GK a mais só ajuda se for melhor
 * que o titular atual), não só a nota bruta da carta.
 */
const xiGainOf = (state: RunState, candidate: GenPlayer): number =>
  squadStrength([...state.squad, candidate]) - squadStrength(state.squad)

/** Reforça o elenco num nó de mercado: vende o pior banco e compra o melhor upgrade acessível. */
const autoShop = (state: RunState): void => {
  let guard = 0
  while (guard++ < 10) {
    const offers = shopOffers(state)
      .filter((o) => state.coins >= o.fee)
      .sort((a, b) => xiGainOf(state, b.player) - xiGainOf(state, a.player))
    const best = offers[0]
    if (!best || xiGainOf(state, best.player) <= 0.3) break
    if (state.squad.length >= SQUAD_MAX) {
      const worstBench = [...state.squad]
        .filter((p) => !state.startingIds.includes(p.id))
        .sort((a, b) => a.overall - b.overall)[0]
      if (worstBench) sellPlayer(state, worstBench.id)
      else break
    }
    buyPlayer(state, best)
  }
}

/** Usa os melhoramentos da academia no melhor titular, sempre no atributo mais fraco atual. */
const autoGym = (state: RunState): void => {
  const xi = startingXI(state)
  if (xi.length === 0) return
  const target = [...xi].sort((a, b) => b.overall - a.overall)[0]
  const keys = Object.keys(target.attrs) as (keyof Attrs)[]
  for (let i = 0; i < gymTrains(state.ascension); i++) {
    const weakest = keys.reduce((a, b) => (target.attrs[a] < target.attrs[b] ? a : b))
    boostAttribute(state, target.id, weakest)
  }
}

/** Escolhe a carta de recompensa que MAIS reforça o melhor XI possível (encaixe de posição real). */
const autoPickReward = (state: RunState): void => {
  if (!state.pendingReward) return
  let best = 0
  let bestGain = -Infinity
  for (let i = 0; i < state.pendingReward.length; i++) {
    const gain = xiGainOf(state, state.pendingReward[i])
    if (gain > bestGain) {
      bestGain = gain
      best = i
    }
  }
  pickReward(state, best)
}

export interface RunAutoPlayResult {
  won: boolean
  stageReached: number
  nodesVisited: number
}

/**
 * Joga a run inteira sozinha até vencer o chefão ou ser eliminado — exercita
 * TODO o loop (mapa, partidas, recompensa, mercado, academia). Base do teste
 * headless que prova que a run é jogável e vencível de ponta a ponta.
 */
export const autoPlayRun = (state: RunState, maxNodes = 60): RunAutoPlayResult => {
  let nodesVisited = 0
  while (state.status !== 'gameover' && state.status !== 'victory' && nodesVisited < maxNodes) {
    if (state.status === 'blessing') {
      pickBlessing(state, 1) // o bot leva sempre a bênção de PODER (índice 1)
    } else if (state.status === 'map') {
      const candidates = state.availableNodeIds
        .map((id) => nodeOf(state, id))
        .filter((n): n is RunNode => !!n && !n.cleared)
      if (candidates.length === 0) break
      // prioriza a PARTIDA (é o motor de moedas/cartas do jogo) — só desvia para
      // mercado/academia quando o caminho atual não dá acesso a um confronto.
      const pick =
        candidates.find((n) => n.kind === 'match' || n.kind === 'boss') ??
        candidates.find((n) => n.kind === 'gym') ??
        candidates[0]
      // antes de uma partida, esvazia o inventário de poções no melhor titular
      if (pick.kind === 'match' || pick.kind === 'boss') {
        const target = [...startingXI(state)].sort((a, b) => b.overall - a.overall)[0]
        if (target) for (let i = state.potions.length - 1; i >= 0; i--) usePotion(state, i, target.id)
      }
      enterNode(state, pick.id)
      nodesVisited++
    } else if (state.status === 'match') {
      quickPlayNode(state)
    } else if (state.status === 'reward') {
      claimPotion(state)
      autoPickReward(state)
      optimizeStartingXI(state)
    } else if (state.status === 'lifelost') {
      continueAfterDefeat(state)
    } else if (state.status === 'market') {
      autoShop(state)
      optimizeStartingXI(state)
      leaveNode(state)
    } else if (state.status === 'gym') {
      autoGym(state)
      leaveNode(state)
    }
  }
  return { won: state.status === 'victory', stageReached: state.stage, nodesVisited }
}

export { ALL_CLUBS }
