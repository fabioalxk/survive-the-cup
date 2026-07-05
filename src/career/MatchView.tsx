import type { CareerState } from '../game/types'
import { advanceRoundWithPlayerResult, nextPlayerFixture } from '../game/career'
import type { CareerApi } from './useCareer'
import MatchPlayer from '../shared/MatchPlayer'

/**
 * Assiste à partida do jogador com a simulação animada (elenco e cores reais).
 * Ao terminar, grava o placar e simula o resto da rodada. É um fininho sobre
 * `MatchPlayer` (compartilhado com o modo roguelike) que só resolve QUEM joga
 * e o que fazer com o desfecho.
 */
export default function MatchView({
  state,
  act,
  onDone,
}: {
  state: CareerState
  act: CareerApi['act']
  onDone: () => void
}) {
  const fixture = nextPlayerFixture(state)
  const homeClub = fixture ? state.clubs[fixture.homeId] : state.clubs[state.clubId]
  const awayClub = fixture ? state.clubs[fixture.awayId] : state.clubs[state.clubId]

  return (
    <MatchPlayer
      home={homeClub}
      away={awayClub}
      onDone={(homeGoals, awayGoals) => {
        act((s) => advanceRoundWithPlayerResult(s, homeGoals, awayGoals))
        onDone()
      }}
    />
  )
}
