import type { RunState } from '../game/runTypes'
import { finishMatch, quickPlayNode, setFormation } from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import MatchPlayer from '../shared/MatchPlayer'
import PotionsHud from './PotionsHud'
import type { RunApi } from './useRun'

/** Partida animada de um nó da corrida — fininho sobre `MatchPlayer` (compartilhado com a liga). */
export default function RunMatchView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const node = state.nodes.find((n) => n.id === state.currentNodeId)
  if (!node || !node.opponent) return null

  // slotOrdered: squad[i] entra EXATAMENTE no slot i — a escalação é a do campinho
  const home = {
    ...ALL_CLUBS[state.clubId],
    squad: state.squad,
    formation: state.formationSlots,
    slotOrdered: true,
  }
  const away = { ...ALL_CLUBS[node.opponent.clubId], squad: node.opponent.squad }

  return (
    <MatchPlayer
      home={home}
      away={away}
      onDone={(homeGoals, awayGoals) => act((s) => finishMatch(s, homeGoals, awayGoals))}
      onSkip={() => act((s) => quickPlayNode(s))}
      onFormationChange={(slots) => act((s) => setFormation(s, slots))}
      extraControls={(m) => (
        <PotionsHud state={state} act={act} onOpenPicker={m.pause} onClosePicker={m.resume} />
      )}
    />
  )
}
