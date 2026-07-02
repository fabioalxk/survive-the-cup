import type { Role } from '../sim/types'
import type { ChaosCfg } from '../sim/chaos'
import { ROLES_433 } from '../sim/teams'
import { generatePlayer, generateSquadShaped, valueOf } from './generate'
import { ALL_CLUBS } from './worldcup'
import { wcRoster } from './worldcupPlayers'
import type { Rng } from './random'
import type { GenPlayer } from './types'
import type { NodeKind, OpponentDef, RunNode } from './runTypes'
import { offerLevelPenalty, opponentLevelBonus } from './ascension'

/** Nº de fases regulares antes do chefão (a fase STAGE_COUNT+1 é o chefão). */
export const STAGE_COUNT = 6
/**
 * Largura do grid do mapa (colunas). É de propósito MAIOR que o nº de rotas: as
 * caminhadas ocupam só parte das colunas, deixando espaço para os caminhos se
 * ramificarem, se cruzarem e voltarem a se juntar — não é uma grade cheia.
 */
export const MAP_WIDTH = 5
/**
 * Quantas "caminhadas" aleatórias desenham o mapa. As 3 primeiras partem de
 * colunas espalhadas (as ~3 rotas principais que o jogador vê na largada); as
 * demais partem de colunas aleatórias e criam as bifurcações e cruzamentos.
 */
const MAP_PATHS = 6
/** id do nó do chefão final. */
export const BOSS_ID = 'boss'

const cellId = (stage: number, col: number): string => `s${stage}-c${col}`
const clampCol = (c: number): number => Math.max(0, Math.min(MAP_WIDTH - 1, c))

/**
 * Nível-alvo (overall médio) do adversário de cada fase — sobe aos poucos
 * (o elenco cresce por carta/academia a cada vitória) e dá um salto só no
 * chefão final, para ele realmente parecer o chefão.
 */
const STAGE_LEVEL: Record<number, number> = { 1: 37, 2: 41, 3: 45, 4: 49, 5: 53, 6: 57, 7: 66 }

/** Nível-alvo do elenco inicial do jogador — abaixo da fase 1 (favorito logo de cara). */
export const START_LEVEL = 50

/** Caos "cru" — elenco inicial e adversários das fases iniciais, mais irregulares. */
const chaosFor = (stage: number): ChaosCfg => ({
  spread: 1.2 + stage * 0.06,
  jitter: 9 + stage,
  spikes: 1 + Math.floor(stage / 3),
  spikeBoost: 14 + stage * 2,
  tanks: Math.max(1, 3 - Math.floor(stage / 3)),
  tankDrop: 22 - stage,
  ceil: 99,
})

/** Caos EXTREMO das cartas de recompensa: contraste altíssimo, de propósito. */
const REWARD_CHAOS: ChaosCfg = {
  spread: 2.4,
  jitter: 28,
  spikes: 3,
  spikeBoost: 36,
  tanks: 4,
  tankDrop: 42,
  ceil: 99,
}

/** Molde de posições do elenco titular (11 = a formação inteira, sem banco de saída). */
const START_SHAPE: Role[] = ROLES_433

/**
 * Gera o elenco inicial do técnico: 11 jogadores crus, um por posição da
 * formação. Quando a seleção escolhida tem elenco real (`wcRoster`), os nomes,
 * a hierarquia (deltas) e os arquétipos saem de lá — só o NÍVEL é do modo.
 */
export const generateStartSquad = (rng: Rng, clubId: string): GenPlayer[] =>
  generateSquadShaped(START_SHAPE, START_LEVEL, chaosFor(1), rng, wcRoster(clubId))

// ---- Geradores das bênçãos da largada (tela estilo Neow, antes do 1º nó) ----

/** Nível do craque da bênção 'star' — bem acima do elenco inicial (START_LEVEL). */
const BLESS_STAR_LEVEL = 72
/** Nível da joia de 17 anos da bênção 'wonderkid' — acima do elenco, abaixo do craque. */
const BLESS_WONDERKID_LEVEL = 62
/** Reancora a idade de um jogador gerado (o valor de mercado depende dela). */
const withAge = (p: GenPlayer, age: number): GenPlayer => {
  p.age = age
  p.value = valueOf(p.overall, age)
  return p
}

/** Craque da bênção 'star': jogador de linha em idade de auge, pronto para ser titular. */
export const generateStarPlayer = (rng: Rng): GenPlayer =>
  withAge(
    generatePlayer(rng.pick(['DEF', 'MID', 'FWD', 'FWD']), BLESS_STAR_LEVEL + rng.range(-3, 3), rng.int(1, 39), rng),
    rng.int(24, 28),
  )

/** Joia da bênção 'wonderkid': 17 anos com caos extremo — picos altíssimos e buracos. */
export const generateWonderkid = (rng: Rng): GenPlayer =>
  withAge(
    generatePlayer(rng.pick(['DEF', 'MID', 'FWD']), BLESS_WONDERKID_LEVEL, rng.int(1, 39), rng, REWARD_CHAOS),
    17,
  )

