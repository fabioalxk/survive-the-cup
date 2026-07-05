import type { RunState } from '../game/runTypes'
import { BLESSING_INFO, pickBlessing } from '../game/run'
import { ALL_CLUBS } from '../game/worldcup'
import { ClubBadge } from '../ui/ClubBadge'
import { ArtIcon } from '../ui/ArtIcon'
import { chooseSfx } from '../sfx/crowd'
import { HelpIcon } from '../ui/icons'
import type { RunApi } from './useRun'

/** Risco por extenso — o texto visível já é claro pela cor/tom da carta, mas
 *  isso é invisível pra quem usa leitor de tela (só o `<button>` nativo, sem
 *  nada indicando "isso é a opção arriscada"). */
const TONE_LABEL: Record<string, string> = {
  safe: 'segura',
  power: 'de poder',
  cursed: 'amaldiçoada',
}

/** Realça números e palavras gritadas da descrição (estilo Slay the Spire). */
const emphasize = (desc: string) =>
  desc.split(/(\+?\d+|\b[A-ZÇÃÕÁÉÍÓÚ]{2,}\b)/g).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className={/\d/.test(part) ? 'rq-bless-num' : 'rq-bless-shout'}>
        {part}
      </em>
    ) : (
      part
    ),
  )

/** Tela da bênção da largada: 3 ofertas (segura, de poder, amaldiçoada) — leva 1. */
export default function BlessingView({
  state,
  act,
  onHelp,
}: {
  state: RunState
  act: RunApi['act']
  onHelp: () => void
}) {
  if (!state.pendingBlessings) return null
  const club = ALL_CLUBS[state.clubId]
  return (
    <div className="cm-backdrop rq-scene rq-scene-blessing">
      <div className="rq-bless">
        <h2 className="cm-ribbon rq-bless-ribbon">Bênção da largada</h2>
        <div className="rq-bless-bubble">
          {club && <ClubBadge club={club} size={42} />}
          <p>
            Toda jornada começa com uma escolha… leve <strong>UMA</strong> bênção.
          </p>
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico rq-bless-help"
            onClick={onHelp}
            title="Como jogar"
            aria-label="Como jogar"
          >
            <HelpIcon size={15} />
          </button>
        </div>
        <div className="rq-bless-list">
          {state.pendingBlessings.map((kind, i) => {
            const info = BLESSING_INFO[kind]
            return (
              <button
                key={kind}
                className={`rq-bless-card rq-bless-${info.tone}`}
                aria-label={`${info.label} — bênção ${TONE_LABEL[info.tone]}: ${info.desc}`}
                onClick={() => {
                  chooseSfx()
                  act((s) => pickBlessing(s, i))
                }}
              >
                <span className="rq-bless-ico">
                  <ArtIcon name={`bless_${kind}`} />
                </span>
                <strong className="rq-bless-name">{info.label}</strong>
                <span className="rq-bless-desc">{emphasize(info.desc)}</span>
                <span className="rq-bless-take">Escolher</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
