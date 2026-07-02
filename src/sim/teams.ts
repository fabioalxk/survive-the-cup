import type { Attrs, Role, TeamId, Vec2 } from './types'
import { applyChaos, type ChaosCfg } from './chaos'

export interface TeamInfo {
  id: TeamId
  name: string
  of: string // artigo + nome, p/ narração ("do Brasil")
  flag: string // caminho do SVG da bandeira (emoji de bandeira não renderiza no Windows)
  shirt: string // cor do uniforme
  text: string // cor do número
}

export const TEAMS: Record<TeamId, TeamInfo> = {
  home: { id: 'home', name: 'Brasil', of: 'do Brasil', flag: '/flags/br.svg', shirt: '#fde047', text: '#15803d' },
  away: { id: 'away', name: 'Argentina', of: 'da Argentina', flag: '/flags/ar.svg', shirt: '#7dd3fc', text: '#1e3a8a' },
}

/** Slots da formação 4-3-3 (coordenadas "atacando para a DIREITA"), em metros. */
export const FORMATION_433: Vec2[] = [
  { x: 5, y: 34 }, // GK
  { x: 20, y: 12 }, // RB
  { x: 17, y: 27 }, // CB
  { x: 17, y: 41 }, // CB
  { x: 20, y: 56 }, // LB
  { x: 42, y: 20 }, // MC dir
  { x: 39, y: 34 }, // MC centro
  { x: 42, y: 48 }, // MC esq
  { x: 72, y: 15 }, // PD
  { x: 74, y: 34 }, // CA
  { x: 72, y: 53 }, // PE
]

export const ROLES_433: Role[] = [
  'GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD',
]

/** Base de atributos por posição (escala 0..100); cada jogador sobrescreve o que se destaca. */
export const baseAttrs = (role: Role): Attrs => {
  const b: Attrs = {
    // físico
    pace: 65, acceleration: 65, strength: 65,
    // técnico
    dribbling: 60, firstTouch: 62, passing: 64, finishing: 52, tackling: 60,
    // mental
    positioning: 62,
    // goleiro (jogador de linha quase não usa)
    goalkeeping: 20,
  }
  if (role === 'GK')
    return {
      ...b, goalkeeping: 75, tackling: 32, finishing: 20,
      strength: 70, positioning: 71, acceleration: 70,
    }
  if (role === 'DEF')
    return { ...b, tackling: 77, positioning: 78, strength: 78 }
  if (role === 'MID')
    return { ...b, passing: 72, strength: 72, positioning: 70 }
  // FWD
  return { ...b, finishing: 78, pace: 80, dribbling: 78, positioning: 75 }
}

export interface Spec {
  number: number
  name: string
  attrs: Partial<Attrs>
}

/** Brasil — ordem segue FORMATION_433. Cada jogador é um ARQUÉTIPO: forças E
 *  fraquezas reais (não "bom em tudo"). Vini é o diferenciado da equipe. */
