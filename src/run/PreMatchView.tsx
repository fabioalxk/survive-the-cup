import { useState } from 'react'
import type { RunState } from '../game/runTypes'
import { kickOff, moveFormationSlot, swapSlots, xiStrength } from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import { attrColor } from '../ui/attrDisplay'
import { ClubBadge } from '../ui/ClubBadge'
import { PlayerDetailPop } from '../ui/PlayerDetail'
import { PlayIcon } from '../ui/icons'
import FormationEditor from '../ui/FormationEditor'
import type { RunApi } from './useRun'

/** Nota média do time adversário — mesmo cálculo de `xiStrength`, mas pro time de fora. */
const oppStrength = (squad: { overall: number }[]): number =>
  Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length)

/**
 * Vestiário (pré-jogo): a ÚNICA tela entre o mapa e a bola rolar. Os 11 já
 * estão no campinho — toque em 2 jogadores pra trocar de lugar (vale até o
 * gol), arraste pra remodelar o esquema — e UMA ação primária: Jogar.
 * Cabe inteira na tela sem rolar: cabeçalho e rodapé têm altura fixa, o
 * campinho é o único elemento flexível e encolhe mantendo a proporção do campo.
 */
export default function PreMatchView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const [selIdx, setSelIdx] = useState<number | null>(null)
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
    act((s) => swapSlots(s, selIdx, i))
    setSelIdx(null)
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
            <span
              className="rq-prematch-vs"
              title="Nota do seu time × nota do adversário"
              aria-label={`Sua nota ${myRating} contra a nota ${oppRating} do adversário`}
            >
              <b style={{ color: attrColor(myRating) }} aria-hidden>
                {myRating}
              </b>
              <span className="rq-prematch-vs-x" aria-hidden>
                ×
              </span>
              <b style={{ color: attrColor(oppRating) }} aria-hidden>
                {oppRating}
              </b>
            </span>
          </div>
        </header>

        <div className="rq-prematch-board">
          <FormationEditor
            slots={state.formationSlots}
            xi={state.squad.map((p) => ({ id: p.id, name: p.name, ovr: p.overall }))}
            teamId={state.clubId}
            selected={selIdx}
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
        </footer>
      </div>
    </div>
  )
}
