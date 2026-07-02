import { useState } from 'react'
import type { Vec2 } from '../sim/types'
import { FIELD } from '../sim/constants'
import { FORMATION_PRESETS, clampSlot, formationName, roleForSlot } from '../sim/formation'
import { uiClick } from '../sfx/crowd'
import { ROLE_LABEL } from './attrDisplay'
import { PlayerAvatar } from './PlayerAvatar'

/** Campo vertical na tela (ataque para CIMA) ⇄ coordenadas do motor (ataque para a DIREITA). */
const toScreen = (p: Vec2) => ({
  left: `${(1 - p.y / FIELD.h) * 100}%`,
  top: `${(1 - p.x / FIELD.w) * 100}%`,
})

/** O que o campinho precisa saber de cada titular para desenhar o chip do slot. */
export interface SlotPlayer {
  id: number
  number: number
  name: string
}

/**
 * Campinho tático compartilhado (aba Tática e pausa da partida): presets de
 * esquema + arrasto das âncoras. Arraste qualquer jogador de linha para
 * remodelar o esquema — a âncora movida vale DE VERDADE na partida (é o
 * `formationPos` que a IA usa para atacar e defender) e a função do slot
 * (DEF/MID/FWD) segue a faixa do campo onde ele foi solto. Quem usa decide
 * onde gravar a mudança (estado da run ou partida ao vivo).
 */
export default function FormationEditor({
  slots,
  xi,
  teamId,
  selected,
  onPreset,
  onMove,
  onSelect,
}: {
  slots: Vec2[]
  /** titular de cada slot, na MESMA ordem das âncoras */
  xi: SlotPlayer[]
  /** elenco dono da escalação — usado pra buscar a foto real do jogador, se houver */
  teamId?: string
  /** índice do slot destacado como selecionado (anel dourado no chip) */
  selected?: number | null
  onPreset: (slots: Vec2[]) => void
  onMove: (index: number, pos: Vec2) => void
  /** toque/soltura num chip — quem usa pode abrir os atributos do jogador */
  onSelect?: (index: number) => void
}) {
  const [drag, setDrag] = useState<{ index: number; pos: Vec2 } | null>(null)
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
      <div className="tv-presets">
        {Object.entries(FORMATION_PRESETS).map(([preset, presetSlots]) => (
          <button
            key={preset}
            className={`cm-btn cm-btn-sm ${name === preset ? 'active' : ''}`}
            onClick={() => onPreset(presetSlots.map((s) => ({ ...s })))}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="tv-pitch">
        <div className="tv-half-line" />
        <div className="tv-circle" />
        <div className="tv-box tv-box-top" />
        <div className="tv-box tv-box-bottom" />
        {xi.map((p, i) => {
          const pos = drag?.index === i ? drag.pos : slots[i]
          const role = roleForSlot(i, pos)
          return (
            <div
              key={i}
              className={`tv-chip tv-role-${role.toLowerCase()} ${drag?.index === i ? 'is-drag' : ''} ${selected === i ? 'is-sel' : ''}`}
              style={toScreen(pos)}
              title={i === 0 ? 'O goleiro fica no gol' : 'Arraste pra reposicionar'}
              onPointerDown={(e) => {
                if (i === 0) return
                e.currentTarget.setPointerCapture(e.pointerId)
                setDrag({ index: i, pos: slots[i] })
              }}
              onPointerMove={(e) => {
                if (drag?.index !== i) return
                setDrag({ index: i, pos: toField(e.currentTarget.parentElement!, e.clientX, e.clientY) })
              }}
              onPointerUp={() => {
                if (drag?.index === i) {
                  onMove(i, drag.pos)
                  setDrag(null)
                }
                uiClick()
                onSelect?.(i)
              }}
              onPointerCancel={() => setDrag(null)}
            >
              <PlayerAvatar teamId={teamId} name={p.name} id={p.id} size={32} className="tv-chip-photo" />
              <span className="tv-chip-name">{p.name}</span>
              <span className="tv-chip-role">{ROLE_LABEL[role]}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}