/**
 * Escolhe a seleção adversária COERENTE com a fase: as seleções ficam ordenadas
 * pela força real (~2016, `strength` em worldcup.ts) e cada fase sorteia dentro
 * de uma janela dessa ordem — a fase 1 pega as mais fracas (Catar, Nova
 * Zelândia...), as fases do meio sobem degrau a degrau e o chefão sorteia só
 * entre as 5 potências do topo (Alemanha, Argentina, França...).
 */
const BAND_SIZE = 9
const pickClubId = (rng: Rng, exclude: Set<string>, stage: number): string => {
  const sorted = Object.values(ALL_CLUBS).sort((a, b) => a.strength - b.strength)
  // janela sobre a lista COMPLETA (estável entre sorteios); os já usados só
  // saem na hora do sorteio, para a banda da fase não "escorregar" de posição
  const size = stage > STAGE_COUNT ? 5 : BAND_SIZE
  const frac = Math.min(1, (stage - 1) / STAGE_COUNT)
  const center = Math.round(frac * (sorted.length - 1))
  const lo = Math.max(0, Math.min(center - Math.floor(size / 2), sorted.length - size))
  const band = sorted.slice(lo, lo + size).filter((t) => !exclude.has(t.id))
  const pool = band.length > 0 ? band : sorted.filter((t) => !exclude.has(t.id))
  const id = rng.pick(pool.length > 0 ? pool : sorted).id
  exclude.add(id)
  return id
}

/**
 * Gera o adversário (identidade + elenco de 11) de um nó de partida/chefão.
 * Seleções com elenco real (`wcRoster`) entram em campo com os nomes de
 * verdade dos jogadores e a hierarquia real entre eles; as demais seguem com
 * nomes fictícios gerados.
 */
const generateOpponent = (stage: number, rng: Rng, exclude: Set<string>, ascension: number): OpponentDef => {
  const clubId = pickClubId(rng, exclude, stage)
  const level = STAGE_LEVEL[stage] + opponentLevelBonus(ascension) + rng.range(-4, 4)
  const squad = generateSquadShaped(ROLES_433, level, chaosFor(stage), rng, wcRoster(clubId))
  return { clubId, squad }
}

/**
 * Peso de cada tipo de nó por fase. Regras embutidas do modo:
 *  • a fase 1 é sempre PARTIDA (não entra aqui — tratada à parte);
 *  • MERCADO só a partir da fase 3 (nunca nas 2 primeiras, como o usuário pediu);
 *  • a última fase puxa forte para ACADEMIA (buff antes do chefão, como o
 *    acampamento do Slay the Spire antes do boss).
 */
const KIND_WEIGHTS: Record<number, Partial<Record<NodeKind, number>>> = {
  2: { match: 70, gym: 30 },
  3: { match: 55, gym: 20, market: 25 },
  4: { match: 54, gym: 22, market: 24 },
  5: { match: 52, gym: 26, market: 22 },
  6: { match: 38, gym: 50, market: 12 },
}

/**
 * Sorteia o tipo de um nó respeitando os pesos da fase e evitando repetir o tipo
 * ESPECIAL (mercado/academia) de um "pai" — assim os mercados e academias ficam
 * espalhados de forma equilibrada entre as rotas, em vez de se amontoarem.
 */
const pickKind = (stage: number, parentKinds: (NodeKind | undefined)[], rng: Rng): NodeKind => {
  if (stage <= 1) return 'match'
  const weights = KIND_WEIGHTS[stage] ?? { match: 60, gym: 25, market: 15 }
  const blocked = new Set<NodeKind>(parentKinds.filter((k) => k === 'market' || k === 'gym'))
  const pool = (Object.entries(weights) as [NodeKind, number][]).filter(([k]) => !blocked.has(k))
  const total = pool.reduce((s, [, n]) => s + n, 0)
  let r = rng.next() * total
  for (const [k, n] of pool) if ((r -= n) < 0) return k
  return 'match'
}

/**
 * "Desenha" o grafo do mapa no estilo Slay the Spire: em vez de ligar tudo a
 * tudo, várias CAMINHADAS aleatórias sobem da fase 1 (embaixo) até a fase final
 * (em cima → chefão). Só as células tocadas por alguma caminhada viram nós, e as
 * arestas são os passos dados — então surgem ~3 rotas distintas que se ramificam,
 * se cruzam e voltam a se juntar, mas TODAS terminam no chefão. Uma aresta nunca
 * cruza a diagonal oposta já desenhada (regra do StS: mantém o traçado legível).
 */