const BRASIL: Spec[] = [
  { number: 1, name: 'Alisson', attrs: { goalkeeping: 91, positioning: 91, strength: 84, acceleration: 80, passing: 78 } },
  // lateral veterano: inteligente, mas perdendo o pique e sem peso ofensivo
  { number: 2, name: 'Danilo', attrs: { tackling: 77, positioning: 78, pace: 64, acceleration: 60, passing: 72, strength: 60, dribbling: 54, finishing: 32 } },
  // zagueiro-líder: leitura e saída de bola de elite, nulo no ataque
  { number: 4, name: 'Marquinhos', attrs: { tackling: 87, positioning: 89, pace: 80, strength: 78, passing: 74, dribbling: 58, finishing: 28 } },
  // muralha canhota: forte e dono do alto, MUITO lento e tosco com a bola
  { number: 3, name: 'Gabriel M.', attrs: { tackling: 83, strength: 89, pace: 58, acceleration: 56, dribbling: 38, passing: 52, finishing: 24, positioning: 67 } },
  // lateral-ala: pace e cruzamento, FRACO defensivamente e no físico
  { number: 6, name: 'Wendell', attrs: { pace: 82, acceleration: 80, strength: 62, dribbling: 68, passing: 78, tackling: 53, finishing: 38, positioning: 52 } },
  // volante destruidor: rouba e impõe físico, porém LENTO e travado tecnicamente
  { number: 5, name: 'Casemiro', attrs: { tackling: 88, strength: 88, positioning: 81, passing: 74, finishing: 72, pace: 56, acceleration: 52, dribbling: 48, firstTouch: 56 } },
  // box-to-box completo: o equilibrado do time (poucas fraquezas, nada de elite)
  { number: 8, name: 'Bruno G.', attrs: { passing: 84, positioning: 75, strength: 76, dribbling: 76, tackling: 78, finishing: 76, pace: 66 } },
  // camisa 10 de talento: técnica e visão, mas some na marcação e é frágil
  { number: 10, name: 'Paquetá', attrs: { dribbling: 86, passing: 84, positioning: 74, finishing: 62, firstTouch: 84, pace: 68, tackling: 37, strength: 50 } },
  // ponta-flecha: veloz e driblador, ZERO defesa e fraco no físico
  { number: 19, name: 'Raphinha', attrs: { pace: 88, acceleration: 86, dribbling: 85, finishing: 76, passing: 86, positioning: 69, strength: 50, tackling: 29 } },
  // joia crua: letal e veloz, mas verde de decisão/passe/sangue-frio
  { number: 9, name: 'Endrick', attrs: { pace: 90, acceleration: 88, finishing: 86, dribbling: 80, strength: 68, positioning: 65, passing: 48, tackling: 22 } },
  // O DIFERENCIADO: pace/drible irreais — mas finaliza só "bem", não marca,
  // é fraco no físico e ainda decide mal sob pressão
  { number: 7, name: 'Vini Jr.', attrs: { pace: 97, acceleration: 96, dribbling: 95, finishing: 72, positioning: 68, passing: 76, strength: 60, tackling: 21 } },
]

/** Argentina — ordem segue FORMATION_433. Mesma ideia: arquétipos plurais.
 *  Messi é o diferenciado: técnico/mental de outro planeta, físico mínimo. */
const ARGENTINA: Spec[] = [
  { number: 23, name: 'Dibu', attrs: { goalkeeping: 90, positioning: 88, strength: 80, passing: 72, acceleration: 78 } },
  // lateral motor: pace e fôlego, limitado tecnicamente e na finalização
  { number: 26, name: 'Molina', attrs: { pace: 84, acceleration: 82, tackling: 72, strength: 66, passing: 70, dribbling: 62, finishing: 36, positioning: 67 } },
  // zagueiro brigão: marcação e raça de elite, tosco com a bola
  { number: 13, name: 'Cuti Romero', attrs: { tackling: 88, positioning: 78, strength: 87, pace: 72, dribbling: 50, passing: 58, finishing: 26 } },
  // veterano-bloco: MUITO lento, mas parede física e aérea, decisivo na raça
  { number: 19, name: 'Otamendi', attrs: { tackling: 81, strength: 89, pace: 50, acceleration: 48, dribbling: 36, passing: 56, finishing: 22, positioning: 68 } },
  // lateral regular: sólido e equilibrado, sem grande ponto fora da curva
  { number: 3, name: 'Tagliafico', attrs: { pace: 74, tackling: 78, strength: 70, passing: 70, dribbling: 56, finishing: 36 } },
  // motor incansável: pega, corre e briga 90', sem refino de finalização
  { number: 7, name: 'De Paul', attrs: { strength: 78, passing: 79, dribbling: 78, tackling: 78, positioning: 78, pace: 72, finishing: 66 } },
  // volante-criador: passe e leitura excelentes, NÃO é rápido nem físico
  { number: 24, name: 'Enzo', attrs: { passing: 86, strength: 62, finishing: 80, positioning: 77, pace: 60, acceleration: 58, tackling: 62, dribbling: 70 } },
  // meia inteligente: técnica e chute de fora, mediano fisicamente
  { number: 20, name: 'Mac Allister', attrs: { passing: 85, finishing: 80, dribbling: 78, positioning: 77, pace: 62, tackling: 66, strength: 60 } },
  // bruxo veterano: pés mágicos, mas o físico FOI embora e não defende
  { number: 11, name: 'Di María', attrs: { dribbling: 88, passing: 89, finishing: 84, pace: 70, acceleration: 82, positioning: 80, strength: 46, tackling: 28 } },
  // 9 moderno e móvel: completo e trabalhador, fraco no alto e no corpo
  { number: 9, name: 'J. Álvarez', attrs: { finishing: 84, dribbling: 80, strength: 66, positioning: 84, pace: 80, acceleration: 82, passing: 72, tackling: 44 } },
  // O DIFERENCIADO: drible/passe/decisão sobrenaturais — porém físico mínimo
  // (frágil, devagar, sem fôlego) e não marca um lance
  { number: 10, name: 'Messi', attrs: { dribbling: 99, passing: 98, finishing: 92, positioning: 92, pace: 70, acceleration: 86, strength: 45, firstTouch: 98, tackling: 21 } },
]

