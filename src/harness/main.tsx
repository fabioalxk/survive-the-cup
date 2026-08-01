import { useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { enterNode, newRun } from '../game/run'
import { generateRewardCards } from '../game/runGen'
import { makeRng } from '../game/random'
import { ALL_CLUBS, BRAZIL_ID } from '../game/worldcup'
import type { RunState } from '../game/runTypes'
import type { RunApi } from '../run/useRun'
import RunShell from '../run/RunShell'
import NewRun from '../run/NewRun'
import MatchPlayer from '../shared/MatchPlayer'
import FxScene from './FxScene'
import '../career/career.css'
import '../run/run.css'
import '../index.css'

/**
 * Bancada de inspeção visual (só dev/QA). Monta QUALQUER tela do jogo em um
 * estado determinístico via `?scene=`, sem depender de clicar o fluxo inteiro
 * nem de save no localStorage. É o que permite revisar cada tela isoladamente
 * e comparar prints entre versões.
 *
 *   /harness.html?scene=match        campo 3D (padrão)
 *   /harness.html?scene=fx           efeitos do campo (gol, bola alta, caídos)
 *   /harness.html?scene=map          mapa da jornada
 *   /harness.html?scene=market       mercado   |  ?scene=gym    academia
 *   /harness.html?scene=prematch     vestiário |  ?scene=reward cartas
 *   /harness.html?scene=blessing     bênção    |  ?scene=menu   menu inicial
 *   /harness.html?scene=victory|gameover|lifelost
 *
 * `?seed=` troca a corrida sorteada; `?stage=` avança N fases antes de montar.
 */
const q = new URLSearchParams(location.search)
const scene = q.get('scene') ?? 'match'
const seed = Number(q.get('seed') ?? 7)

/** Corrida determinística já posicionada no ponto que a cena precisa. */
const buildState = (): RunState => {
  const s = newRun('Técnico', q.get('home') ?? BRAZIL_ID, seed)
  s.status = 'map'
  // avança `stage` fases limpando sempre o primeiro nó disponível
  const stages = Number(q.get('stage') ?? 0)
  for (let i = 0; i < stages; i++) {
    const id = s.availableNodeIds[0]
    const node = s.nodes.find((n) => n.id === id)
    if (!node) break
    node.cleared = true
    s.stage = node.stage
    s.availableNodeIds = node.next
  }
  return s
}

/** Leva o estado até a tela pedida usando as MESMAS transições do jogo. */
const goTo = (s: RunState, target: string): RunState => {
  const firstOfKind = (kind: string) =>
    s.availableNodeIds.find((id) => s.nodes.find((n) => n.id === id)?.kind === kind) ??
    s.nodes.find((n) => n.kind === kind && !n.cleared)?.id
  switch (target) {
    case 'blessing':
      s.status = 'blessing'
      break
    case 'reward':
      // a tela de cartas só existe quando há oferta pendente (RewardCards
      // devolve null sem ela) — o jogo a preenche ao vencer um nó de partida
      s.pendingReward = generateRewardCards(Math.max(1, s.stage), makeRng(seed + 31), s.ascension)
      s.status = 'reward'
      break
    case 'market':
    case 'gym':
    case 'prematch': {
      const kind = target === 'prematch' ? 'match' : target
      const id = firstOfKind(kind)
      if (id) {
        s.availableNodeIds = [...new Set([...s.availableNodeIds, id])]
        enterNode(s, id)
      }
      break
    }
    case 'victory':
    case 'gameover':
    case 'lifelost':
      s.status = target as RunState['status']
      break
    default:
      s.status = 'map'
  }
  return s
}

/** API mínima de corrida — mesma forma de `useRun`, sem persistência. */
const useHarnessRun = (initial: RunState): RunApi => {
  const ref = useRef(initial)
  const [, bump] = useState(0)
  const act = useCallback((fn: (s: RunState) => void) => {
    fn(ref.current)
    bump((v) => v + 1)
  }, [])
  return { state: ref.current, act, start: () => {}, reset: () => {} }
}

function MatchScene() {
  const runHome = newRun('QA', q.get('home') ?? BRAZIL_ID, seed)
  const runAway = newRun('QA', q.get('away') ?? 'argentina', seed + 991)
  const home = {
    ...ALL_CLUBS[runHome.clubId],
    squad: runHome.squad,
    formation: runHome.formationSlots,
    slotOrdered: true,
  }
  const away = { ...ALL_CLUBS[runAway.clubId], squad: runAway.squad }
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MatchPlayer home={home} away={away} onDone={() => {}} onFormationChange={() => {}} />
    </div>
  )
}

function RunScene() {
  const api = useHarnessRun(goTo(buildState(), scene))
  return <RunShell api={api} />
}

const Root = () => {
  if (scene === 'match') return <MatchScene />
  if (scene === 'fx') return <FxScene query={q} />
  if (scene === 'menu') return <NewRun onStart={() => {}} hasSave={false} unlockedAscension={0} onContinue={() => {}} />
  return <RunScene />
}

createRoot(document.getElementById('root')!).render(<Root />)
