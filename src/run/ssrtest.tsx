/**
 * Smoke test de renderização do modo roguelike: monta as telas React em string
 * (sem DOM) para garantir que não há erro de runtime/hook nos componentes.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import GymNodeView from './GymNodeView'
import NewRun from './NewRun'
import RunShell from './RunShell'
import PreMatchView from './PreMatchView'
import RewardCards from './RewardCards'
import { GameOverModal, LifeLostModal, VictoryModal } from './RunModals'
import { continueAfterDefeat, newRun, enterNode, kickOff, pickBlessing, quickPlayNode, leaveNode, skipReward } from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import type { RunApi } from './useRun'
import type { RunState } from '../game/runTypes'

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('FALHA: ' + msg)
}

const apiFor = (state: RunState): RunApi => ({
  state,
  act: () => {},
  start: () => {},
  reset: () => {},
})

// 1) tela inicial
const newRunHtml = renderToStaticMarkup(
  <NewRun onStart={() => {}} hasSave={false} unlockedAscension={0} onContinue={() => {}} />,
)
assert(newRunHtml.includes('Survive the Cup'), 'NewRun deve renderizar o título')

// 2) shell no mapa (mapa + escudo do clube + moedas) — SEM abas
const clubId = Object.keys(ALL_CLUBS)[0]
const state = newRun('SSR', clubId, 4242)

// 2a) tela da bênção da largada (status inicial de toda corrida nova)
const blessHtml = renderToStaticMarkup(<RunShell api={apiFor(state)} />)
assert((blessHtml.match(/rq-bless-card/g)?.length ?? 0) >= 3, 'largada deve oferecer 3 bênçãos')
pickBlessing(state, 1)
if (state.status === 'reward') skipReward(state) // craque/joia abrem a tela de encaixe

const mapHtml = renderToStaticMarkup(<RunShell api={apiFor(state)} />)
assert(mapHtml.includes('cm-coin-chip'), 'Shell deve mostrar as moedas')
assert(mapHtml.includes('cm-lives-chip'), 'Shell deve mostrar as vidas no cabeçalho')
assert(mapHtml.includes('Survive the Cup'), 'Shell deve identificar o modo')
assert(!mapHtml.includes('cm-nav-btn'), 'Shell não deve ter mais abas de navegação')

// 2b) academia: campinho com os 11 do time (sem banco — o time É os 11)
const gymHtml = renderToStaticMarkup(
  <GymNodeView state={{ ...state, status: 'gym' }} act={() => {}} onHelp={() => {}} />,
)
assert((gymHtml.match(/tv-chip /g)?.length ?? 0) === 11, 'Academia deve desenhar os 11 no campinho')
assert(!gymHtml.includes('rq-gym-bench'), 'Academia não deve mais ter faixa de banco')
assert(gymHtml.includes('Toque num jogador'), 'Academia deve convidar a escolher um jogador')

// 3) entra num nó de partida → abre o VESTIÁRIO (pré-jogo) com os 11 + botão Jogar
const matchNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'match')
if (matchNode) {
  enterNode(state, matchNode.id)
  assert(state.status === 'prematch', 'nó de partida deveria abrir o vestiário')
  const preHtml = renderToStaticMarkup(<PreMatchView state={state} act={() => {}} />)
  assert((preHtml.match(/tv-chip /g)?.length ?? 0) === 11, 'vestiário deve desenhar os 11 no campinho')
  assert(preHtml.includes('Jogar'), 'vestiário deve ter o botão Jogar')
  kickOff(state)
  renderToStaticMarkup(<RunShell api={apiFor(state)} />)
  assert(state.status === 'match', 'após o Jogar deveria estar em partida')
}

// 4) joga até ganhar alguma partida e cair na tela de recompensa (cartas + campinho de encaixe)
let guard = 0
while (state.status !== 'reward' && state.status !== 'gameover' && guard++ < 20) {
  if (state.status === 'lifelost') {
    continueAfterDefeat(state)
    continue
  }
  const next = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && !n.cleared)
  if (!next) break
  enterNode(state, next.id)
  if (state.status === 'prematch') quickPlayNode(state)
  else if (state.status === 'market' || state.status === 'gym') leaveNode(state)
}
if (state.status === 'reward') {
  const rewardHtml = renderToStaticMarkup(<RewardCards state={state} act={() => {}} onHelp={() => {}} />)
  assert((state.pendingReward?.length ?? 0) === 3, 'recompensa deve ter 3 cartas')
  assert((rewardHtml.match(/rc-card /g)?.length ?? 0) === 3, 'recompensa deve desenhar as 3 cartas')
  assert((rewardHtml.match(/tv-chip /g)?.length ?? 0) === 11, 'recompensa deve desenhar o campinho de encaixe')
  assert(rewardHtml.includes('Recusar reforço'), 'recompensa deve permitir recusar')
}

// 5) modais de vida perdida e fim de jornada
renderToStaticMarkup(<LifeLostModal state={{ ...state, status: 'lifelost', lives: 1 }} onContinue={() => {}} />)
renderToStaticMarkup(<GameOverModal state={{ ...state, status: 'gameover' }} onNewRun={() => {}} />)
renderToStaticMarkup(<VictoryModal state={{ ...state, status: 'victory' }} onNewRun={() => {}} />)

console.log('OK: todas as telas do modo roguelike renderizam sem erro.')
