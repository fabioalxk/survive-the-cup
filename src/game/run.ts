import type { Attrs, Vec2 } from '../sim/types'
import { clampSlot, defaultFormation, formationName } from '../sim/formation'
import type { GenPlayer } from './types'
import type { BlessingKind, PotionKind, RunNode, RunState } from './runTypes'
import { pushLog } from './log'
import { ALL_CLUBS } from './worldcup'
import {
  generateMap,
  generateRewardCards,
  generateStarPlayer,
  generateStartSquad,
  generateWonderkid,
} from './runGen'
import { generatePlayer, valueOf } from './generate'
import { slotOverallOf } from './overall'
import { bestEleven, squadStrength } from './strength'
import { quickResult } from './quicksim'
import { makeRng, mixSeed, type Rng } from './random'
import { clampAscension, gymTrains, offerLevelPenalty } from './ascension'

const RUN_VERSION = 6
export const START_COINS = 100
/** Vidas da run: pode perder 1 partida e continuar; a 2ª derrota elimina. */
export const START_LIVES = 2
/** Quanto cada melhoramento da academia soma ao atributo (teto 100). */
export const GYM_GAIN = 20

// ---- Poções: usadas num jogador, valem por UMA partida ----
/** Quanto a poção soma ao atributo — pode PASSAR de 100 (teto 150). */
export const POTION_BOOST = 50
export const POTION_ATTR_CAP = 150
export const POTIONS_MAX = 3
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

const log = (state: RunState, msg: string): void => pushLog(state.log, msg, 30)

const nodeOf = (state: RunState, id: string | null): RunNode | undefined =>
  state.nodes.find((n) => n.id === id)

/**
 * Recalcula nota geral e valor dos 11 PELO SLOT que cada um ocupa (fonte única
 * do recálculo) — chamar após qualquer mudança de atributos, ordem ou formação.
 */
export const refreshSquadRatings = (state: RunState): void => {
  state.squad.forEach((p, i) => {
    p.overall = slotOverallOf(i, state.formationSlots[i], p.attrs)
    p.value = valueOf(p.overall, p.age)
  })
}

/** Força do time 0..100 — média dos 11 (a nota de cada um já é pelo slot). */
export const xiStrength = (state: RunState): number =>
  state.squad.reduce((s, p) => s + p.overall, 0) / state.squad.length

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
    squad, // gerado na ordem dos slots do 4-3-3 (índice = slot, 0 = gol)
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
  refreshSquadRatings(state)
  return state
}

/** Rng determinístico por nó (mesma seed da run + id do nó = sempre igual num replay). */
const rngForNode = (state: RunState, nodeId: string): Rng =>
  makeRng(mixSeed(state.seed, [...nodeId].reduce((s, c) => s + c.charCodeAt(0), 0)))

/** Entra num nó disponível: abre o vestiário (pré-jogo), o mercado ou a academia. */
export const enterNode = (state: RunState, nodeId: string): void => {
  if (state.status !== 'map') return
  if (!state.availableNodeIds.includes(nodeId)) return
  const node = nodeOf(state, nodeId)
  if (!node || node.cleared) return
  state.currentNodeId = nodeId
  state.status = node.kind === 'market' ? 'market' : node.kind === 'gym' ? 'gym' : 'prematch'
}

/** Sai do vestiário e começa a partida — a ação primária da tela pré-jogo. */
export const kickOff = (state: RunState): void => {
  if (state.status !== 'prematch') return
  state.status = 'match'
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
    desc: 'Um craque de outro nível chega — você escolhe quem sai do time.',
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
    desc: 'Uma promessa de 17 anos, caótica e imprevisível, quer uma vaga no time.',
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
      log(state, `💰 Patrocínio Master: +${BLESS_COINS} moedas.`)
      break
    case 'potionkit':
      while (state.potions.length < POTIONS_MAX) state.potions.push(rng.pick(POTION_KINDS))
      log(state, `🧪 Kit do Preparador: inventário cheio (${POTIONS_MAX} poções).`)
      break
    case 'extralife':
      state.lives += 1
      log(state, `❤️ Torcida Apaixonada: +1 vida (agora ${state.lives}).`)
      break
    case 'star': {
      const p = generateStarPlayer(rng)
      state.pendingReward = [p] // entra pela MESMA tela de encaixe: alguém sai
      log(state, `🌟 ${p.name} chega como o craque — escolha o lugar dele no time.`)
      break
    }
    case 'captain': {
      const captain = [...state.squad].sort((a, b) => b.overall - a.overall)[0]
      for (const k of Object.keys(captain.attrs) as (keyof Attrs)[])
        captain.attrs[k] = clamp(captain.attrs[k] + BLESS_CAPTAIN_BOOST, 1, 100)
      refreshSquadRatings(state)
      log(state, `🎖️ ${captain.name} vestiu a braçadeira: agora ${captain.overall} OVR.`)
      break
    }
    case 'wonderkid': {
      const p = generateWonderkid(rng)
      state.pendingReward = [p] // mesma tela de encaixe da recompensa
      log(state, `💎 ${p.name}, ${p.age} anos, sobe da base — escolha o lugar dele no time.`)
      break
    }
    case 'pact':
      state.coins += BLESS_PACT_COINS
      state.lives -= 1
      log(state, `😈 Pacto com o Agente: +${BLESS_PACT_COINS} moedas, mas -1 vida (resta ${state.lives}).`)
      break
  }
}

