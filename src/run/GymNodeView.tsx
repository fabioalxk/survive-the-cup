import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { RunState } from '../game/runTypes'
import { GYM_GAIN, boostCategory, distributeGain, leaveNode, moveFormationSlot } from '../game/run'
import { gymTrains } from '../game/ascension'
import { slotOverallOf } from '../game/overall'
import { formationName, roleForSlot } from '../sim/formation'
import { upgradeSfx } from '../sfx/crowd'
import { attrColor, trainCategoriesFor, type TrainCategory } from '../ui/attrDisplay'
import FormationEditor from '../ui/FormationEditor'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import { ClipboardIcon, CloseIcon, HelpIcon } from '../ui/icons'
import { GymIcon } from './MapIcons'
import type { RunApi } from './useRun'

/** Folga entre o balão e o chip do jogador. */
const GAP = 14
/** Folga entre o balão e a borda INTERNA do painel da academia. */
const EDGE = 12
/** Meia-altura aproximada do balão — usada só pra ele não vazar do painel. */
const POP_HALF = 150

/** Registro de um treino concluído (para o histórico do rodapé). */
interface TrainDelta {
  playerName: string
  category: string
  ovrBefore: number
  ovrAfter: number
}

/**
 * Evento de ACADEMIA no mapa: o campinho compartilhado (`FormationEditor`)
 * mostra os 11 do time nas posições reais da partida — dá pra mudar o esquema
 * arrastando ali mesmo. Tocar num jogador abre um POPUP coladinho nele com
 * apenas 3 categorias (Físico / Técnica ou Goleiro / Mental, conforme a
 * posição): um toque na categoria JÁ treina, distribuindo +{GYM_GAIN} pontos de
 * forma equilibrada pelos atributos dela (teto 100). Sem escolher atributo a
 * atributo, sem botão de confirmar. A quantidade de treinos cai com a ascension
 * (`gymTrains`) e o ganho de OVR é sempre o do SLOT que o jogador ocupa.
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
  // o balão é `position: fixed` fora do painel (portal), então precisa das medidas
  // do painel pra nunca sair dele — e das do cabeçalho/rodapé pra não cobri-los.
  const panelRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)

  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [pop, setPop] = useState<CSSProperties | null>(null)
  const [results, setResults] = useState<TrainDelta[]>([])

  const player = selIdx !== null ? state.squad[selIdx] : null
  const trainsLeft = TRAINS - results.length
  const done = trainsLeft <= 0
  const showPop = player !== null && !done

  // categorias visíveis conforme a POSIÇÃO do slot: o goleiro vê "Goleiro" (e não
  // as técnicas de linha); o jogador de linha vê "Técnica" e nunca o atributo de
  // goleiro. Fonte única em attrDisplay.
  const categories = player && selIdx !== null ? trainCategoriesFor(roleForSlot(selIdx, slots[selIdx])) : []

  /** Mede o chip do jogador selecionado e posiciona o popup coladinho nele —
   *  sempre DENTRO do painel: medido contra a janela, no desktop metade do balão
   *  boiava sobre o cenário pintado cru, fora da placa de vidro. */
  useEffect(() => {
    if (!showPop || selIdx === null) return
    const place = () => {
      const panel = panelRef.current
      const head = headRef.current
      const hint = hintRef.current
      const chip = fieldRef.current?.querySelector<HTMLElement>(`[data-slot="${selIdx}"]`)
      if (!panel || !head || !hint || !chip) return
      const p = panel.getBoundingClientRect()
      const r = chip.getBoundingClientRect()
      const w = Math.min(300, p.width - 2 * EDGE) // largura do balão
      const roomRight = p.right - r.right - GAP - EDGE >= w
      const roomLeft = r.left - p.left - GAP - EDGE >= w
      if (roomRight || roomLeft) {
        setPop({
          left: Math.max(
            p.left + EDGE,
            Math.min(p.right - EDGE - w, roomRight ? r.right + GAP : r.left - GAP - w),
          ),
          top: Math.max(p.top + POP_HALF, Math.min(p.bottom - POP_HALF, r.top + r.height / 2)),
        })
        return
      }
      // NENHUM lado cabe (o balão sozinho é quase a largura do painel) — fingir
      // ancoragem lateral aqui só jogava o balão POR CIMA do jogador tocado.
      // Vira cartela entre o cabeçalho e a dica do rodapé, na metade oposta ao
      // chip: o contador de "restantes" e a dica seguem visíveis justo na hora
      // de gastar um treino.
      const ceil = head.getBoundingClientRect().bottom + GAP
      const floor = hint.getBoundingClientRect().top - GAP
      const atTop = r.top + r.height / 2 > (ceil + floor) / 2
      setPop({
        left: p.left + EDGE,
        right: window.innerWidth - p.right + EDGE,
        width: 'auto',
        transform: 'none',
        top: atTop ? ceil : 'auto',
        bottom: atTop ? 'auto' : window.innerHeight - floor,
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [showPop, selIdx, slots])

  /** Ganho de OVR (no slot) se `cat` for treinada agora. */
  const gainOf = (cat: TrainCategory): number =>
    slotOverallOf(selIdx!, slots[selIdx!], distributeGain(player!.attrs, cat.keys)) - player!.overall

  /** Média atual dos atributos da categoria (barrinha de apresentação). */
  const levelOf = (cat: TrainCategory): number =>
    Math.round(cat.keys.reduce((s, k) => s + player!.attrs[k], 0) / cat.keys.length)

  const maxedOf = (cat: TrainCategory): boolean => cat.keys.every((k) => player!.attrs[k] >= 100)

  /** Um toque na categoria já treina — distribui +GYM_GAIN e gasta 1 melhoramento. */
  const train = (cat: TrainCategory) => {
    if (!player || done || maxedOf(cat)) return
    const before = player.overall
    const ovrAfter = slotOverallOf(selIdx!, slots[selIdx!], distributeGain(player.attrs, cat.keys))
    upgradeSfx()
    act((s) => boostCategory(s, player.id, cat.keys))
    setResults((r) => [...r, { playerName: player.name, category: cat.label, ovrBefore: before, ovrAfter }])
  }

  const last = results[results.length - 1] ?? null

  // Treino esgotado: não há mais nenhuma ação a tomar aqui, então some com a tela
  // cheia e mostra um cartão enxuto com UMA única ação óbvia — sem outras opções
  // competindo por atenção, fica claro onde clicar.
  if (done) {
    return (
      <div className="cm-backdrop rq-scene rq-scene-gym">
        <div className="cm-modal rq-gym-finish">
          <span className="rq-gym-finish-ico" aria-hidden>
            ✓
          </span>
          <h2 className="cm-ribbon cm-ribbon-sm">Treino concluído</h2>
          <p>Todos os melhoramentos foram usados no seu time.</p>
          <button
            className="cm-btn cm-btn-go cm-btn-lg cm-btn-block"
            onClick={() => act((s) => leaveNode(s))}
          >
            Seguir viagem →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-backdrop rq-scene rq-scene-gym">
      <div className={`cm-modal rq-gym ${player ? 'has-sel' : ''}`} ref={panelRef}>
        <header className="rq-gym-head" ref={headRef}>
          <span className="rq-gym-ico" aria-hidden>
            <GymIcon size={32} />
          </span>
          <div className="rq-gym-title">
            <h2 className="cm-ribbon cm-ribbon-sm">Treinamento</h2>
            <p>
              Cada treino melhora um jogador em <strong>+{GYM_GAIN} pontos</strong> (teto 100).
            </p>
          </div>
          <div className="rq-gym-count" title={`${TRAINS} melhoramentos neste treinamento`}>
            <strong key={trainsLeft}>{trainsLeft}</strong>
            <span>{trainsLeft === 1 ? 'restante' : 'restantes'}</span>
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
          <div className="rq-gym-field" aria-label="Tática e time" ref={fieldRef}>
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
              onMove={(index, pos) => act((s) => moveFormationSlot(s, index, pos))}
              onSelect={setSelIdx}
            />
            <p className="rq-gym-hint" ref={hintRef}>
              Toque num jogador do campinho pra treinar.
            </p>
          </div>
        </div>
      </div>

      {showPop &&
        player &&
        pop &&
        createPortal(
          <div
            key={selIdx}
            className="rq-train-pop"
            style={pop}
            role="dialog"
            aria-label={`Treinar ${player.name}`}
          >
            <button
              className="rq-train-close"
              onClick={() => setSelIdx(null)}
              title="Fechar"
              aria-label="Fechar"
            >
              <CloseIcon size={14} />
            </button>
            <div className="rq-train-head">
              <PlayerAvatar teamId={state.clubId} name={player.name} id={player.id} size={34} />
              <div className="rq-train-head-id">
                <strong>{player.name}</strong>
                <span>Escolha o que melhorar</span>
              </div>
              <span className="rq-train-head-ovr">
                <b style={{ color: attrColor(player.overall) }}>{player.overall}</b>
                <small>nota</small>
              </span>
            </div>
            <div className="rq-train-cats">
              {categories.map((cat) => {
                const maxed = maxedOf(cat)
                const gain = maxed ? 0 : gainOf(cat)
                const level = levelOf(cat)
                return (
                  <button
                    key={cat.id}
                    className="rq-train-cat"
                    disabled={maxed}
                    onClick={() => train(cat)}
                    title={cat.hint}
                  >
                    <span className="rq-train-cat-ico" aria-hidden>
                      {cat.icon}
                    </span>
                    <span className="rq-train-cat-main">
                      <b>{cat.label}</b>
                      <small>{cat.hint}</small>
                      <span className="rq-train-cat-bar" aria-hidden>
                        <span style={{ width: `${level}%`, background: attrColor(level) }} />
                      </span>
                    </span>
                    {/* o verde de "+N nota" fica reservado a GANHO REAL: a pílula
                        "treinar" era pintada igual e significava +0 de nota (no
                        goleiro, 2 das 3 opções) — o jogador queimava 1 dos poucos
                        melhoramentos achando que subia. Ganho zero usa a mesma
                        pílula neutra do "no máximo": os dois dizem a mesma coisa. */}
                    {maxed || gain <= 0 ? (
                      <span className="rq-train-cat-max">{maxed ? 'no máximo' : 'sem ganho de nota'}</span>
                    ) : (
                      <span className="rq-train-cat-gain">+{gain} nota</span>
                    )}
                  </button>
                )
              })}
            </div>
            {last && last.playerName === player.name && (
              <p className="rq-train-last" role="status" key={results.length}>
                Último: <b>{last.category}</b> · nota {last.ovrBefore}
                <span className="rq-gym-arrow">→</span>
                {last.ovrAfter}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
