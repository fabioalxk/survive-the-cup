// Gera saves determinísticos (localStorage-ready) para cada tela do modo roguelike,
// reaproveitando a lógica real do jogo (mesmas funções do ssrtest.tsx), sem depender
// de navegar um mapa aleatório no navegador. Rodado via esbuild (node platform) — ver gen-states.mjs.
import { writeFileSync, mkdirSync } from 'node:fs'
import {
  newRun,
  pickBlessing,
  enterNode,
  kickOff,
  quickPlayNode,
  leaveNode,
  skipReward,
  continueAfterDefeat,
} from '../../src/game/run'
import { ALL_CLUBS } from '../../src/game/worldcup'

const outDir = 'tools/.scratch-shots/states'
mkdirSync(outDir, { recursive: true })

const save = (name: string, state: unknown) => {
  writeFileSync(`${outDir}/${name}.json`, JSON.stringify(state))
  console.log('wrote', name)
}

const clubId = Object.keys(ALL_CLUBS)[0]

// tela da bênção da largada, ANTES de escolher (as 3 cartas juntas: safe/power/cursed)
save('blessing', newRun('SHOT', clubId, 4242))

const fresh = () => {
  const s = newRun('SHOT', clubId, 4242)
  pickBlessing(s, 1)
  if (s.status === 'reward') skipReward(s)
  return s
}

/**
 * Pega QUALQUER nó do tipo pedido no mapa (gym/market só existem a partir da
 * 2a fase, nunca colados no INÍCIO) e seta `currentNodeId`/`status` direto —
 * sem passar por `enterNode` (que exige o nó estar em `availableNodeIds`, e
 * simular partidas de verdade pra "destravar" caminho tem risco de RNG acabar
 * a corrida antes de chegar lá). Isso NÃO é fluxo de jogo real, é só fixture
 * de tela: sem `currentNodeId` setado, telas que dependem dele (ex.
 * `shopOffers` do mercado) renderizam um estado quebrado que parece bug do
 * jogo mas é só o gerador de teste sendo preguiçoso — já caímos nessa uma vez.
 */
const reach = (kind: 'gym' | 'market') => {
  const s = fresh()
  const node = s.nodes.find((n) => n.kind === kind)
  if (node) {
    s.currentNodeId = node.id
    s.status = kind
  }
  return s
}

// mapa (estado base, status deveria ser 'map' depois da bênção)
save('map', fresh())

// mapa com poções no inventário (testar o HUD de poções no cabeçalho)
{
  const s = fresh()
  s.potions = ['strength', 'pace']
  save('map-potions', s)
}

// gym: navega até achar um nó de academia de verdade
save('gym', reach('gym'))

// market: idem, com ofertas de verdade calculadas por shopOffers (currentNodeId setado)
save('market', reach('market'))

// prematch (vestiário)
{
  const s = fresh()
  const matchNode = s.nodes.find((n) => s.availableNodeIds.includes(n.id) && n.kind === 'match')
  if (matchNode) enterNode(s, matchNode.id)
  save('prematch', s)
}

// match: partida em si (canvas do MatchPlayer)
{
  const s = fresh()
  const matchNode = s.nodes.find((n) => s.availableNodeIds.includes(n.id) && n.kind === 'match')
  if (matchNode) {
    enterNode(s, matchNode.id)
    kickOff(s)
  }
  save('match', s)
}

// reward: joga até ganhar uma partida
{
  const s = fresh()
  let guard = 0
  while (s.status !== 'reward' && s.status !== 'gameover' && guard++ < 20) {
    if (s.status === 'lifelost') {
      continueAfterDefeat(s)
      continue
    }
    const next = s.nodes.find((n) => s.availableNodeIds.includes(n.id) && !n.cleared)
    if (!next) break
    enterNode(s, next.id)
    if (s.status === 'prematch') quickPlayNode(s)
    else if (s.status === 'market' || s.status === 'gym') leaveNode(s)
  }
  save('reward', s)
}

// vida perdida / fim / vitória — pega o estado de recompensa e força o status
{
  const s = fresh()
  s.status = 'lifelost'
  s.lives = 1
  save('lifelost', s)
}
{
  const s = fresh()
  s.status = 'gameover'
  save('gameover', s)
}
{
  const s = fresh()
  s.status = 'victory'
  save('victory', s)
}

console.log('OK: estados gerados em', outDir)
