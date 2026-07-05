import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { GenPlayer } from '../game/types'
import type { RunState } from '../game/runTypes'
import { slotOverallOf } from '../game/overall'
import { AttrList, attrColor } from '../ui/attrDisplay'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import FormationEditor, { DRAG_THRESHOLD } from '../ui/FormationEditor'

/** Slot do campinho sob o dedo/cursor (os chips têm `data-slot`). */
const slotAt = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y)?.closest('[data-slot]')
  return el instanceof HTMLElement ? Number(el.dataset.slot) : null
}

/**
 * Carta de um jogador oferecido (recompensa ou mercado) com a interação única
 * de encaixe: ARRASTE a carta para cima de um jogador do campinho — ou TOQUE
 * na carta (arma) e depois no jogador que dá o lugar. Sem rótulo de posição e
 * sem nota fixa: a nota que importa é a do slot onde ele for encaixado (o
 * campinho mostra o antes → depois em cada jogador enquanto a carta está armada).
 */
export function CandidateCard({
  p,
  armed,
  disabled,
  price,
  onArm,
  onPlace,
}: {
  p: GenPlayer
  armed: boolean
  disabled?: boolean
  /** preço em moedas (só no mercado) */
  price?: ReactNode
  onArm: (on: boolean) => void
  onPlace: (slotIndex: number) => void
}) {
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  return (
    <button
      className={`rc-card pb-card cm-role-${p.role.toLowerCase()} ${armed ? 'is-armed' : ''}`}
      disabled={disabled}
      title={disabled ? 'Moedas insuficientes' : undefined}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, y: e.clientY, moved: false }
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s) return
        if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) <= DRAG_THRESHOLD) return
        if (!s.moved) {
          s.moved = true
          onArm(true) // arrastando: o campinho já mostra o antes → depois
        }
        setGhost({ x: e.clientX, y: e.clientY })
      }}
      onPointerUp={(e) => {
        const s = start.current
        start.current = null
        setGhost(null)
        if (!s) return
        if (s.moved) {
          const slot = slotAt(e.clientX, e.clientY)
          if (slot !== null) onPlace(slot)
          else onArm(false) // soltou fora do campinho: desarma
        } else {
          onArm(!armed) // toque simples: arma/desarma a carta
        }
      }}
      onPointerCancel={() => {
        start.current = null
        setGhost(null)
      }}
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
        {!armed && !disabled && <div className="pb-card-tap">👆 Toque para escolher</div>}
      </div>
      {ghost &&
        createPortal(
          <span className="pb-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden>
            <PlayerAvatar teamId={undefined} name={p.name} id={p.id} size={40} />
            <strong>{p.name}</strong>
          </span>,
          document.body,
        )}
    </button>
  )
}

/** Slot onde o reforço mais eleva a nota do time (e o quanto) — sugestão de "um clique". */
const bestSlotFor = (state: RunState, candidate: GenPlayer): { slot: number; gain: number } => {
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
 * O campinho-alvo do encaixe: os 11 do time nas posições reais. Sem carta
 * armada, cada chip mostra a nota atual; com carta armada, mostra o
 * antes → depois SE o reforço entrar naquele slot, com o melhor destacado
 * (anel verde + botão de um toque) — é assim que o jogador decide rápido,
 * sem precisar de rótulos de posição nem de arrastar nada.
 */
export default function PlacePlayerBoard({
  state,
  candidate,
  onPlace,
}: {
  state: RunState
  candidate: GenPlayer | null
  onPlace: (slotIndex: number) => void
}) {
  const slots = state.formationSlots
  const bestPick = candidate ? bestSlotFor(state, candidate) : null
  // só chama de "melhor lugar" quando encaixar de fato SOBE a nota de algum slot —
  // senão o botão soaria como recomendação mesmo entregando uma troca pior.
  const best = bestPick && bestPick.gain > 0 ? bestPick.slot : null
  return (
    <div className={`pb-board ${candidate ? 'is-armed' : ''}`}>
      {candidate && best !== null && (
        <button className="cm-btn cm-btn-primary cm-btn-block pb-auto" onClick={() => onPlace(best)}>
          ★ Encaixar no melhor lugar — sai {state.squad[best].name}
        </button>
      )}
      {candidate && bestPick && best === null && (
        <p className="pb-no-gain">Nenhum encaixe melhora o time agora — toque num jogador pra trocar mesmo assim.</p>
      )}
      <FormationEditor
        slots={slots}
        xi={state.squad.map((p) => ({
          id: p.id,
          number: p.number,
          name: p.name,
          ovr: candidate ? undefined : p.overall,
        }))}
        teamId={state.clubId}
        highlight={best}
        onSelect={(i) => candidate && onPlace(i)}
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
