import { useEffect, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { POTION_BOOST, POTION_INFO, claimPotion, pickReward, skipReward } from '../game/run'
import { chooseSfx, potionSfx, wonRewardSfx } from '../sfx/crowd'
import { useMediaQuery } from '../shared/useMediaQuery'
import { attrLabel } from '../ui/attrDisplay'
import { GiftIcon, HelpIcon, PotionIcon } from '../ui/icons'
import { CandidatePager } from './CandidatePager'
import PlacePlayerBoard, { CandidateCard } from './PlacePlayerBoard'
import type { RunApi } from './useRun'

/**
 * Recompensa após vencer (e chegada de craque/joia da bênção): cartas de
 * reforço + o campinho do time. O reforço SEMPRE entra no lugar de alguém:
 * toque na carta e depois no botão "melhor lugar" (ou num jogador do
 * campinho) — arrastar também funciona, mas não é preciso. Dá para recusar
 * e seguir com o time como está.
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
  const [armed, setArmed] = useState<number | null>(null)
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
  const candidate = armed !== null ? (cards[armed] ?? null) : null
  const shown = isNarrow ? cards.map((_, i) => i).filter((i) => i === page) : cards.map((_, i) => i)

  const place = (cardIndex: number, slotIndex: number) => {
    chooseSfx()
    act((s) => pickReward(s, cardIndex, slotIndex))
    setArmed(null)
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
        <p className="rc-sub">
          {candidate
            ? `Agora toque em quem sai — ${candidate.name} entra no lugar dele.`
            : 'Toque num reforço pra ver onde ele rende mais no seu time.'}
        </p>
        {state.pendingPotion && (
          <button
            className={`rq-potion-earned rq-potion-${state.pendingPotion}`}
            onClick={() => {
              potionSfx()
              act(claimPotion)
            }}
            title="Clique para guardar a poção no cabeçalho"
          >
            <PotionIcon kind={state.pendingPotion} size={30} className="rq-potion-earned-ico" />
            <span className="rq-potion-earned-txt">
              <strong>{POTION_INFO[state.pendingPotion].label}</strong>
              <small>
                +{POTION_BOOST} de {attrLabel(state.pendingPotion)} num jogador, por 1 partida
              </small>
            </span>
            <span className="rq-potion-grab">Pegar</span>
          </button>
        )}
        {isNarrow && !candidate && (
          <CandidatePager count={cards.length} index={page} onSelect={setPage} />
        )}
        <div className="pb-layout">
          <div className="rc-grid">
            {shown.map((i) => (
              <CandidateCard
                key={cards[i].id}
                p={cards[i]}
                armed={armed === i}
                onArm={(on) => setArmed(on ? i : null)}
                onPlace={(slot) => place(i, slot)}
              />
            ))}
          </div>
          <PlacePlayerBoard
            state={state}
            candidate={candidate}
            onPlace={(slot) => armed !== null && place(armed, slot)}
          />
        </div>
        <button className="cm-btn cm-btn-ghost pb-skip" onClick={() => act(skipReward)}>
          Recusar reforço →
        </button>
      </div>
    </div>
  )
}
