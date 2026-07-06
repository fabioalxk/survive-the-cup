import { useState, type ReactNode } from 'react'
import type { Vec2 } from '../sim/types'
import { FIELD } from '../sim/constants'
import { FORMATION_PRESETS, clampSlot, formationName, roleForSlot } from '../sim/formation'
import { uiClick } from '../sfx/crowd'
import { handleRadioGroupKeyDown } from '../shared/radioGroupKeyDown'
import { attrColor } from './attrDisplay'
import { LockIcon } from './icons'
import { PlayerAvatar } from './PlayerAvatar'

/** Distância (px) a partir da qual um toque vira arrasto — mesmo limiar usado no encaixe (PlacePlayerBoard). */
export const DRAG_THRESHOLD = 8

/** Passo (m) de um nudge por teclado (setas) na âncora do slot. */
const KEY_NUDGE = 3

/** Campo vertical na tela (ataque para CIMA) ⇄ coordenadas do motor (ataque para a DIREITA). */
const toScreen = (p: Vec2) => ({
  left: `${(1 - p.y / FIELD.h) * 100}%`,
  top: `${(1 - p.x / FIELD.w) * 100}%`,
})

/** O que o campinho precisa saber de cada titular para desenhar o chip do slot. */
export interface SlotPlayer {
  id: number
  name: string
  /** nota geral no slot atual — o chip mostra o número, nunca um rótulo de posição */
  ovr?: number
}

/**
 * Campinho tático compartilhado (pré-jogo, academia, pausa da partida e telas
 * de encaixe de reforço). Arraste qualquer jogador de linha para remodelar o
 * esquema — a âncora movida vale DE VERDADE na partida (é o `formationPos` que
 * a IA usa) e a função do slot segue a faixa do campo onde ele foi solto.
 * Um TOQUE (sem arrastar) dispara `onSelect` — quem usa decide o que fazer
 * (abrir atributos, trocar dois jogadores, encaixar um reforço…).
 * `onPreset`/`onMove` são opcionais: sem eles o campinho vira só um alvo de toque.
 */
