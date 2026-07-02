import { useEffect, useState } from 'react'
import type { Attrs, Role } from '../sim/types'
import type { RunState } from '../game/runTypes'
import { GYM_GAIN, boostAttribute, leaveNode } from '../game/run'
import { gymTrains } from '../game/ascension'
import { overallOf } from '../game/overall'
import { ATTR_GROUPS, RoleTag, attrColor, attrLabel } from '../ui/attrDisplay'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import { GymIcon } from './MapIcons'
import type { RunApi } from './useRun'

const ROLE_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

/** Grupos de atributos visíveis para a posição (o bloco Goleiro só aparece para GK). */
const groupsFor = (role: Role) => ATTR_GROUPS.filter((g) => g.title !== 'Goleiro' || role === 'GK')

const afterTrain = (v: number): number => Math.min(100, v + GYM_GAIN)

/** Nota geral que o jogador teria se treinasse `key` agora — mostra o impacto real do treino. */
const ovrIfTrained = (role: Role, attrs: Attrs, key: keyof Attrs): number =>
  overallOf(role, { ...attrs, [key]: afterTrain(attrs[key]) })

/** Primeiro atributo ainda treinável (< 100) dentre os visíveis para a posição. */
const firstTrainable = (role: Role, attrs: Attrs): keyof Attrs => {
  const keys = groupsFor(role).flatMap((g) => g.keys)
  return (keys.find((k) => attrs[k.key] < 100) ?? keys[0]).key
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
 * Evento de ACADEMIA no mapa: melhoramentos de +20 (teto 100) — a quantidade
 * cai conforme a ascension da corrida (`gymTrains`). Cada treino escolhe 1
 * jogador e 1 atributo — depois é só seguir viagem.
 */
export default function GymNodeView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const TRAINS = gymTrains(state.ascension)
  const squad = [...state.squad].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.overall - a.overall,
  )
  const [playerId, setPlayerId] = useState<number>(squad[0]?.id ?? 0)
  const [attr, setAttr] = useState<keyof Attrs>(() =>
    squad[0] ? firstTrainable(squad[0].role, squad[0].attrs) : 'pace',
  )
  const [results, setResults] = useState<TrainDelta[]>([])

  const player = state.squad.find((p) => p.id === playerId)
  const trainsLeft = TRAINS - results.length
  const done = trainsLeft <= 0

  // após um treino o atributo escolhido pode ter batido 100 — pula para o próximo treinável
  useEffect(() => {
    if (!done && player && player.attrs[attr] >= 100) {
      setAttr(firstTrainable(player.role, player.attrs))
    }
  }, [done, player, attr])

  /** Troca de jogador mantendo o atributo escolhido quando ele segue válido e treinável. */
  const selectPlayer = (p: (typeof squad)[number]) => {
    setPlayerId(p.id)
    const visible = groupsFor(p.role).some((g) => g.keys.some((k) => k.key === attr))
    if (!visible || p.attrs[attr] >= 100) setAttr(firstTrainable(p.role, p.attrs))
  }

  // delta da escolha atual; ao treinar ele é congelado em `results` (o estado muta no act)
  const preview: TrainDelta | null = player
    ? {
        playerName: player.name,
        attr,
        before: player.attrs[attr],
        after: afterTrain(player.attrs[attr]),
        ovrBefore: player.overall,
        ovrAfter: ovrIfTrained(player.role, player.attrs, attr),
      }
    : null

  const train = () => {
    if (!preview || done) return
    act((s) => boostAttribute(s, playerId, attr))
    setResults((r) => [...r, preview])
  }

  const summary = done ? (results[results.length - 1] ?? null) : preview

  return (
    <div className="cm-backdrop rq-scene rq-scene-gym">
      <div className="cm-modal rq-gym">
        <header className="rq-gym-head">
          <span className="rq-gym-ico" aria-hidden>
            <GymIcon size={32} />
          </span>
          <div>
            <h2>Treinamento</h2>
            <p>
              <strong>{TRAINS} melhoramentos</strong> de <strong>+{GYM_GAIN} pontos</strong> cada (
              {TRAINS * GYM_GAIN} no total, teto 100) — distribua entre jogadores e atributos.
              {!done && (
                <>
                  {' '}
                  Restam <strong>{trainsLeft}</strong>.
                </>
              )}
            </p>
          </div>
        </header>

        <div className="rq-gym-body">
          <aside className="rq-gym-players" aria-label="Elenco">
            {squad.map((p) => (
              <button
                key={p.id}
                className={`rq-gym-player ${p.id === playerId ? 'active' : ''}`}
                disabled={done}
                onClick={() => selectPlayer(p)}
              >
                <PlayerAvatar teamId={state.clubId} name={p.name} id={p.id} size={34} />
                <span className="rq-gym-p-id">
                  <strong>{p.name}</strong>
                  <small>
                    #{p.number} · <RoleTag role={p.role} />
                  </small>
                </span>
                <span className="rq-gym-p-ovr" style={{ color: attrColor(p.overall) }}>
                  {p.overall}
                </span>
              </button>
            ))}
          </aside>

          {player && (
            <section className="rq-gym-attrs" aria-label="Atributos">
              {groupsFor(player.role).map((g) => (
                <div key={g.title} className="rq-gym-group">
                  <h4>{g.title}</h4>
                  <div className="rq-gym-chips">
                    {g.keys.map((k) => {
                      const val = player.attrs[k.key]
                      const maxed = val >= 100
                      const ovrGain = ovrIfTrained(player.role, player.attrs, k.key) - player.overall
                      return (
                        <button
                          key={k.key}
                          className={`rq-chip ${attr === k.key ? 'active' : ''}`}
                          disabled={done || maxed}
                          onClick={() => setAttr(k.key)}
                          title={`${k.desc}\n${k.effects.map((e) => `• ${e}`).join('\n')}`}
                        >
                          <span>{k.label}</span>
                          <b style={{ color: attrColor(val) }}>{val}</b>
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
            </section>
          )}
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
          {player && summary && (
            <>
              <div className={`rq-gym-summary ${done ? 'rq-gym-done' : ''}`}>
                {done ? (
                  <span className="rq-gym-done-ico" aria-hidden>
                    ✓
                  </span>
                ) : (
                  <PlayerAvatar teamId={state.clubId} name={player.name} id={player.id} size={28} />
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
              {done ? (
                <button
                  className="cm-btn cm-btn-go cm-btn-lg cm-btn-block"
                  onClick={() => act((s) => leaveNode(s))}
                >
                  Seguir viagem →
                </button>
              ) : (
                <button
                  className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block"
                  onClick={train}
                  disabled={summary.before >= 100}
                >
                  Treinar ({trainsLeft} restante{trainsLeft > 1 ? 's' : ''})
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
