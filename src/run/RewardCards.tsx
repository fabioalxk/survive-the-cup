import { useEffect, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { pickReward, skipReward } from '../game/run'
import { chooseSfx, wonRewardSfx } from '../sfx/crowd'
import { useMediaQuery } from '../shared/useMediaQuery'
import { GiftIcon, HelpIcon } from '../ui/icons'
import { CandidatePager } from './CandidatePager'
import PlacePlayerBoard, { CandidateCard } from './PlacePlayerBoard'
import type { RunApi } from './useRun'

/**
 * Recompensa após vencer (e chegada de craque/joia da bênção): cartas de
 * reforço + o campinho do time. O reforço SEMPRE entra no lugar de alguém —
 * a própria carta diz quem sai (o slot que mais eleva a nota) e UM clique
 * fecha a troca. Dá para recusar e seguir com o time como está.
 */
export default function RewardCards({
  state,
  act,
  onHelp,
}: {
  state: RunState
  act: RunApi['act']
  onHelp: () => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  // celular estreito: só cabe UMA carta cheia por vez sem rolar (ver
  // CandidatePager) — desktop continua mostrando a grade toda de uma vez.
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const [page, setPage] = useState(0)
  useEffect(() => {
    if (state.pendingReward) wonRewardSfx()
  }, [state.pendingReward])
  // reforço escolhido/recusado encolhe (ou some com) a lista — sem isto a
  // página ativa podia sobrar apontando pra fora do novo tamanho.
  useEffect(() => {
    const max = (state.pendingReward?.length ?? 1) - 1
    if (page > max) setPage(Math.max(0, max))
  }, [state.pendingReward, page])

  if (!state.pendingReward) return null
  const cards = state.pendingReward
  const candidate = hovered !== null ? (cards[hovered] ?? null) : null
  const shown = isNarrow ? cards.map((_, i) => i).filter((i) => i === page) : cards.map((_, i) => i)

  const place = (cardIndex: number, slotIndex: number) => {
    chooseSfx()
    act((s) => pickReward(s, cardIndex, slotIndex))
    setHovered(null)
  }

  return (
    <div className="cm-backdrop rq-scene rq-scene-reward">
      <div className="rc-scene">
        <button
          className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico rc-scene-help"
          onClick={onHelp}
          title="Como jogar"
          aria-label="Como jogar"
        >
          <HelpIcon size={15} />
        </button>
        <h2 className="cm-ribbon cm-ribbon-sm">
          <GiftIcon size={22} className="rq-h2-ico" /> Reforço à vista!
        </h2>
        <p className="rc-sub">Um clique contrata — cada carta já mostra quem sai do time.</p>
        {isNarrow && <CandidatePager count={cards.length} index={page} onSelect={setPage} />}
        <div className="pb-layout">
          <div className="rc-grid">
            {shown.map((i) => (
              <CandidateCard
                key={cards[i].id}
                p={cards[i]}
                state={state}
                onHover={(on) => setHovered(on ? i : null)}
                onPick={(slot) => place(i, slot)}
              />
            ))}
          </div>
          <PlacePlayerBoard state={state} candidate={candidate} />
        </div>
        <button className="cm-btn cm-btn-ghost pb-skip" onClick={() => act(skipReward)}>
          Recusar reforço →
        </button>
      </div>
    </div>
  )
}
