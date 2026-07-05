import { useState } from 'react'
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
  xiStrength,
} from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import { attrColor } from '../ui/attrDisplay'
import { ClubBadge } from '../ui/ClubBadge'
import { PlayerDetailPop } from '../ui/PlayerDetail'
import { AutoIcon, HelpIcon, PlayIcon, SkipIcon } from '../ui/icons'
import FormationEditor from '../ui/FormationEditor'
import type { RunApi } from './useRun'

/** Nota média do time adversário — mesmo cálculo de `xiStrength`, mas pro time de fora. */
const oppStrength = (squad: { overall: number }[]): number =>
  Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length)

/**
 * Vestiário (pré-jogo): a ÚNICA tela entre o mapa e a bola rolar. Os 11 já
 * estão no campinho — toque em 2 jogadores pra trocar de lugar (vale até o
 * gol), arraste pra remodelar o esquema, ou "Organizar" pra deixar o time
 * montar a melhor escalação num só toque — e UMA ação primária: Jogar.
 * Cabe inteira na tela sem rolar: cabeçalho e rodapé têm altura fixa, o
 * campinho é o único elemento flexível e encolhe mantendo a proporção do campo.
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
  const node = state.nodes.find((n) => n.id === state.currentNodeId)
  const opp = node?.opponent ? ALL_CLUBS[node.opponent.clubId] : undefined
  const isBoss = node?.kind === 'boss'
  const sel = selIdx !== null ? state.squad[selIdx] : null

  if (!node || !node.opponent) return null

  const myRating = Math.round(xiStrength(state))
  const oppRating = oppStrength(node.opponent.squad)

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
      <div className={`cm-modal rq-prematch ${sel ? 'has-detail' : ''}`}>
        <header className="rq-prematch-head">
          <div className="rq-prematch-title">
            {opp && (
              <span className="rq-prematch-crest">
                <ClubBadge club={opp} size={32} />
              </span>
            )}
            <div className="rq-prematch-title-text">
              <span className="rq-prematch-kicker">{isBoss ? '👑 Chefão' : 'Próximo jogo'}</span>
              <h2>vs {opp?.name ?? node.opponent.clubId}</h2>
            </div>
            {/* comparação de nota (seu XI × XI do rival): o jogo já calcula essa
                força pra resolver a partida (`xiStrength`) mas nunca mostrava —
                todo squad-manager comercial expõe essa comparação antes do jogo,
                é o contexto que falta pra "Jogar" fazer sentido como decisão. */}
            <span className="rq-prematch-vs" title="Nota do seu time × nota do adversário">
              <b style={{ color: attrColor(myRating) }}>{myRating}</b>
              <span className="rq-prematch-vs-x">×</span>
              <b style={{ color: attrColor(oppRating) }}>{oppRating}</b>
            </span>
          </div>
          <div className="rq-prematch-actions">
            {undo && (
              <button
                className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
                onClick={undoLast}
                title="Volta o time pra ordem de antes da última mudança"
                aria-label="Desfazer última mudança"
              >
                ↩
              </button>
            )}
            <button
              className="cm-btn cm-btn-sm rq-prematch-auto"
              onClick={organize}
              title="Encaixa cada jogador onde ele mais rende, num só toque"
              aria-label="Organizar automaticamente"
            >
              <AutoIcon size={14} className="cm-btn-ico-lead" />
              <span className="rq-prematch-auto-label">Organizar</span>
            </button>
            <button
              className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
              onClick={onHelp}
              title="Como jogar"
              aria-label="Como jogar"
            >
              <HelpIcon size={15} />
            </button>
          </div>
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
        </footer>
      </div>
    </div>
  )
}