export default function FormationEditor({
  slots,
  xi,
  teamId,
  selected,
  highlight,
  onPreset,
  onMove,
  onSelect,
  chipExtra,
}: {
  slots: Vec2[]
  /** titular de cada slot, na MESMA ordem das âncoras */
  xi: SlotPlayer[]
  /** elenco dono da escalação — usado pra buscar a foto real do jogador, se houver */
  teamId?: string
  /** índice do slot destacado como selecionado (anel dourado no chip) */
  selected?: number | null
  /** índice do slot sugerido como melhor encaixe (anel verde no chip) */
  highlight?: number | null
  /** presets de esquema (4-4-2…) — ausente, a linha de presets não aparece */
  onPreset?: (slots: Vec2[]) => void
  /** arrasto das âncoras — ausente, os chips não arrastam (só toque) */
  onMove?: (index: number, pos: Vec2) => void
  /** TOQUE num chip (arrastar não conta como toque) */
  onSelect?: (index: number) => void
  /** conteúdo extra por chip (ex.: preview de nota ao encaixar um reforço) */
  chipExtra?: (index: number) => ReactNode
}) {
  const [drag, setDrag] = useState<{
    index: number
    pos: Vec2
    sx: number
    sy: number
    moved: boolean
  } | null>(null)
  const name = formationName(slots)

  const toField = (el: HTMLElement, clientX: number, clientY: number): Vec2 => {
    const r = el.getBoundingClientRect()
    return clampSlot({
      x: (1 - (clientY - r.top) / r.height) * FIELD.w,
      y: (1 - (clientX - r.left) / r.width) * FIELD.h,
    })
  }

  return (
    <>
      {onPreset && (
        <div className="tv-presets-wrap">
          <span className="tv-presets-label">Esquema</span>
          <div
            className="tv-presets"
            role="radiogroup"
            aria-label="Esquema tático"
            onKeyDown={handleRadioGroupKeyDown}
          >
            {Object.entries(FORMATION_PRESETS).map(([preset, presetSlots]) => (
              <button
                key={preset}
                role="radio"
                aria-checked={name === preset}
                tabIndex={name === preset ? 0 : -1}
                className={`cm-btn cm-btn-sm ${name === preset ? 'active' : ''}`}
                onClick={() => onPreset(presetSlots.map((s) => ({ ...s })))}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tv-pitch">
        <div className="tv-corner tv-corner-tl" aria-hidden />
        <div className="tv-corner tv-corner-tr" aria-hidden />
        <div className="tv-corner tv-corner-bl" aria-hidden />
        <div className="tv-corner tv-corner-br" aria-hidden />
        <div className="tv-half-line" />
        <div className="tv-circle" />
        <div className="tv-box tv-box-top" />
        <div className="tv-arc tv-arc-top" aria-hidden />
        <div className="tv-box tv-box-bottom" />
        <div className="tv-arc tv-arc-bottom" aria-hidden />
        {xi.map((p, i) => {
          const pos = drag?.index === i ? drag.pos : slots[i]
          const role = roleForSlot(i, pos)
          const locked = i === 0 && !!onMove
          const interactive = !!onSelect || !!onMove
          const nudge = (dx: number, dy: number) => {
            if (!onMove || locked) return
            onMove(i, clampSlot({ x: slots[i].x + dx, y: slots[i].y + dy }))
          }
          return (
            <div
              key={i}
              data-slot={i}
              className={`tv-chip tv-role-${role.toLowerCase()} ${drag?.index === i && drag.moved ? 'is-drag' : ''} ${selected === i ? 'is-sel' : ''} ${highlight === i ? 'is-best' : ''}`}
              style={toScreen(pos)}
              title={locked ? 'Goleiro não muda de posição' : p.name}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={locked ? `${p.name} — posição fixa de goleiro` : p.name}
              onPointerDown={(e) => {
                if (!onMove || locked) return
                e.currentTarget.setPointerCapture(e.pointerId)
                setDrag({ index: i, pos: slots[i], sx: e.clientX, sy: e.clientY, moved: false })
              }}
              onPointerMove={(e) => {
                if (drag?.index !== i) return
                const moved =
                  drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > DRAG_THRESHOLD
                setDrag({
                  ...drag,
                  pos: toField(e.currentTarget.parentElement!, e.clientX, e.clientY),
                  moved,
                })
              }}
              onPointerUp={() => {
                uiClick()
                if (drag?.index === i) {
                  setDrag(null)
                  if (drag.moved) {
                    onMove?.(i, drag.pos)
                    return // arrastou: não conta como toque
                  }
                }
                onSelect?.(i)
              }}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect?.(i)
                  return
                }
                if (e.key === 'ArrowUp') nudge(KEY_NUDGE, 0)
                else if (e.key === 'ArrowDown') nudge(-KEY_NUDGE, 0)
                else if (e.key === 'ArrowLeft') nudge(0, KEY_NUDGE)
                else if (e.key === 'ArrowRight') nudge(0, -KEY_NUDGE)
                else return
                e.preventDefault()
              }}
            >
              <span className="tv-chip-photo-wrap">
                <PlayerAvatar teamId={teamId} name={p.name} id={p.id} size={32} className="tv-chip-photo" />
                {p.ovr !== undefined && (
                  <span className="tv-chip-ovr" style={{ color: attrColor(p.ovr) }}>
                    {p.ovr}
                  </span>
                )}
                {locked && (
                  <span className="tv-chip-lock" aria-hidden>
                    <LockIcon size={9} />
                  </span>
                )}
              </span>
              {highlight === i && <span className="tv-chip-best">★ melhor encaixe</span>}
              <span className="tv-chip-name">{p.name}</span>
              {chipExtra?.(i)}
            </div>
          )
        })}
      </div>
    </>
  )
}
