/**
 * Teste de fluxo manual do modo roguelike: exercita as MESMAS funções que os
 * botões da UI chamam — mapa, vestiário (pré-jogo), troca de slots, mercado
 * (compra que substitui), academia, partida (motor animado), recompensa por
 * encaixe e a regra de sempre ter EXATAMENTE 11 jogadores.
 */
import {
  newRun,
  enterNode,
  kickOff,
  quickPlayNode,
  pickReward,
  skipReward,
  swapSlots,
  shopOffers,
  buyPlayer,
  boostAttribute,
  leaveNode,
  continueAfterDefeat,
  finishMatch,
  pickBlessing,
  usePotion,
  claimPotion,
  refreshSquadRatings,
  START_LIVES,
  POTION_BOOST,
  POTION_ATTR_CAP,
} from './run'
import type { RunState } from './runTypes'
import { ALL_CLUBS } from './worldcup'
import { lineupFromSlots } from './lineup'
import { roleForSlot } from '../sim/formation'
import { createMatch, step } from '../sim/engine'
import { PHYS } from '../sim/constants'

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('FALHA: ' + msg)
}

/** Consome a bênção da largada; craque/joia abrem a tela de encaixe (recusamos p/ manter o teste estável). */
const settleBlessing = (state: RunState, index: number) => {
  pickBlessing(state, index)
  if (state.status === 'reward') {
    assert((state.pendingReward?.length ?? 0) >= 1, 'bênção de craque/joia deve oferecer 1 jogador')
    skipReward(state)
  }
  assert(state.status === 'map', 'após a bênção deveria ir ao mapa')
}

// 1) nova run: sempre EXATAMENTE 11 jogadores, um por slot da formação
const clubId = Object.keys(ALL_CLUBS)[0]
const state = newRun('Testador', clubId, 999)
assert(state.status === 'blessing', 'deveria começar na escolha da bênção da largada')
assert((state.pendingBlessings?.length ?? 0) === 3, 'a largada deve oferecer 3 bênçãos')
assert(state.squad.length === 11, 'elenco inicial deve ter 11 jogadores')
assert(state.coins === 100, 'deve começar com 100 moedas')
assert(state.lives === START_LIVES, `deve começar com ${START_LIVES} vidas`)
settleBlessing(state, 1)
assert(state.pendingBlessings === null, 'a oferta de bênçãos deve ser consumida na escolha')
assert(state.availableNodeIds.length > 0, 'deve haver nós disponíveis na fase 1')

// 2) troca de slots: dois jogadores trocam de lugar no campinho (inclusive o gol)
const a = state.squad[1]
const b = state.squad[9]
swapSlots(state, 1, 9)
assert(state.squad[1].id === b.id && state.squad[9].id === a.id, 'os jogadores deveriam trocar de slot')
swapSlots(state, 1, 9) // desfaz
const gk = state.squad[0]
const striker = state.squad[10]
swapSlots(state, 0, 10)
assert(state.squad[0].id === striker.id, 'qualquer jogador pode assumir o gol (slot 0)')
assert(roleForSlot(0, state.formationSlots[0]) === 'GK', 'o slot 0 é sempre o gol')
swapSlots(state, 0, 10)
assert(state.squad[0].id === gk.id, 'desfazer a troca devolve o goleiro original')

// 3) mercado: compra SUBSTITUI alguém do time — o elenco nunca sai de 11
let node = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'market')
if (node) {
  enterNode(state, node.id)
  assert(state.status === 'market', 'deveria abrir o mercado')
  const offers = shopOffers(state)
  assert(offers.length > 0, 'mercado deve ter ofertas')
  const affordable = [...offers].sort((x, y) => x.fee - y.fee)[0]
  if (state.coins >= affordable.fee) {
    const out = state.squad[5]
    assert(buyPlayer(state, affordable, 5), 'compra deveria suceder')
    assert(state.squad.length === 11, 'o elenco deve continuar com 11 após a compra')
    assert(state.squad[5].id === affordable.player.id, 'o contratado deve ocupar o slot escolhido')
    assert(!state.squad.some((p) => p.id === out.id), 'quem saiu deixa o time de vez')
  }
  const rich = { ...affordable, fee: state.coins + 1 }
  assert(!buyPlayer(state, rich, 5), 'sem moedas suficientes a compra deve falhar')
  leaveNode(state)
  assert(state.status === 'map', 'deveria voltar ao mapa após o mercado')
}

const gymNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'gym')
if (gymNode) {
  enterNode(state, gymNode.id)
  assert(state.status === 'gym', 'deveria abrir a academia')
  const p = state.squad[9]
  const before = p.attrs.finishing
  boostAttribute(state, p.id, 'finishing')
  assert(p.attrs.finishing === Math.min(100, before + 20), 'deveria bufar +20 (teto 100)')
  leaveNode(state)
  assert(state.status === 'map', 'deveria voltar ao mapa após a academia')
}

