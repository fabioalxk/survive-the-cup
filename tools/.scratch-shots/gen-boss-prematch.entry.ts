import { writeFileSync } from 'node:fs'
import { newRun, pickBlessing, skipReward, enterNode } from '../../src/game/run'
import { ALL_CLUBS } from '../../src/game/worldcup'

const clubId = Object.keys(ALL_CLUBS)[0]
const s = newRun('SHOT', clubId, 4242)
pickBlessing(s, 1)
if (s.status === 'reward') skipReward(s)

const boss = s.nodes.find((n) => n.kind === 'boss')
if (boss) {
  s.availableNodeIds = [boss.id]
  enterNode(s, boss.id)
}

writeFileSync('tools/.scratch-shots/states/boss-prematch.json', JSON.stringify(s))
console.log('wrote boss-prematch.json, status=', s.status)