const buildGraph = (rng: Rng): { edges: Map<string, Set<string>>; used: Set<string> } => {
  const edges = new Map<string, Set<string>>()
  const used = new Set<string>()
  // arestas diagonais já desenhadas em cada transição de fase (p/ evitar cruzamento)
  const crossed: Set<string>[] = Array.from({ length: STAGE_COUNT + 1 }, () => new Set())

  const addEdge = (from: string, to: string): void => {
    if (!edges.has(from)) edges.set(from, new Set())
    edges.get(from)!.add(to)
  }

  // TODAS as caminhadas partem de uma das 3 colunas espalhadas (esq./centro/dir.):
  // o mapa nasce com exatamente 3 entradas — os "3 caminhos" que saem do ponto
  // inicial — e vai se ramificando/cruzando fase acima até o chefão.
  const spread = [0, Math.floor((MAP_WIDTH - 1) / 2), MAP_WIDTH - 1]
  const starts = Array.from({ length: MAP_PATHS }, (_, i) => spread[i % spread.length])

  for (const start of starts) {
    let col = clampCol(start)
    used.add(cellId(1, col))
    for (let stage = 1; stage < STAGE_COUNT; stage++) {
      const options = [...new Set([col - 1, col, col + 1].map(clampCol))].filter(
        (nx) => nx === col || !crossed[stage].has(`${nx}->${col}`),
      )
      const nx = rng.pick(options)
      crossed[stage].add(`${col}->${nx}`)
      addEdge(cellId(stage, col), cellId(stage + 1, nx))
      used.add(cellId(stage + 1, nx))
      col = nx
    }
    // toda caminhada termina ligando seu nó da última fase ao chefão
    addEdge(cellId(STAGE_COUNT, col), BOSS_ID)
  }
  return { edges, used }
}

/** Garante ao menos um nó do tipo dado no mapa (troca um 'match' elegível, se faltar). */
const ensureKind = (nodes: RunNode[], kind: NodeKind, minStage: number, rng: Rng): void => {
  if (nodes.some((n) => n.kind === kind)) return
  const cands = nodes.filter((n) => n.kind === 'match' && n.stage >= minStage && n.stage <= STAGE_COUNT)
  if (cands.length === 0) return
  const target = rng.pick(cands)
  target.kind = kind
  target.opponent = undefined
}

/**
 * Gera o mapa completo (grafo + tipos + adversários). Constrói o grafo com
 * `buildGraph`, deriva os nós das células usadas, atribui os tipos respeitando as
 * regras (fase 1 sempre partida, mercado só da fase 3 em diante, academia perto
 * do chefão) e liga tudo ao chefão no topo.
 */
export const generateMap = (rng: Rng, playerClubId: string, ascension: number): RunNode[] => {
  const { edges, used } = buildGraph(rng)
  const cells = [...used]
    .map((id) => {
      const [, s, c] = /^s(\d+)-c(\d+)$/.exec(id)!
      return { id, stage: Number(s), col: Number(c) }
    })
    .sort((a, b) => a.stage - b.stage || a.col - b.col)

  // pais de cada nó (arestas invertidas) — usado para espalhar os tipos especiais
  const parents = new Map<string, string[]>()
  for (const [from, tos] of edges)
    for (const to of tos) (parents.get(to) ?? parents.set(to, []).get(to)!).push(from)

  const usedClubs = new Set<string>([playerClubId])
  const kindOf = new Map<string, NodeKind>()
  const nodes: RunNode[] = []

  for (const cell of cells) {
    const parentKinds = (parents.get(cell.id) ?? []).map((p) => kindOf.get(p))
    const kind = pickKind(cell.stage, parentKinds, rng)
    kindOf.set(cell.id, kind)
    nodes.push({
      id: cell.id,
      stage: cell.stage,
      lane: cell.col,
      kind,
      next: [...(edges.get(cell.id) ?? [])],
      opponent: kind === 'match' ? generateOpponent(cell.stage, rng, usedClubs, ascension) : undefined,
      cleared: false,
    })
  }

  // todo mapa tem pelo menos um mercado (da fase 3) e uma academia (da fase 2)
  ensureKind(nodes, 'market', 3, rng)
  ensureKind(nodes, 'gym', 2, rng)

  nodes.push({
    id: BOSS_ID,
    stage: STAGE_COUNT + 1,
    lane: Math.floor((MAP_WIDTH - 1) / 2),
    kind: 'boss',
    next: [],
    opponent: generateOpponent(STAGE_COUNT + 1, rng, usedClubs, ascension),
    cleared: false,
  })

  return nodes
}

/**
 * Gera as 3 cartas de recompensa após uma vitória: papéis variados, MUITO
 * caóticos, e de propósito ACIMA da fase atual — é a recompensa por vencer que
 * deixa o técnico mais forte que o mapa, sustentando a escalada até o chefão.
 */
export const generateRewardCards = (stage: number, rng: Rng, ascension: number): GenPlayer[] => {
  const roles: Role[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD']
  const level = STAGE_LEVEL[stage] + rng.range(18, 36) - offerLevelPenalty(ascension)
  return Array.from({ length: 3 }, () =>
    generatePlayer(rng.pick(roles), level, rng.int(1, 39), rng, REWARD_CHAOS),
  )
}
