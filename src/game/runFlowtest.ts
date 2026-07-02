/**
 * Teste de fluxo manual do modo roguelike: exercita as MESMAS funções que os
 * botões da UI chamam — mapa, escalação (titular/banco), mercado, academia,
 * partida (motor animado) e o gate de "não pode vender abaixo de 11".
 */
import {
  newRun,
  enterNode,
  quickPlayNode,
  pickReward,
  swapStarter,
  startingXI,
  shopOffers,
  buyPlayer,
  sellPlayer,
  boostAttribute,
  leaveNode,
  continueAfterDefeat,
  finishMatch,
  pickBlessing,
  usePotion,
  claimPotion,
  SQUAD_MIN,
  START_LIVES,
  POTION_BOOST,
  POTION_ATTR_CAP,
} from './run'
import { ALL_CLUBS } from './worldcup'
import { overallOf } from './overall'
import { lineupFor } from './lineup'
import { createMatch, step } from '../sim/engine'
import { PHYS } from '../sim/constants'

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('FALHA: ' + msg)
}

// 1) nova run
const clubId = Object.keys(ALL_CLUBS)[0]
const state = newRun('Testador', clubId, 999)
assert(state.status === 'blessing', 'deveria começar na escolha da bênção da largada')
assert((state.pendingBlessings?.length ?? 0) === 3, 'a largada deve oferecer 3 bênçãos')
assert(state.squad.length === 11, 'elenco inicial deve ter 11 jogadores')
assert(state.startingIds.length === 11, 'deve ter 11 titulares de saída')
assert(state.coins === 100, 'deve começar com 100 moedas')
assert(state.lives === START_LIVES, `deve começar com ${START_LIVES} vidas`)
pickBlessing(state, 1) // bênção de PODER (índice 1): nunca mexe em moedas nem vidas
assert(state.status === 'map', 'após a bênção deveria ir ao mapa')
assert(state.pendingBlessings === null, 'a oferta de bênçãos deve ser consumida na escolha')
assert(state.availableNodeIds.length > 0, 'deve haver nós disponíveis na fase 1')

// 2) escalação: bota um reserva fictício e promove no lugar de um titular
const bench = { ...state.squad[0], id: 99999, name: 'Reserva Teste' }
state.squad.push(bench)
const starterId = state.startingIds[0]
swapStarter(state, bench.id, starterId)
assert(state.startingIds.includes(bench.id), 'reserva deveria virar titular')
assert(!state.startingIds.includes(starterId), 'antigo titular deveria sair do XI')
swapStarter(state, starterId, bench.id) // desfaz p/ não afetar o resto do teste
state.squad = state.squad.filter((p) => p.id !== bench.id)

// 3) entra num nó de mercado ou academia se houver, senão força via partida
let node = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'market')
if (node) {
  enterNode(state, node.id)
  assert(state.status === 'market', 'deveria abrir o mercado')
  const offers = shopOffers(state)
  assert(offers.length > 0, 'mercado deve ter ofertas')
  const before = state.squad.length
  const affordable = [...offers].sort((a, b) => a.fee - b.fee)[0]
  if (state.coins >= affordable.fee) {
    assert(buyPlayer(state, affordable), 'compra deveria suceder')
    assert(state.squad.length === before + 1, 'elenco deveria crescer')
  }
  // não pode vender abaixo de 11
  while (state.squad.length > SQUAD_MIN) sellPlayer(state, state.squad[0].id)
  assert(state.squad.length === SQUAD_MIN, 'deveria parar exatamente em 11')
  assert(!sellPlayer(state, state.squad[0].id), 'não pode vender abaixo de 11')
  leaveNode(state)
  assert(state.status === 'map', 'deveria voltar ao mapa após o mercado')
}

const gymNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'gym')
if (gymNode) {
  enterNode(state, gymNode.id)
  assert(state.status === 'gym', 'deveria abrir a academia')
  const p = state.squad[0]
  const before = p.attrs.finishing
  boostAttribute(state, p.id, 'finishing')
  assert(p.attrs.finishing === Math.min(100, before + 20), 'deveria bufar +20 (teto 100)')
  leaveNode(state)
  assert(state.status === 'map', 'deveria voltar ao mapa após a academia')
}

// 4) joga partidas (rápidas) até vencer alguma e receber a recompensa em cartas
let guard = 0
while (state.status !== 'reward' && state.status !== 'gameover' && guard++ < 20) {
  if (state.status === 'lifelost') {
    continueAfterDefeat(state)
    continue
  }
  const matchNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && !n.cleared)
  if (!matchNode) break
  enterNode(state, matchNode.id)
  if (state.status === 'match') quickPlayNode(state)
  else if (state.status === 'market' || state.status === 'gym') leaveNode(state)
}
if (state.status === 'reward') {
  assert((state.pendingReward?.length ?? 0) === 3, 'recompensa deve oferecer 3 cartas')
  // se a vitória ofereceu uma poção, PEGAR é um clique — vai para o inventário
  if (state.pendingPotion) {
    const invBefore = state.potions.length
    assert(claimPotion(state), 'pegar a poção oferecida deveria suceder')
    assert(state.potions.length === invBefore + 1, 'a poção deve ir para o inventário')
    assert(state.pendingPotion === null, 'a oferta deve ser consumida ao pegar')
  }
  const beforeLen = state.squad.length
  pickReward(state, 0)
  assert(state.squad.length === beforeLen + 1, 'elenco deveria crescer com a carta escolhida')
  const statusAfter: string = state.status
  assert(statusAfter === 'map', 'deveria voltar ao mapa após escolher a carta')
}

