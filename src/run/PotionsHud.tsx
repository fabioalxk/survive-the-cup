import { useRef, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { POTION_ATTR_CAP, POTION_BOOST, POTION_INFO, usePotion } from '../game/run'
import { slotOverallOf } from '../game/overall'
import { potionSfx } from '../sfx/crowd'
import { useEscapeKey } from '../shared/useEscapeKey'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import { attrColor, attrLabel } from '../ui/attrDisplay'
import { PotionIcon } from '../ui/icons'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import type { RunApi } from './useRun'

/** Valor bufado pode passar de 100 — ganha destaque visual próprio. */
const deltaColor = (v: number): string => (v > 100 ? 'var(--cm-green-super)' : attrColor(v))

/**
 * Inventário de poções da run (cabeçalho no mapa, barra de controles na partida):
 * cada frasco é um botão (pulsa quando usável — no mapa, no vestiário ou no meio
 * do jogo) que abre um pop-up para escolher quem vai tomá-la — com o antes →
 * depois do atributo e o ganho real de OVR (no slot atual) por jogador.
 * Enquanto o efeito dura (até o fim da próxima partida), um chip na cor da poção
 * mostra quem está bufado e o valor turbinado.
 */
export default function PotionsHud({
  state,
  act,
  onOpenPicker,
  onClosePicker,
}: {
  state: RunState
  act: RunApi['act']
  onOpenPicker?: () => void
  onClosePicker?: () => void
}) {
  const [picking, setPicking] = useState<number | null>(null)
  const playersRef = useRef<HTMLDivElement>(null)
  const hasMore = useScrollOverflow(playersRef)
  const kind = picking !== null ? state.potions[picking] : undefined
  const inMatch = state.status === 'match'
  const usable = state.status === 'map' || state.status === 'prematch' || inMatch
  const horizon = inMatch ? 'desta partida' : 'da próxima partida'
  const closePicker = () => {
    setPicking(null)
    onClosePicker?.()
  }
  useEscapeKey(closePicker, picking !== null)

  return (
    <>
      {state.activePotions.map((a, i) => {
        const p = state.squad.find((pl) => pl.id === a.playerId)
        if (!p) return null
        return (
          <span
            key={`buff-${i}`}
            className={`rq-potion-buff rq-potion-${a.attr}`}
            title={`${p.name} está com +${a.amount} de ${attrLabel(a.attr)} até o fim da próxima partida`}
          >
            <PotionIcon kind={a.attr} size={15} />
            {p.name.split(' ')[0]} {p.attrs[a.attr]}
          </span>
        )
      })}
      {state.potions.map((k, i) => (
        <button
          key={`potion-${i}`}
          className={`rq-potion-chip rq-potion-${k}`}
          disabled={!usable}
          onClick={() => {
            setPicking(i)
            onOpenPicker?.()
          }}
          aria-label={`Usar ${POTION_INFO[k].label}`}
          title={`${POTION_INFO[k].label}: +${POTION_BOOST} de ${attrLabel(k)} num jogador (pode passar de 100, teto ${POTION_ATTR_CAP}) até o fim ${horizon}${usable ? '' : ' — disponível no mapa ou durante a partida'}`}
        >
          <PotionIcon kind={k} size={21} />
        </button>
      ))}

      {picking !== null && kind && (
        <div className="cm-backdrop" onClick={closePicker}>
          <div
            className={`cm-modal rq-potion-modal rq-potion-${kind}`}
            role="dialog"
            aria-modal="true"
            aria-label={POTION_INFO[kind].label}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="rq-potion-head">
              <span className="rq-potion-head-ico" aria-hidden>
                <PotionIcon kind={kind} size={32} />
              </span>
              <div>
                <h2>{POTION_INFO[kind].label}</h2>
                <p>
                  <strong>+{POTION_BOOST}</strong> de <strong>{attrLabel(kind)}</strong> para 1
                  jogador, valendo até o fim <strong>{horizon}</strong> — pode passar de 100
                  (teto {POTION_ATTR_CAP}).
                </p>
              </div>
            </header>

            <div
              className={`rq-potion-players${hasMore ? ' has-more' : ''}`}
              aria-label="Escolha quem toma a poção"
              ref={playersRef}
            >
              {state.squad
                .map((p, slot) => ({ p, slot }))
                .sort((a, b) => b.p.overall - a.p.overall)
                .map(({ p, slot }) => {
                  const before = p.attrs[kind]
                  const after = Math.min(POTION_ATTR_CAP, before + POTION_BOOST)
                  const maxed = after <= before
                  const gain = maxed
                    ? 0
                    : slotOverallOf(slot, state.formationSlots[slot], { ...p.attrs, [kind]: after }) -
                      p.overall
                  return (
                    <button
                      key={p.id}
                      className="rq-potion-player"
                      disabled={maxed}
                      onClick={() => {
                        potionSfx()
                        act((s) => usePotion(s, picking, p.id))
                        closePicker()
                      }}
                    >
                      <PlayerAvatar teamId={state.clubId} name={p.name} id={p.id} size={34} />
                      <span className="rq-potion-p-id">
                        <strong>{p.name}</strong>
                        <small>
                          #{p.number} · OVR {p.overall}
                        </small>
                      </span>
                      {maxed ? (
                        <span className="rq-chip-max">MAX</span>
                      ) : (
                        <span className="rq-potion-delta">
                          <b style={{ color: deltaColor(before) }}>{before}</b>
                          <span className="rq-gym-arrow">→</span>
                          <b
                            className={after > 100 ? 'rq-potion-super' : ''}
                            style={{ color: deltaColor(after) }}
                          >
                            {after}
                          </b>
                          {gain > 0 && <span className="rq-gym-ovr-badge">+{gain} OVR</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>

            <footer className="rq-potion-foot">
              {/* sem autoFocus: o modal (`.cm-modal`) rola por dentro, e focar de
                  cara o botão do rodapé, com a lista de jogadores ainda mais alta
                  que a tela, rolava o painel pro fim escondendo o cabeçalho (nome
                  e efeito da poção) sem dar pra ver de novo sem rolar na mão. */}
              <button className="cm-btn cm-btn-ghost cm-btn-block" onClick={closePicker}>
                Guardar para depois
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
