/**
 * Smoke test de renderização do modo roguelike: monta as telas React em string
 * (sem DOM) para garantir que não há erro de runtime/hook nos componentes.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import GymNodeView from './GymNodeView'
import NewRun from './NewRun'
import RunShell from './RunShell'
import TacticsView from './TacticsView'
import { GameOverModal, LifeLostModal, VictoryModal } from './RunModals'
import { continueAfterDefeat, newRun, enterNode, pickBlessing, quickPlayNode, leaveNode } from '../game/run'
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
const newRunHtml = renderToStaticMarkup(<NewRun onStart={() => {}} hasSave={false} onContinue={() => {}} />)
assert(newRunHtml.includes('Survive the Cup'), 'NewRun deve renderizar o título')

// 2) shell no mapa (mapa + escudo do clube + moedas)
const clubId = Object.keys(ALL_CLUBS)[0]
const state = newRun('SSR', clubId, 4242)

// 2a) tela da bênção da largada (status inicial de toda corrida nova)
const blessHtml = renderToStaticMarkup(<RunShell api={apiFor(state)} />)
assert((blessHtml.match(/rq-bless-card/g)?.length ?? 0) >= 3, 'largada deve oferecer 3 bênçãos')
pickBlessing(state, 1)

const mapHtml = renderToStaticMarkup(<RunShell api={apiFor(state)} />)
assert(mapHtml.includes('cm-coin-chip'), 'Shell deve mostrar as moedas')
assert(mapHtml.includes('cm-lives-chip'), 'Shell deve mostrar as vidas no cabeçalho')
assert(mapHtml.includes('Survive the Cup'), 'Shell deve identificar o modo')

// 2b) aba Tática: campinho com os 11 titulares nas âncoras da formação
const tacticsHtml = renderToStaticMarkup(<TacticsView state={state} act={() => {}} />)
assert(tacticsHtml.includes('4-3-3'), 'Tática deve mostrar o nome do esquema atual')
assert((tacticsHtml.match(/tv-chip /g)?.length ?? 0) === 11, 'Tática deve desenhar 11 jogadores no campinho')

// 2c) academia integrada: campinho com os 11 titulares + faixa do banco
const gymHtml = renderToStaticMarkup(<GymNodeView state={{ ...state, status: 'gym' }} act={() => {}} />)
assert((gymHtml.match(/tv-chip /g)?.length ?? 0) === 11, 'Academia deve desenhar os 11 titulares no campinho')
assert(gymHtml.includes('rq-gym-bench'), 'Academia deve mostrar a faixa do banco')
assert(gymHtml.includes('Toque num jogador'), 'Academia deve convidar a escolher um jogador')

// 3) entra num nó de partida (o próprio RunShell troca pra RunMatchView em tela cheia)
const matchNode = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && n.kind === 'match')
if (matchNode) {
  enterNode(state, matchNode.id)
  renderToStaticMarkup(<RunShell api={apiFor(state)} />)
  assert(state.status === 'match', 'deveria estar em partida')
}

// 4) joga até ganhar alguma partida e cair no pop-up de recompensa (3 cartas)
let guard = 0
while (state.status !== 'reward' && state.status !== 'gameover' && guard++ < 20) {
  if (state.status === 'lifelost') {
    continueAfterDefeat(state)
    continue
  }
  const next = state.nodes.find((n) => state.availableNodeIds.includes(n.id) && !n.cleared)
  if (!next) break
  enterNode(state, next.id)
  if (state.status === 'match') quickPlayNode(state)
  else if (state.status === 'market' || state.status === 'gym') leaveNode(state)
}
if (state.status === 'reward') {
  renderToStaticMarkup(<RunShell api={apiFor(state)} />)
  assert((state.pendingReward?.length ?? 0) === 3, 'pop-up de recompensa deve ter 3 cartas')
}

// 5) modais de vida perdida e fim de jornada
renderToStaticMarkup(<LifeLostModal state={{ ...state, status: 'lifelost', lives: 1 }} onContinue={() => {}} />)
renderToStaticMarkup(<GameOverModal state={{ ...state, status: 'gameover' }} onNewRun={() => {}} />)
renderToStaticMarkup(<VictoryModal state={{ ...state, status: 'victory' }} onNewRun={() => {}} />)

console.log('OK: todas as telas do modo roguelike renderizam sem erro.')
