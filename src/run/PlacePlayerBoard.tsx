import type { ReactNode } from 'react'
import type { GenPlayer } from '../game/types'
import type { RunState } from '../game/runTypes'
import { xiStrength } from '../game/run'
import { slotOverallOf } from '../game/overall'
import { AttrList, attrColor } from '../ui/attrDisplay'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import FormationEditor from '../ui/FormationEditor'

/** Slot onde o reforço mais eleva a nota do time (e o quanto). */
export const bestSlotFor = (state: RunState, candidate: GenPlayer): { slot: number; gain: number } => {
  const slots = state.formationSlots
  let slot = 0
  let gain = -Infinity
  state.squad.forEach((p, i) => {
    const g = slotOverallOf(i, slots[i], candidate.attrs) - p.overall
    if (g > gain) {
      gain = g
      slot = i
    }
  })
  return { slot, gain }
}

/**
 * Carta de um jogador oferecido (recompensa ou mercado) com contratação de UM
 * clique: a própria carta já diz no lugar de quem o reforço entra (o slot que
 * mais eleva a nota, com o antes → depois) e clicar nela fecha a troca na
 * hora. Passar o mouse/foco mostra a prévia no campinho ao lado.
 */
export function CandidateCard({
  p,
  state,
  disabled,
  price,
  onHover,
  onPick,
}: {
  p: GenPlayer
  state: RunState
  disabled?: boolean
  /** preço em moedas (só no mercado) */
  price?: ReactNode
  /** mouse/foco entra ou sai da carta — liga a prévia no campinho */
  onHover: (on: boolean) => void
  /** clique: contrata direto no melhor slot */
  onPick: (slotIndex: number) => void
}) {
  const { slot, gain } = bestSlotFor(state, p)
  const out = state.squad[slot]
  const next = out.overall + gain
  return (
    <button
      className={`rc-card pb-card cm-role-${p.role.toLowerCase()}`}
      disabled={disabled}
      title={disabled ? 'Moedas insuficientes' : undefined}
      onClick={() => onPick(slot)}
      onPointerEnter={() => !disabled && onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => !disabled && onHover(true)}
      onBlur={() => onHover(false)}
    >
      <div className="rc-card-portrait">
        <img className="rc-card-spot" src="/assets/icons/card_spotlight.webp" alt="" aria-hidden="true" />
        <PlayerAvatar teamId={undefined} name={p.name} id={p.id} size={168} className="rc-card-face" />
      </div>
      <div className="rc-card-body">
        <div className="rc-card-name">{p.name}</div>
        <div className="rc-card-age">{p.age} anos</div>
        {price && <div className="pb-card-price">{price}</div>}
        <AttrList attrs={p.attrs} />
        <div className={`pb-card-go ${gain > 0 ? 'is-up' : 'is-down'}`}>
          <span className="pb-card-go-swap" aria-hidden>
            ⇄
          </span>
          <span className="pb-card-go-txt">
            Entra no lugar de <b>{out.name}</b>
          </span>
          <span className="pb-card-go-ovr">
            <b style={{ color: attrColor(out.overall) }}>{out.overall}</b>
            <span className="pb-arrow">→</span>
            <b style={{ color: attrColor(next) }}>{next}</b>
          </span>
        </div>
      </div>
    </button>
  )
}

/**
 * O campinho ao lado das cartas: os 11 do time nas posições reais, cada chip
 * com a nota atual. Com uma carta sob o mouse/foco, mostra o antes → depois
 * SE o reforço entrar em cada slot, com o melhor destacado (anel verde) — a
 * prévia é só leitura: quem fecha a troca é o clique na carta.
 */
export default function PlacePlayerBoard({
  state,
  candidate,
}: {
  state: RunState
  candidate: GenPlayer | null
}) {
  const slots = state.formationSlots
  const bestPick = candidate ? bestSlotFor(state, candidate) : null
  // só destaca como "melhor encaixe" quando entrar de fato SOBE a nota de
  // algum slot — senão o anel soaria como recomendação entregando troca pior.
  const best = bestPick && bestPick.gain > 0 ? bestPick.slot : null
  const myRating = Math.round(xiStrength(state))
  // nota do time SE o reforço entrar no melhor lugar — mesma conta de
  // `xiStrength`, só trocando um overall pelo do candidato naquele slot.
  const nextRating =
    bestPick && candidate
      ? Math.round(
          state.squad.reduce(
            (s, p, i) => s + (i === bestPick.slot ? slotOverallOf(i, slots[i], candidate.attrs) : p.overall),
            0,
          ) / state.squad.length,
        )
      : null
  return (
    <div className={`pb-board ${candidate ? 'is-armed' : ''}`}>
      {/* nota do time sempre visível — o mesmo contexto que já mostramos no
          vestiário antes do jogo, aqui na hora de decidir se vale contratar. */}
      <div className="pb-team-rating">
        <span>Nota do time</span>
        <b style={{ color: attrColor(myRating) }}>{myRating}</b>
        {nextRating !== null && nextRating !== myRating && (
          <>
            <span className="pb-arrow">→</span>
            <b style={{ color: attrColor(nextRating) }}>{nextRating}</b>
          </>
        )}
      </div>
      <FormationEditor
        slots={slots}
        xi={state.squad.map((p) => ({
          id: p.id,
          name: p.name,
          ovr: candidate ? undefined : p.overall,
        }))}
        teamId={state.clubId}
        highlight={best}
        chipExtra={
          candidate
            ? (i) => {
                const cur = state.squad[i].overall
                const next = slotOverallOf(i, slots[i], candidate.attrs)
                return (
                  <span className={`pb-preview ${next >= cur ? 'pb-up' : 'pb-down'}`}>
                    <b style={{ color: attrColor(cur) }}>{cur}</b>
                    <span className="pb-arrow">→</span>
                    <b style={{ color: attrColor(next) }}>{next}</b>
                  </span>
                )
              }
            : undefined
        }
      />
    </div>
  )
}