/** Escolhe UMA das 3 bênçãos da largada e começa a jornada no mapa. */
export const pickBlessing = (state: RunState, index: number): void => {
  if (state.status !== 'blessing' || !state.pendingBlessings) return
  const kind = state.pendingBlessings[index]
  if (!kind) return
  const info = BLESSING_INFO[kind]
  // loga o rótulo genérico ANTES: craque/capitão/joia logam algo mais específico
  // (nome, OVR) dentro de applyBlessing — essa é a mensagem que deve ficar por
  // último (e por isso aparece no toast de confirmação da tela).
  log(state, `${info.emoji} Bênção da largada: ${info.label}.`)
  applyBlessing(state, kind, rngForNode(state, 'blessing:' + kind))
  state.pendingBlessings = null
  // craque/joia abrem a tela de encaixe (alguém do time dá o lugar)
  state.status = state.pendingReward ? 'reward' : 'map'
}

// =====================================================================
// POÇÕES (ganhas ao vencer; efeito de UMA partida, revertido no apito final)
// =====================================================================

/**
 * Usa uma poção do inventário num jogador: +50 no atributo correspondente,
 * podendo PASSAR de 100 (teto 150). Pode ser tomada no mapa, no vestiário ou
 * NO MEIO da partida (o motor lê os atributos ao vivo) — o efeito acaba no
 * apito final.
 */
export const usePotion = (state: RunState, index: number, playerId: number): boolean => {
  if (state.status !== 'map' && state.status !== 'prematch' && state.status !== 'match') return false
  const kind = state.potions[index]
  const p = state.squad.find((pl) => pl.id === playerId)
  if (!kind || !p) return false
  const before = p.attrs[kind]
  const amount = Math.min(POTION_ATTR_CAP, before + POTION_BOOST) - before
  if (amount <= 0) return false
  state.potions.splice(index, 1)
  p.attrs[kind] += amount
  refreshSquadRatings(state)
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
  }
  refreshSquadRatings(state)
  state.activePotions = []
  log(state, '🧪 O efeito das poções acabou — atributos de volta ao normal.')
}

/**
 * Pega a poção oferecida na tela de recompensa: vai para o inventário do
 * cabeçalho. (O drop pós-vitória foi DESLIGADO por enquanto — a tela de
 * recompensa não oferece mais poção; só o Kit do Preparador ainda dá poções.)
 */
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

/** Um lado da disputa de pênaltis: quem defende e quem cobra (do melhor ao pior finalizador). */
interface ShootoutSide {
  gk: Attrs
  takers: GenPlayer[]
}
const shootoutSide = (gk: GenPlayer, others: GenPlayer[]): ShootoutSide => ({
  gk: gk.attrs,
  takers: [...others].sort((a, b) => b.attrs.finishing - a.attrs.finishing),
})

/** Disputa de pênaltis (empate na eliminatória tem que ter um vencedor). */
const penaltyShootout = (home: ShootoutSide, away: ShootoutSide, rng: Rng): 'home' | 'away' => {
  const homeTakers = home.takers
  const awayTakers = away.takers
  const homeGk = home.gk
  const awayGk = away.gk
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
    // chefão precisa de um campeão: empate decide nos pênaltis.
    // No time do jogador, o goleiro é quem OCUPA o gol (slot 0).
    const awayXI = bestEleven(node.opponent.squad)
    const awayGk = awayXI.find((p) => p.role === 'GK') ?? awayXI[0]
    won =
      penaltyShootout(
        shootoutSide(state.squad[0], state.squad.slice(1)),
        shootoutSide(awayGk, awayXI.filter((p) => p !== awayGk)),
        rng,
      ) === 'home'
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
  kickOff(state) // "pular" direto do vestiário também vale
  if (state.status !== 'match') return
  const rng = rngForNode(state, node.id + ':quick' + attemptSalt(state))
  const home = xiStrength(state)
  const away = squadStrength(bestEleven(node.opponent.squad))
  const r = quickResult(home, away, rng)
  finishMatch(state, r.homeGoals, r.awayGoals)
}

