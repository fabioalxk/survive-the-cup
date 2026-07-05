import { writeFileSync } from 'node:fs'
import { newRun, pickBlessing, skipReward, enterNode, quickPlayNode, leaveNode, continueAfterDefeat } from '../../src/game/run'
import { ALL_CLUBS } from '../../src/game/worldcup'

const clubId = Object.keys(ALL_CLUBS)[0]
const s = newRun('SHOT', clubId, 4242)
pickBlessing(s, 1)
if (s.status === 'reward') skipReward(s)

// avança 3 fases reais (partida/mercado/academia), voltando pro mapa a cada passo
let guard = 0
let cleared = 0
while (cleared < 3 && guard++ < 30) {
  if (s.status === 'lifelost') {
    continueAfterDefeat(s)
    continue
  }
  if (s.status !== 'map') continue
  const next = s.nodes.find((n) => s.availableNodeIds.includes(n.id) && !n.cleared)
  if (!next) break
  enterNode(s, next.id)
  if (s.status === 'prematch') quickPlayNode(s)
  else if (s.status === 'market' || s.status === 'gym') leaveNode(s)
  if (s.status === 'reward') skipReward(s)
  cleared++
}

writeFileSync('tools/.scratch-shots/states/progress.json', JSON.stringify(s))
console.log('wrote progress.json, stage=', s.stage, 'status=', s.status)