// 5) motor ANIMADO com o elenco titular da run (valida lineupFor + createMatch)
const xi = startingXI(state)
const oppSquad = state.nodes.find((n) => n.opponent)?.opponent?.squad ?? xi
const rosters = { home: lineupFor(xi), away: lineupFor(oppSquad) }
assert(rosters.home.length === 11 && rosters.away.length === 11, 'escalação deve ter 11')
const match = createMatch(rosters)
assert(match.players.length === 22, 'partida deve ter 22 jogadores')
for (let i = 0; i < 200; i++) step(match, PHYS.dt)
assert(match.time > 0, 'o relógio da partida deve avançar')

// 6) regras de vida e empate: derrota consome 1 vida (não elimina), empate classifica
const s2 = newRun('Vidas', clubId, 777)
pickBlessing(s2, 1)
const firstMatch = s2.nodes.find((n) => s2.availableNodeIds.includes(n.id) && n.kind === 'match')
if (firstMatch) {
  enterNode(s2, firstMatch.id)
  finishMatch(s2, 0, 1) // derrota
  assert(s2.lives === START_LIVES - 1, 'derrota deve consumir 1 vida')
  assert(s2.status === 'lifelost', 'com vida restante, derrota não pode eliminar')
  assert(!firstMatch.cleared, 'o nó perdido não deve ser marcado como concluído')
  assert(s2.availableNodeIds.includes(firstMatch.id), 'o nó perdido deve continuar disponível para revanche')
  continueAfterDefeat(s2)
  assert(s2.status === 'map', 'deveria voltar ao mapa após perder a vida')

  // empate classifica: nó concluído, metade das moedas, sem cartas de reforço
  enterNode(s2, firstMatch.id)
  const coinsBefore = s2.coins
  finishMatch(s2, 1, 1)
  assert(s2.status === 'map', 'empate deve classificar e voltar ao mapa')
  assert(s2.pendingReward === null, 'empate não deve oferecer cartas')
  assert(firstMatch.cleared, 'empate deve concluir o nó')
  assert(s2.coins > coinsBefore, 'empate deve render moedas (metade da vitória)')
  assert(s2.lives === START_LIVES - 1, 'empate não pode consumir vida')

  // sem vidas restantes, a próxima derrota elimina
  const nextMatch = s2.nodes.find(
    (n) => s2.availableNodeIds.includes(n.id) && (n.kind === 'match' || n.kind === 'boss'),
  )
  if (nextMatch) {
    enterNode(s2, nextMatch.id)
    finishMatch(s2, 0, 2)
    assert(s2.status === 'gameover', 'sem vidas, a derrota deve eliminar')
    assert(s2.lives === 0, 'vidas devem zerar na eliminação')
  }
}

// 7) poções: bufam ACIMA de 100 (teto POTION_ATTR_CAP) e o efeito acaba junto com a partida
const s3 = newRun('Poções', clubId, 555)
pickBlessing(s3, 1)
const potionMatch = s3.nodes.find((n) => s3.availableNodeIds.includes(n.id) && n.kind === 'match')
if (potionMatch) {
  const target = startingXI(s3)[1]
  target.attrs.pace = 100
  target.overall = overallOf(target.role, target.attrs) // pace mexido na mão: realinha a nota
  const ovrNormal = target.overall
  s3.potions.push('pace', 'pace')
  assert(usePotion(s3, 0, target.id), 'usar a poção deveria suceder no mapa')
  assert(
    target.attrs.pace === Math.min(POTION_ATTR_CAP, 100 + POTION_BOOST),
    `poção deve levar o atributo acima de 100 (teto ${POTION_ATTR_CAP})`,
  )
  assert(!usePotion(s3, 0, target.id), 'no teto, a segunda poção não pode ser usada')
  assert(s3.potions.length === 1, 'a poção barrada deve continuar no inventário')
  assert(s3.activePotions.length === 1, 'deve haver exatamente 1 efeito ativo')
  enterNode(s3, potionMatch.id)
  finishMatch(s3, 2, 0) // vitória com a poção em vigor
  assert(target.attrs.pace === 100, 'após a partida o atributo deve voltar ao normal')
  assert(target.overall === ovrNormal, 'após a partida a nota geral deve voltar ao normal')
  assert(s3.activePotions.length === 0, 'os efeitos devem expirar no apito final')
}

console.log('OK: fluxo manual completo do modo roguelike (mapa, escalação, mercado, academia, partida, vidas/empate, poções) funciona.')