// =====================================================================
// RECOMPENSA (cartas de reforço — o novo SEMPRE entra no lugar de alguém)
// =====================================================================

/** Fecha a tela de recompensa (a poção pendente não pega fica para trás). */
const closeReward = (state: RunState): void => {
  if (state.pendingPotion) {
    log(state, `${POTION_INFO[state.pendingPotion].emoji} A ${POTION_INFO[state.pendingPotion].label} ficou para trás…`)
  }
  state.pendingReward = null
  state.pendingPotion = null
  state.status = 'map'
}

/** Troca dois jogadores de slot no campinho (inclusive o gol — slot 0). */
export const swapSlots = (state: RunState, a: number, b: number): void => {
  const pa = state.squad[a]
  const pb = state.squad[b]
  if (!pa || !pb || a === b) return
  state.squad[a] = pb
  state.squad[b] = pa
  refreshSquadRatings(state)
  log(state, `🔁 ${pa.name} e ${pb.name} trocaram de posição.`)
}

/** Põe `newcomer` no slot escolhido; quem estava lá deixa o time de vez. Retorna quem saiu. */
const replaceAtSlot = (state: RunState, slotIndex: number, newcomer: GenPlayer): GenPlayer | null => {
  const out = state.squad[slotIndex]
  if (!out) return null
  state.squad[slotIndex] = newcomer
  refreshSquadRatings(state)
  return out
}

/** Escolhe uma carta oferecida e o slot de quem sai: o reforço entra ali na hora. */
export const pickReward = (state: RunState, index: number, slotIndex: number): void => {
  if (state.status !== 'reward' || !state.pendingReward) return
  const chosen = state.pendingReward[index]
  if (!chosen) return
  const out = replaceAtSlot(state, slotIndex, chosen)
  if (!out) return
  log(state, `Reforço: ${chosen.name} entra no lugar de ${out.name} — que deixa o time.`)
  closeReward(state)
}

/** Recusa o reforço oferecido e segue viagem com o time como está. */
export const skipReward = (state: RunState): void => {
  if (state.status !== 'reward') return
  closeReward(state)
}

// =====================================================================
// TÁTICA (formação — presets e arrasto das âncoras no pré-jogo)
// =====================================================================

/**
 * Aplica um preset de formação (4-4-2, 3-5-2…) — sempre uma CÓPIA das âncoras.
 * Também recebe o arrasto de âncoras individuais durante a partida (ver
 * MatchPlayer's `onMove`/`onPreset`, ambos repassam pra cá via `onFormationChange`)
 * — só loga quando o NOME do esquema realmente muda, senão um simples ajuste de
 * uma âncora spammaria o toast a cada solta do dedo.
 */
export const setFormation = (state: RunState, slots: Vec2[]): void => {
  if (slots.length !== 11) return
  const before = formationName(state.formationSlots)
  state.formationSlots = slots.map((s) => ({ ...s }))
  refreshSquadRatings(state) // a faixa do campo mudou → a função (e a nota) mudam junto
  const after = formationName(state.formationSlots)
  if (after !== before) log(state, `📋 Esquema ${after}.`)
}

