import { writeFileSync } from 'node:fs'
import { newRun, pickBlessing, skipReward, enterNode, quickPlayNode, leaveNode, continueAfterDefeat } from '../../src/game/run'
import { ALL_CLUBS } from '../../src/game/worldcup'

const clubId = Object.keys(ALL_CLUBS)[0]
const s = newRun('SHOT', clubId, 4242)
pickBlessing(s, 1)
if (s.status === 'reward') skipReward(s)

let cleared = 0
let guard = 0
while (cleared < 6 && guard++ < 60) {
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

// só queremos visualizar o mapa com trilha longa — força de volta pro mapa
// mesmo se o RNG da partida tiver acabado a corrida (gameover/lifelost) no meio
s.status = 'map'
s.lives = Math.max(s.lives, 1)
writeFileSync('tools/.scratch-shots/states/longprogress.json', JSON.stringify(s))
console.log('wrote longprogress.json, stage=', s.stage, 'status=', s.status, 'cleared=', cleared)
