import { useRef, useState } from 'react'
import type { Attrs, Vec2 } from '../sim/types'
import type { RunState } from '../game/runTypes'
import { GYM_GAIN, boostAttribute, leaveNode, moveFormationSlot, setFormation } from '../game/run'
import { gymTrains } from '../game/ascension'
import { slotOverallOf } from '../game/overall'
import { upgradeSfx } from '../sfx/crowd'
import { formationName } from '../sim/formation'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import { attrColor, attrGroupsFor, attrLabel } from '../ui/attrDisplay'
import FormationEditor from '../ui/FormationEditor'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import { PlayerDetailHead } from '../ui/PlayerDetail'
import { ClipboardIcon, HelpIcon } from '../ui/icons'
import { GymIcon } from './MapIcons'
import type { RunApi } from './useRun'

const afterTrain = (v: number): number => Math.min(100, v + GYM_GAIN)

/** Atributo treinável com o MAIOR ganho de OVR nesse slot — o padrão ao
 * selecionar um jogador (ex.: um goleiro treina "Goleiro", não "Velocidade"
 * só porque vem primeiro na lista de categorias). */
const bestTrainable = (slotIndex: number, slot: Vec2, attrs: Attrs): keyof Attrs => {
  const keys = attrGroupsFor()
    .flatMap((g) => g.keys)
    .filter((k) => attrs[k.key] < 100)
  if (!keys.length) return attrGroupsFor()[0].keys[0].key
  const baseOvr = slotOverallOf(slotIndex, slot, attrs)
  let best = keys[0].key
  let bestGain = -Infinity
  for (const k of keys) {
    const gain = slotOverallOf(slotIndex, slot, { ...attrs, [k.key]: afterTrain(attrs[k.key]) }) - baseOvr
    if (gain > bestGain) {
      bestGain = gain
      best = k.key
    }
  }
  return best
}

/** Antes/depois do treino (atributo e nota geral) — vira o snapshot ao confirmar. */
interface TrainDelta {
  playerName: string
  attr: keyof Attrs
  before: number
  after: number
  ovrBefore: number
  ovrAfter: number
}

/**
 * Evento de ACADEMIA no mapa: o campinho compartilhado (`FormationEditor`)
 * mostra os 11 do time nas posições reais da partida — dá pra mudar o esquema
 * ali mesmo. Tocar num jogador abre os atributos treináveis ao lado:
 * melhoramentos de +20 (teto 100), quantidade cai com a ascension
 * (`gymTrains`). O ganho de OVR mostrado é o do SLOT que o jogador ocupa.
 */