/** Move uma âncora da formação (arrasto no campinho). O goleiro (slot 0) é fixo. */
export const moveFormationSlot = (state: RunState, index: number, pos: Vec2): void => {
  if (index <= 0 || index >= state.formationSlots.length) return
  state.formationSlots[index] = clampSlot(pos)
  refreshSquadRatings(state)
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

/** Compra um jogador do mercado direto para um slot: quem estava lá deixa o time. */
export const buyPlayer = (state: RunState, offer: ShopOffer, slotIndex: number): boolean => {
  if (state.status !== 'market') return false
  if (state.coins < offer.fee) return false
  const out = replaceAtSlot(state, slotIndex, offer.player)
  if (!out) return false
  state.coins -= offer.fee
  log(state, `Contratado: ${offer.player.name} por ${offer.fee} moedas — ${out.name} deixa o time.`)
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
  const before = p.attrs[attr]
  p.attrs[attr] = clamp(before + GYM_GAIN, 1, 100)
  const gained = p.attrs[attr] - before
  refreshSquadRatings(state)
  log(state, `${p.name} treinou forte: +${gained} em atributo, agora ${p.overall} OVR.`)
  return true
}

// =====================================================================
// AUTO-PLAY — joga a run inteira sozinha (usado por testes headless e por um
// eventual botão de "simular resto" na UI).
// =====================================================================

/**
 * Melhor encaixe de `candidate` no time: o slot onde ele mais eleva a nota em
 * relação a quem o ocupa hoje (ganho por slot — pode ser negativo em todos).
 */
const bestFitOf = (state: RunState, candidate: GenPlayer): { slot: number; gain: number } => {
  let slot = 0
  let gain = -Infinity
  state.squad.forEach((p, i) => {
    const g = slotOverallOf(i, state.formationSlots[i], candidate.attrs) - p.overall
    if (g > gain) {
      gain = g
      slot = i
    }
  })
  return { slot, gain }
}

/** Reforça o time num nó de mercado: compra o melhor upgrade acessível, encaixando no melhor slot. */
const autoShop = (state: RunState): void => {
  let guard = 0
  while (guard++ < 10) {
    const options = shopOffers(state)
      .filter((o) => state.coins >= o.fee)
      .map((o) => ({ o, fit: bestFitOf(state, o.player) }))
      .sort((a, b) => b.fit.gain - a.fit.gain)
    const best = options[0]
    if (!best || best.fit.gain <= 3) break
    buyPlayer(state, best.o, best.fit.slot)
  }
}

/**
 * Usa os melhoramentos da academia no melhor jogador — bot BURRO de propósito:
 * treina o atributo mais FRACO dentre os que valem algo no slot dele (nada de
 * otimizar o ganho, senão o selftest deixa de medir a dificuldade do jogo).
 */
const autoGym = (state: RunState): void => {
  let idx = 0
  state.squad.forEach((p, i) => {
    if (p.overall > state.squad[idx].overall) idx = i
  })
  const target = state.squad[idx]
  const slot = state.formationSlots[idx]
  const trainedOvr = (k: keyof Attrs): number =>
    slotOverallOf(idx, slot, { ...target.attrs, [k]: Math.min(100, target.attrs[k] + GYM_GAIN) })
  for (let i = 0; i < gymTrains(state.ascension); i++) {
    const keys = (Object.keys(target.attrs) as (keyof Attrs)[]).filter(
      (k) => target.attrs[k] < 100 && trainedOvr(k) > target.overall,
    )
    if (keys.length === 0) break
    const weakest = keys.reduce((a, b) => (target.attrs[a] <= target.attrs[b] ? a : b))
    boostAttribute(state, target.id, weakest)
  }
}

/** Escolhe a carta e o slot que MAIS reforçam o time — ou recusa, se nenhuma melhora nada. */
const autoPickReward = (state: RunState): void => {
  if (!state.pendingReward) return
  let best: { index: number; slot: number; gain: number } | null = null
  for (const [index, cand] of state.pendingReward.entries()) {
    const fit = bestFitOf(state, cand)
    if (!best || fit.gain > best.gain) best = { index, slot: fit.slot, gain: fit.gain }
  }
  if (!best || best.gain <= 0) skipReward(state)
  else pickReward(state, best.index, best.slot)
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
      // antes de uma partida, esvazia o inventário de poções no melhor jogador
      if (pick.kind === 'match' || pick.kind === 'boss') {
        const target = [...state.squad].sort((a, b) => b.overall - a.overall)[0]
        if (target) for (let i = state.potions.length - 1; i >= 0; i--) usePotion(state, i, target.id)
      }
      enterNode(state, pick.id)
      nodesVisited++
    } else if (state.status === 'prematch' || state.status === 'match') {
      quickPlayNode(state)
    } else if (state.status === 'reward') {
      claimPotion(state)
      autoPickReward(state)
    } else if (state.status === 'lifelost') {
      continueAfterDefeat(state)
    } else if (state.status === 'market') {
      autoShop(state)
      leaveNode(state)
    } else if (state.status === 'gym') {
      autoGym(state)
      leaveNode(state)
    }
  }
  return { won: state.status === 'victory', stageReached: state.stage, nodesVisited }
}

export { ALL_CLUBS }
