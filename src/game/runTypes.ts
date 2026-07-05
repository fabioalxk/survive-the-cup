import type { Vec2 } from '../sim/types'
import type { GenPlayer } from './types'

/** Tipo de nó do mapa (inspirado no Slay the Spire, adaptado ao futebol). */
export type NodeKind = 'match' | 'market' | 'gym' | 'boss'

/**
 * Adversário de um nó de partida: reaproveita a identidade visual (escudo/cores)
 * de um clube real do elenco de clubes do jogo (`ALL_CLUBS`), com um elenco
 * gerado só para este confronto (não é liga — não precisa existir fora do nó).
 */
export interface OpponentDef {
  clubId: string
  squad: GenPlayer[]
}

/** Um "quadradinho" do mapa: pertence a uma fase (linha) e uma pista (coluna). */
export interface RunNode {
  id: string
  stage: number // 1..6 fases regulares, 7 = chefão
  lane: number
  kind: NodeKind
  /** ids dos nós da fase seguinte alcançáveis a partir deste. */
  next: string[]
  /** presente quando kind é 'match' ou 'boss'. */
  opponent?: OpponentDef
  cleared: boolean
}

/** Tipos de poção — o valor é a PRÓPRIA chave do atributo bufado em `Attrs`. */
export type PotionKind = 'strength' | 'pace'

/** Poção já usada num jogador: efeito ativo até o fim da próxima partida. */
export interface ActivePotion {
  playerId: number
  attr: PotionKind
  /** quanto foi somado de fato (para reverter exatamente após a partida). */
  amount: number
}

/**
 * Bênção da largada (estilo Neow do Slay the Spire): oferta única antes do 1º nó.
 * Grupos: seguras (sponsor/potionkit/extralife), de poder (star/captain/wonderkid)
 * e amaldiçoada (pact) — o sorteio pega 1 de cada grupo.
 */
export type BlessingKind =
  | 'sponsor'
  | 'potionkit'
  | 'extralife'
  | 'star'
  | 'captain'
  | 'wonderkid'
  | 'pact'

export type RunStatus =
  | 'blessing' // escolhendo a bênção da largada (antes do 1º nó)
  | 'map' // escolhendo o próximo nó
  | 'prematch' // vestiário: os 11 no campinho + botão Jogar
  | 'match' // partida em andamento
  | 'reward' // pop-up dos jogadores oferecidos após vencer
  | 'market' // evento de mercado (comprar substituindo alguém do time)
  | 'gym' // evento de academia (bufar atributo)
  | 'lifelost' // perdeu uma partida mas ainda tem vida — pode continuar
  | 'gameover' // eliminado (acabaram as vidas)
  | 'victory' // venceu o chefão final

/** Estado completo de uma "corrida" (run) do modo Survive the Cup. */
export interface RunState {
  version: number
  seed: number
  managerName: string
  clubId: string
  /** Nível de dificuldade da corrida (0 a 10, como no Slay the Spire). */
  ascension: number
  /** o time inteiro: EXATAMENTE 11 jogadores — o índice é o slot da formação (0 = gol). */
  squad: GenPlayer[]
  /** Âncoras da formação tática (11 slots, "atacando para a direita") — editáveis no pré-jogo. */
  formationSlots: Vec2[]
  coins: number
  /** Vidas restantes (começa com 2: pode perder 1 partida; a 2ª derrota elimina). */
  lives: number
  stage: number // fase do nó atualmente em disputa/aberto (0 antes da 1ª escolha)
  nodes: RunNode[]
  /** ids dos nós clicáveis agora no mapa. */
  availableNodeIds: string[]
  /** nó sendo resolvido (partida em andamento, mercado ou academia abertos). */
  currentNodeId: string | null
  pendingReward: GenPlayer[] | null
  /** poções guardadas no inventário (máx. 3) — usáveis no mapa, num titular. */
  potions: PotionKind[]
  /** efeitos de poção em vigor — revertidos ao fim da próxima partida. */
  activePotions: ActivePotion[]
  /** poção ganha na última vitória (exibida no pop-up de recompensa). */
  pendingPotion: PotionKind | null
  /** as 3 bênçãos oferecidas na largada (null depois de escolher). */
  pendingBlessings: BlessingKind[] | null
  lastMatch: {
    oppName: string
    homeGoals: number
    awayGoals: number
    won: boolean
    /** empate em nó normal (classificou sem vencer — chefão nunca marca isto: vai a pênaltis). */
    drawn: boolean
    stage: number
  } | null
  status: RunStatus
  log: string[]
}