const ROSTERS: Record<TeamId, Spec[]> = { home: BRASIL, away: ARGENTINA }

/**
 * Arquétipos reaproveitados pelo modo Copa (roguelike), indexados pelo id do
 * clube em `worldcup.ts` — mesma ordem de `ROLES_433` dos elencos reais de
 * `worldcupPlayers.ts`. Dão a ASSINATURA de atributos (Vini = pace/drible,
 * Messi = técnica) e a camisa real; o nível é escalado pelo modo.
 */
export const WC_SPECS: Record<string, Spec[]> = { brasil: BRASIL, argentina: ARGENTINA }

// ----------------------------------------------------------------------------
// CAOS DE ATRIBUTOS — mata a sensação de "todo mundo igual". O elenco real
// define a ASSINATURA de cada jogador (seus picos); isto radicaliza o RESTO:
//  1. afasta cada atributo da média do jogador  → arquétipo mais pontiagudo;
//  2. ruído ± por atributo                       → ninguém é clone do outro;
//  3. "dons de craque" (spikes)                  → talentos fora da curva;
//  4. "buracos" (tanks) nos pontos fracos         → terrível em algumas coisas.
// 100% determinístico (mesmo jogador → mesmos números), preservando replays.
// ----------------------------------------------------------------------------

/** Intensidade do caos — suba para mais variância/loucura, desça para suavizar. */
export const CHAOS: ChaosCfg = {
  spread: 1.5, //  afasta cada atributo da média do jogador (arquétipo + agudo)
  jitter: 13, //   ruído ± máximo por atributo (textura)
  spikes: 2, //    nº de "dons de craque" empurrados ao teto
  spikeBoost: 24,
  tanks: 4, //     nº de pontos fracos afundados de vez
  tankDrop: 34,
  ceil: 99,
}

/** Hash determinístico → [0,1): mulberry32 "puro", sem estado. */
const hash01 = (n: number): number => {
  let t = (n + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Hash FNV-1a de string → semente inteira (combina jogador + atributo). */
const strSeed = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Aplica o caos sobre os atributos já mesclados (base + assinatura do jogador),
 * com aleatoriedade estável por hash (o mesmo jogador real sempre sai igual).
 */
const chaosAttrs = (attrs: Attrs, role: Role, seed: number): Attrs =>
  applyChaos(attrs, role, CHAOS, {
    jitter: (k) => (hash01(seed ^ strSeed(k) ^ 0x9e3779b9) - 0.5) * 2,
    pickN: (keys, purpose, n) => {
      const salt = seed ^ (purpose === 'spike' ? 0x51b3 : 0x7a2c)
      return new Set([...keys].sort((a, b) => hash01(salt ^ strSeed(a)) - hash01(salt ^ strSeed(b))).slice(0, n))
    },
  })

export interface SeedPlayer {
  id: number
  number: number
  name: string
  role: Role
  attrs: Attrs
  formationPos: Vec2
}

/** Gera a lista de jogadores (com atributos finais) para um time. */
export const rosterFor = (team: TeamId): SeedPlayer[] =>
  ROSTERS[team].map((spec, i) => {
    const role = ROLES_433[i]
    const seed = strSeed(`${team}:${spec.name}:${spec.number}`)
    return {
      id: seed,
      number: spec.number,
      name: spec.name,
      role,
      attrs: chaosAttrs({ ...baseAttrs(role), ...spec.attrs }, role, seed),
      formationPos: { ...FORMATION_433[i] },
    }
  })