export default function GymNodeView({
  state,
  act,
  onHelp,
}: {
  state: RunState
  act: RunApi['act']
  onHelp: () => void
}) {
  const TRAINS = gymTrains(state.ascension)
  const slots = state.formationSlots
  const fieldRef = useRef<HTMLDivElement>(null)
  const fieldHasMore = useScrollOverflow(fieldRef)
  const attrsRef = useRef<HTMLDivElement>(null)
  const attrsHasMore = useScrollOverflow(attrsRef)

  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [attr, setAttr] = useState<keyof Attrs>('pace')
  // true até o treinador escolher um atributo na mão — enquanto isso, trocar de
  // jogador sempre recalcula o melhor atributo pro jogador novo (em vez de
  // manter "Velocidade" só porque é o primeiro da lista de categorias).
  const [autoAttr, setAutoAttr] = useState(true)
  const [results, setResults] = useState<TrainDelta[]>([])

  const player = selIdx !== null ? state.squad[selIdx] : null
  const trainsLeft = TRAINS - results.length
  const done = trainsLeft <= 0

  /** Nota que o jogador teria NO SLOT DELE se treinasse `key` agora. */
  const ovrIfTrained = (key: keyof Attrs): number =>
    slotOverallOf(selIdx!, slots[selIdx!], { ...player!.attrs, [key]: afterTrain(player!.attrs[key]) })

  /** Escolha manual de atributo — passa a valer como preferência explícita. */
  const chooseAttr = (k: keyof Attrs) => {
    setAttr(k)
    setAutoAttr(false)
  }

  /** Troca de jogador: mantém o atributo escolhido À MÃO quando ele segue
   * treinável; senão (ou sem escolha manual ainda) usa o de maior ganho de OVR. */
  const selectPlayer = (i: number) => {
    setSelIdx(i)
    const attrs = state.squad[i].attrs
    if (autoAttr || attrs[attr] >= 100) setAttr(bestTrainable(i, slots[i], attrs))
  }

  // delta da escolha atual; ao treinar ele é congelado em `results` (o estado muta no act)
  const preview: TrainDelta | null = player
    ? {
        playerName: player.name,
        attr,
        before: player.attrs[attr],
        after: afterTrain(player.attrs[attr]),
        ovrBefore: player.overall,
        ovrAfter: ovrIfTrained(attr),
      }
    : null

  const train = () => {
    if (!preview || !player || done) return
    upgradeSfx()
    act((s) => boostAttribute(s, player.id, attr))
    setResults((r) => [...r, preview])
    // o act muta na hora: se o atributo bateu 100, pula pro de maior ganho a
    // seguir — a escolha manual anterior não vale mais (bateu o teto)
    if (player.attrs[attr] >= 100) {
      setAttr(bestTrainable(selIdx!, slots[selIdx!], player.attrs))
      setAutoAttr(true)
    }
  }

  const summary = done ? (results[results.length - 1] ?? null) : preview

  return (
    <div className="cm-backdrop rq-scene rq-scene-gym">
      <div className={`cm-modal rq-gym ${player ? 'has-sel' : ''}`}>
        <header className="rq-gym-head">
          <span className="rq-gym-ico" aria-hidden>
            <GymIcon size={32} />
          </span>
          <div className="rq-gym-title">
            <h2 className="cm-ribbon cm-ribbon-sm">Treinamento</h2>
            <p>
              {done ? (
                'Treinamento concluído — sem melhoramentos restantes.'
              ) : (
                <>
                  Melhoramentos de <strong>+{GYM_GAIN} pontos</strong> (teto 100). Toque num jogador
                  pra treinar; arraste no campinho pra mudar a tática.
                </>
              )}
            </p>
          </div>
          <div
            className={`rq-gym-count ${done ? 'is-done' : ''}`}
            title={`${TRAINS} melhoramentos neste treinamento`}
          >
            <strong key={trainsLeft}>{done ? '✓' : trainsLeft}</strong>
            <span>{done ? 'completo' : trainsLeft === 1 ? 'restante' : 'restantes'}</span>
          </div>
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
            onClick={onHelp}
            title="Como jogar"
            aria-label="Como jogar"
          >
            <HelpIcon size={15} />
          </button>
        </header>

        <div className="rq-gym-body">
          <div
            className={`rq-gym-field${fieldHasMore ? ' has-more' : ''}`}
            aria-label="Tática e time"
            ref={fieldRef}
          >
            <div className="rq-gym-field-head">
              <h4>
                <ClipboardIcon size={14} /> Seu time
              </h4>
              <span className="tv-name">{formationName(slots)}</span>
            </div>
            <FormationEditor
              slots={slots}
              xi={state.squad.map((p) => ({ id: p.id, name: p.name, ovr: p.overall }))}
              teamId={state.clubId}
              selected={selIdx}
              onPreset={(presetSlots) => act((s) => setFormation(s, presetSlots))}
              onMove={(index, pos) => act((s) => moveFormationSlot(s, index, pos))}
              onSelect={selectPlayer}
            />
          </div>

          <section
            className={`rq-gym-attrs${attrsHasMore ? ' has-more' : ''}`}
            aria-label="Atributos"
            ref={attrsRef}
          >
            {player ? (
              <>
                <button
                  className="cm-btn cm-btn-ghost cm-btn-sm rq-gym-back"
                  onClick={() => setSelIdx(null)}
                >
                  Campinho
                </button>
                <PlayerDetailHead player={player} teamId={state.clubId} showRole={false} />
                {attrGroupsFor().map((g) => (
                  <div key={g.title} className="rq-gym-group">
                    <h4>{g.title}</h4>
                    <div className="rq-gym-chips">
                      {g.keys.map((k) => {
                        const val = player.attrs[k.key]
                        const maxed = val >= 100
                        const ovrGain = ovrIfTrained(k.key) - player.overall
                        return (
                          <button
                            key={k.key}
                            className={`rq-chip ${attr === k.key ? 'active' : ''}`}
                            disabled={done || maxed}
                            onClick={() => chooseAttr(k.key)}
                            title={`${k.desc}\n${k.effects.map((e) => `• ${e}`).join('\n')}`}
                          >
                            <span>{k.label}</span>
                            <b key={val} className="rq-chip-val" style={{ color: attrColor(val) }}>
                              {val}
                            </b>
                            {maxed ? (
                              <span className="rq-chip-max">MAX</span>
                            ) : ovrGain > 0 ? (
                              <span className="rq-chip-gain">+{ovrGain} OVR</span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="tv-side-empty">
                <GymIcon size={40} />
                <p>Toque num jogador do campinho pra ver os atributos e treinar.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="rq-gym-foot">
          {results.length > 0 && !done && (
            <div className="rq-gym-history">
              {results.map((r, i) => (
                <span key={i} className="rq-gym-history-item">
                  ✓ {r.playerName}: {attrLabel(r.attr)} {r.before}
                  <span className="rq-gym-arrow">→</span>
                  {r.after}
                </span>
              ))}
            </div>
          )}
          {summary && (
            <div
              key={results.length}
              className={`rq-gym-summary ${done ? 'rq-gym-done' : ''}`}
              role="status"
            >
              {done ? (
                <span className="rq-gym-done-ico" aria-hidden>
                  ✓
                </span>
              ) : (
                player && (
                  <PlayerAvatar teamId={state.clubId} name={player.name} id={player.id} size={28} />
                )
              )}
              <strong className="rq-gym-summary-name">{summary.playerName}</strong>
              <span className="rq-gym-delta">
                {attrLabel(summary.attr)}
                <b style={{ color: attrColor(summary.before) }}>{summary.before}</b>
                <span className="rq-gym-arrow">→</span>
                <b style={{ color: attrColor(summary.after) }}>{summary.after}</b>
              </span>
              {summary.ovrAfter > summary.ovrBefore && (
                <span className="rq-gym-ovr-badge">
                  OVR {summary.ovrBefore} → {summary.ovrAfter}
                </span>
              )}
            </div>
          )}
          {done ? (
            <button
              className="cm-btn cm-btn-go cm-btn-lg cm-btn-block"
              onClick={() => act((s) => leaveNode(s))}
            >
              Seguir viagem →
            </button>
          ) : (
            <>
              {player && summary && (
                <button
                  className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block"
                  onClick={train}
                  disabled={summary.before >= 100}
                  title={summary.before >= 100 ? 'Este atributo já está no limite (100)' : undefined}
                >
                  Treinar ({trainsLeft} restante{trainsLeft > 1 ? 's' : ''})
                </button>
              )}
              {/* diferente do mercado/recompensa, sem isto não tinha COMO sair
                  do treino sem gastar todos os melhoramentos — nem esse botão
                  aparecia antes de escolher alguém pra treinar. */}
              <button
                className="cm-btn cm-btn-ghost"
                onClick={() => act((s) => leaveNode(s))}
                title="Sai sem usar os melhoramentos restantes"
              >
                Seguir viagem sem treinar mais →
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
