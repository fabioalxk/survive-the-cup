import { useRef, useState } from 'react'
import type { GenPlayer } from '../game/types'
import type { RunState } from '../game/runTypes'
import {
  autoOrganizeSquad,
  kickOff,
  moveFormationSlot,
  quickPlayNode,
  setFormation,
  setSquadOrder,
  swapSlots,
} from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import { ClubBadge } from '../ui/ClubBadge'
import { PlayerDetailPop } from '../ui/PlayerDetail'
import { HelpIcon, PlayIcon, SkipIcon, SwapIcon } from '../ui/icons'
import FormationEditor from '../ui/FormationEditor'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import type { RunApi } from './useRun'

/**
 * Vestiário (pré-jogo): a ÚNICA tela entre o mapa e a bola rolar. Os 11 já
 * estão no campinho — toque em 2 jogadores pra trocar de lugar (vale até o
 * gol), arraste pra remodelar o esquema, ou "Organizar sozinho" pra deixar o
 * time montar a melhor escalação num só toque — e UMA ação primária: Jogar.
 */
export default function PreMatchView({
  state,
  act,
  onHelp,
}: {
  state: RunState
  act: RunApi['act']
  onHelp: () => void
}) {
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [undo, setUndo] = useState<GenPlayer[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasMore = useScrollOverflow(scrollRef)
  const node = state.nodes.find((n) => n.id === state.currentNodeId)
  const opp = node?.opponent ? ALL_CLUBS[node.opponent.clubId] : undefined
  const isBoss = node?.kind === 'boss'
  const sel = selIdx !== null ? state.squad[selIdx] : null

  if (!node || !node.opponent) return null

  /** Toque num chip: 1º seleciona (mostra atributos), 2º troca os dois de lugar. */
  const tap = (i: number) => {
    if (selIdx === null || selIdx === i) {
      setSelIdx(selIdx === i ? null : i)
      return
    }
    setUndo(state.squad.slice())
    act((s) => swapSlots(s, selIdx, i))
    setSelIdx(null)
  }

  const organize = () => {
    setUndo(state.squad.slice())
    act((s) => autoOrganizeSquad(s))
  }

  const undoLast = () => {
    if (!undo) return
    act((s) => setSquadOrder(s, undo))
    setUndo(null)
  }

  return (
    <div className="cm-backdrop rq-scene rq-scene-prematch">
      <div className="cm-modal rq-prematch" ref={scrollRef}>
        <header className="rq-prematch-head">
          {opp && <ClubBadge club={opp} size={44} />}
          <div>
            <h2 className="cm-ribbon cm-ribbon-sm">{isBoss ? '👑 CHEFÃO' : 'Próximo jogo'}</h2>
            <p>
              vs <strong>{opp?.name ?? node.opponent.clubId}</strong> · toque em 2 jogadores pra
              trocar de lugar, arraste pra mudar o esquema.
            </p>
          </div>
          {undo && (
            <button
              className="cm-btn cm-btn-ghost cm-btn-sm"
              onClick={undoLast}
              title="Volta o time pra ordem de antes da última troca"
            >
              ↩ Desfazer
            </button>
          )}
          <button
            className="cm-btn cm-btn-sm rq-prematch-auto"
            onClick={organize}
            title="Encaixa cada jogador onde ele mais rende, num só toque"
          >
            <SwapIcon size={14} className="cm-btn-ico-lead" /> Organizar sozinho
          </button>
          <button className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico" onClick={onHelp} title="Como jogar">
            <HelpIcon size={15} />
          </button>
        </header>

        <div className="rq-prematch-board">
          <FormationEditor
            slots={state.formationSlots}
            xi={state.squad.map((p) => ({ id: p.id, number: p.number, name: p.name, ovr: p.overall }))}
            teamId={state.clubId}
            selected={selIdx}
            onPreset={(slots) => act((s) => setFormation(s, slots))}
            onMove={(index, pos) => act((s) => moveFormationSlot(s, index, pos))}
            onSelect={tap}
          />
        </div>

        {sel && (
          <PlayerDetailPop
            player={sel}
            teamId={state.clubId}
            showRole={false}
            extra={<> · toque em outro jogador pra trocar</>}
            onClose={() => setSelIdx(null)}
          />
        )}

        <footer className="rq-prematch-foot">
          {hasMore && (
            <span className="rq-prematch-more" aria-hidden>
              role para ver o time completo ▾
            </span>
          )}
          <div className="rq-prematch-foot-btns">
            <button className="cm-btn cm-btn-go cm-btn-lg cm-btn-block" onClick={() => act(kickOff)}>
              <PlayIcon size={18} className="cm-btn-ico-lead" /> Jogar
            </button>
            <button
              className="cm-btn cm-btn-ghost cm-btn-sm"
              onClick={() => act((s) => quickPlayNode(s))}
              title="Resolve a partida na hora, sem assistir"
            >
              Pular <SkipIcon size={13} className="cm-btn-ico-trail" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
