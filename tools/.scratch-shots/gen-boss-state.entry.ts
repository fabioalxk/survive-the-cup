import { writeFileSync } from 'node:fs'
import { newRun, pickBlessing, skipReward } from '../../src/game/run'
import { ALL_CLUBS } from '../../src/game/worldcup'

const clubId = Object.keys(ALL_CLUBS)[0]
const s = newRun('SHOT', clubId, 4242)
pickBlessing(s, 1)
if (s.status === 'reward') skipReward(s)

const boss = s.nodes.find((n) => n.kind === 'boss')
if (boss) {
  s.availableNodeIds = [boss.id]
  s.stage = boss.stage - 1
}

writeFileSync('tools/.scratch-shots/states/boss.json', JSON.stringify(s))
console.log('wrote boss.json')