// 4) partida passa pelo VESTIÁRIO (pré-jogo) antes da bola rolar
let guard = 0
let checkedPrematch = false
while (state.status !== 'reward' && state.status !== 'gameover' && guard++ < 20) {
  if (state.status === 'lifelost') {
    continueAfterDefeat(state)
    continue
  }
  const matchNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && !n.cleared)
  if (!matchNode) break
  enterNode(state, matchNode.id)
  if (state.status === 'prematch') {
    if (!checkedPrematch) {
      // o caminho da UI: vestiário → Jogar → partida (o "pular" também parte daqui)
      kickOff(state)
      const statusAfterKick: string = state.status // TS não vê a mutação dentro de kickOff
      assert(statusAfterKick === 'match', 'kickOff deveria começar a partida')
      checkedPrematch = true
    }
    quickPlayNode(state)
  } else if (state.status === 'market' || state.status === 'gym') {
    leaveNode(state)
  }
}
assert(checkedPrematch, 'algum nó de partida deveria ter aberto o vestiário')
if (state.status === 'reward') {
  assert((state.pendingReward?.length ?? 0) === 3, 'recompensa deve oferecer 3 cartas')
  // se a vitória ofereceu uma poção, PEGAR é um clique — vai para o inventário
  if (state.pendingPotion) {
    const invBefore = state.potions.length
    assert(claimPotion(state), 'pegar a poção oferecida deveria suceder')
    assert(state.potions.length === invBefore + 1, 'a poção deve ir para o inventário')
    assert(state.pendingPotion === null, 'a oferta deve ser consumida ao pegar')
  }
  const chosen = state.pendingReward![0]
  const out = state.squad[3]
  pickReward(state, 0, 3)
  assert(state.squad.length === 11, 'o elenco deve continuar com 11 após a recompensa')
  assert(state.squad[3].id === chosen.id, 'o reforço deve ocupar o slot escolhido')
  assert(!state.squad.some((p) => p.id === out.id), 'quem deu o lugar deixa o time de vez')
  const statusAfter: string = state.status
  assert(statusAfter === 'map', 'deveria voltar ao mapa após escolher a carta')

  // recusar um reforço: nada muda no time e volta-se ao mapa
  state.status = 'reward'
  state.pendingReward = [chosen]
  const ids = state.squad.map((p) => p.id).join(',')
  skipReward(state)
  assert(state.squad.map((p) => p.id).join(',') === ids, 'recusar não pode mexer no time')
  const statusAfterSkip: string = state.status // TS não vê a mutação dentro de skipReward
  assert(statusAfterSkip === 'map', 'recusar deve voltar ao mapa')
  assert(state.pendingReward === null, 'recusar deve consumir a oferta')
}

// 5) motor ANIMADO com a escalação POR SLOT (valida lineupFromSlots + createMatch)
const oppSquad = state.nodes.find((n) => n.opponent)?.opponent?.squad ?? state.squad
const home = lineupFromSlots(state.squad, state.formationSlots)
const rosters = { home, away: lineupFromSlots(oppSquad.slice(0, 11), state.formationSlots) }
assert(home.length === 11, 'escalação deve ter 11')
assert(home[0].role === 'GK', 'quem ocupa o slot 0 entra como goleiro')
home.forEach((sp, i) => assert(sp.id === state.squad[i].id, 'a ordem dos slots deve ser preservada na escalação'))
const match = createMatch(rosters)
assert(match.players.length === 22, 'partida deve ter 22 jogadores')
for (let i = 0; i < 200; i++) step(match, PHYS.dt)
assert(match.time > 0, 'o relógio da partida deve avançar')

// 6) regras de vida e empate: derrota consome 1 vida (não elimina), empate classifica
const s2 = newRun('Vidas', clubId, 777)
settleBlessing(s2, 1)
const firstMatch = s2.nodes.find((n) => s2.availableNodeIds.includes(n.id) && n.kind === 'match')
if (firstMatch) {
  enterNode(s2, firstMatch.id)
  kickOff(s2)
  finishMatch(s2, 0, 1) // derrota
  assert(s2.lives === START_LIVES - 1, 'derrota deve consumir 1 vida')
  assert(s2.status === 'lifelost', 'com vida restante, derrota não pode eliminar')
  assert(!firstMatch.cleared, 'o nó perdido não deve ser marcado como concluído')
  assert(s2.availableNodeIds.includes(firstMatch.id), 'o nó perdido deve continuar disponível para revanche')
  continueAfterDefeat(s2)
  assert(s2.status === 'map', 'deveria voltar ao mapa após perder a vida')

  // empate classifica: nó concluído, metade das moedas, sem cartas de reforço
  enterNode(s2, firstMatch.id)
  kickOff(s2)
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
    kickOff(s2)
    finishMatch(s2, 0, 2)
    assert(s2.status === 'gameover', 'sem vidas, a derrota deve eliminar')
    assert(s2.lives === 0, 'vidas devem zerar na eliminação')
  }
}

// 7) poções: bufam ACIMA de 100 (teto POTION_ATTR_CAP) e o efeito acaba junto com a partida
const s3 = newRun('Poções', clubId, 555)
settleBlessing(s3, 1)
const potionMatch = s3.nodes.find((n) => s3.availableNodeIds.includes(n.id) && n.kind === 'match')
if (potionMatch) {
  const target = s3.squad[1]
  target.attrs.pace = 100
  refreshSquadRatings(s3) // pace mexido na mão: realinha a nota (pelo slot)
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
  assert(usePotion(s3, 0, s3.squad[2].id), 'a poção também deve poder ser usada no vestiário')
  kickOff(s3)
  finishMatch(s3, 2, 0) // vitória com as poções em vigor
  assert(target.attrs.pace === 100, 'após a partida o atributo deve voltar ao normal')
  assert(target.overall === ovrNormal, 'após a partida a nota geral deve voltar ao normal')
  assert(s3.activePotions.length === 0, 'os efeitos devem expirar no apito final')
}

console.log('OK: fluxo manual completo do modo roguelike (mapa, vestiário, slots, mercado, academia, partida, vidas/empate, poções) funciona.')
