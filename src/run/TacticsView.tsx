import { useState } from 'react'
import type { RunState } from '../game/runTypes'
import { formationName } from '../sim/formation'
import { moveFormationSlot, setFormation, startingXI } from '../game/run'
import { lineupFor } from '../game/lineup'
import FormationEditor from '../ui/FormationEditor'
import { ClipboardIcon } from '../ui/icons'
import { PlayerDetailPop } from '../ui/PlayerDetail'
import type { RunApi } from './useRun'

/**
 * Aba Tática: o campinho compartilhado (`FormationEditor`) gravando direto no
 * estado da run. Os presets são atalhos para esquemas clássicos; quem ocupa
 * cada slot é decidido por `lineupFor` (o mesmo da partida), então o que se vê
 * aqui é exatamente o que entra em campo. Tocar num jogador abre os atributos
 * dele logo abaixo — pra decidir a posição vendo os números.
 */
export default function TacticsView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const slots = state.formationSlots
  const xi = lineupFor(startingXI(state), slots)

  const [selIdx, setSelIdx] = useState<number | null>(null)
  const slotPlayer = selIdx !== null ? xi[selIdx] : null
  const sel = slotPlayer ? (state.squad.find((p) => p.id === slotPlayer.id) ?? null) : null

  return (
    <div className="tv">
      <div className="rq-simple-top">
        <p className="rq-simple-hint">
          Arraste os jogadores de linha pra remodelar o esquema — a posição vale de verdade na partida.
          Toque num jogador pra ver os atributos dele.
        </p>
        <span className="tv-name">{formationName(slots)}</span>
      </div>

      <div className="tv-cols">
        <div className="tv-board">
          <FormationEditor
            slots={slots}
            xi={xi}
            teamId={state.clubId}
            selected={selIdx}
            onPreset={(presetSlots) => act((s) => setFormation(s, presetSlots))}
            onMove={(index, pos) => act((s) => moveFormationSlot(s, index, pos))}
            onSelect={setSelIdx}
          />
        </div>
        <aside className="tv-side">
          {sel ? (
            <PlayerDetailPop player={sel} teamId={state.clubId} onClose={() => setSelIdx(null)} />
          ) : (
            <div className="tv-side-empty">
              <ClipboardIcon size={40} className="tv-side-empty-ico" />
              <p>Toque num jogador do campinho pra ver os atributos dele aqui.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
