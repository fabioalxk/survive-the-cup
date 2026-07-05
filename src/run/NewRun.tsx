import { useEffect, useState } from 'react'
import { BRAZIL_ID, WC_TEAM_LIST } from '../game/worldcup'
import {
  ASCENSION_MAX,
  gymTrains,
  offerLevelPenalty,
  opponentLevelBonus,
} from '../game/ascension'
import { START_LIVES } from '../game/run'
import { isMuted, resumeMainTheme, setMuted, startMainTheme, stopMainTheme } from '../sfx/crowd'
import { handleRadioGroupKeyDown } from '../shared/radioGroupKeyDown'
import { BackButton } from '../ui/BackButton'
import { ClubBadge } from '../ui/ClubBadge'
import { BallIcon, FlameIcon, LockIcon, PlayIcon, SoundIcon } from '../ui/icons'
import { TrophyIcon } from './MapIcons'

const VERSION = 'v0.1.0'

/** Posições/atrasos das poeiras douradas do fundo da tela de seleção — fixos para não
 *  recalcular a cada render (nada de Math.random aqui). */
const SELECT_DUST = Array.from({ length: 16 }, (_, i) => i)

/** Lore curto da seleção escolhida — só o Brasil por enquanto. */
const TEAM_LORE: Record<string, string> = {
  [BRAZIL_ID]:
    'A pentacampeã. Joga o futebol de encher os olhos — favorita em qualquer chave, mas o peso do hexa não perdoa deslizes.',
}

/** Resumo dos apertos do nível escolhido, exibido sob o seletor de ascension. */
/**
 * Cor "de calor" do nível de ascension: neutro no 0, âmbar nos primeiros níveis
 * e afundando no vermelho até o 10 — o gradiente comunica a escalada sem texto.
 */
const ascensionHeat = (a: number): string =>
  a === 0 ? 'rgb(148, 163, 189)' : `hsl(${45 - ((a - 1) / (ASCENSION_MAX - 1)) * 45}, 92%, 66%)`

const ascensionSummary = (a: number): string => {
  if (a === 0) return 'Dificuldade normal — a jornada original, sem apertos.'
  const parts = [
    `adversários +${opponentLevelBonus(a)} de nível`,
    `reforços -${offerLevelPenalty(a)} de nível`,
  ]
  if (gymTrains(a) < gymTrains(0)) parts.push(`treinamento com só ${gymTrains(a)} melhoramentos`)
  return `Ascension ${a}: ${parts.join(', ')}.`
}

type Screen = 'menu' | 'setup' | 'help'

/** Tela inicial do modo roguelike: title screen com menu e painel de nova jornada. */
export default function NewRun({
  onStart,
  hasSave,
  onContinue,
}: {
  onStart: (managerName: string, clubId: string, ascension: number) => void
  hasSave: boolean
  onContinue: () => void
}) {
  // Apenas o Brasil pode ser escolhido por enquanto.
  const clubId = BRAZIL_ID
  const [ascension, setAscension] = useState(0)
  const [screen, setScreen] = useState<Screen>('menu')
  const [muted, setMutedState] = useState(isMuted)

  useEffect(() => {
    startMainTheme()
    return stopMainTheme
  }, [])

  const start = () => onStart('Técnico', clubId, ascension)
  const chosen = WC_TEAM_LIST.find((c) => c.id === clubId)!
  // Brasil primeiro (jogável); as demais aparecem bloqueadas — conteúdo futuro.
  const teams = [chosen, ...WC_TEAM_LIST.filter((c) => c.id !== BRAZIL_ID)]

  return (
    <div className="cm-newgame rq-title" onClick={resumeMainTheme}>
      <img
        className={`rq-title-bg ${screen === 'setup' ? 'rq-title-bg-select' : ''}`}
        src={
          screen === 'menu'
            ? '/assets/surviveTheCup.png'
            : screen === 'setup'
              ? '/assets/surviveTheCupSplash2.png'
              : '/assets/surviveTheCup_background.png'
        }
        alt=""
        aria-hidden
      />
      <div className="rq-title-veil" aria-hidden />
      {/* a arte de fundo da seleção tem o logo do jogo embutido no canto sup.
          esquerdo (ver comentário em .rq-title-bg-select); em telas 16:9 (as
          mais comuns — 1920x1080, 1366x768) o zoom/recorte não empurra esse
          canto pra fora do quadro por completo, deixando vazar um fragmento
          distorcido atrás do chip de perfil. Este véu extra escurece só esse
          canto, na mesma linguagem visual do `.rq-title-veil`. */}
      {screen === 'setup' && <div className="rq-select-corner-veil" aria-hidden />}
      {screen === 'setup' && (
        <div className="rq-select-fx" aria-hidden>
          <span className="rq-select-ray rq-select-ray-a" />
          <span className="rq-select-ray rq-select-ray-b" />
          {SELECT_DUST.map((i) => (
            <span
              key={i}
              className="rq-select-mote"
              style={{
                left: `${(i * 6.7) % 100}%`,
                animationDelay: `${(i * 0.9) % 12}s`,
                animationDuration: `${9 + (i % 5)}s`,
              }}
            />
          ))}
        </div>
      )}

      <header className="rq-title-top">
        <div className="rq-profile">
          <span className="rq-profile-ball">
            <BallIcon size={24} />
          </span>
          <div className="rq-profile-info">
            <b>Técnico</b>
            <small>{hasSave ? 'Corrida em andamento' : 'Nova carreira'}</small>
          </div>
        </div>
        <div className="rq-title-right">
          <button
            className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
            onClick={(e) => {
              e.stopPropagation()
              setMuted(!muted)
              setMutedState(!muted)
            }}
            title={muted ? 'Ativar som' : 'Silenciar'}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            <SoundIcon size={15} muted={muted} />
          </button>
          <span className="rq-version">{VERSION}</span>
        </div>
      </header>

      {screen === 'menu' && (
        <nav className="rq-menu" aria-label="Survive the Cup">
          {hasSave && (
            <button className="rq-menu-item rq-menu-item-hot" onClick={onContinue}>
              Continuar corrida
            </button>
          )}
          <button className="rq-menu-item" onClick={() => setScreen('setup')}>
            Um Jogador
          </button>
          <button className="rq-menu-item" onClick={() => setScreen('help')}>
            Como jogar
          </button>
        </nav>
      )}

      {screen === 'setup' && (
        <div className="rq-select">
          <BackButton onClick={() => setScreen('menu')} />

          {hasSave && (
            <button className="cm-btn cm-btn-primary cm-btn-block cm-btn-lg" onClick={onContinue}>
              <PlayIcon size={14} className="cm-btn-ico-lead" /> Continuar corrida
            </button>
          )}

          <div className="rq-select-hero">
            <span className="rq-select-badge">
              <span className="rq-select-badge-ring" aria-hidden />
              <ClubBadge club={chosen} size={104} />
            </span>
            <div className="rq-select-info">
              <span className="cm-brand-kicker">Sua seleção</span>
              <h1 className="rq-select-name">{chosen.name}</h1>
              <p className="rq-select-desc">{TEAM_LORE[chosen.id]}</p>
              <div className="rq-select-stats">
                <span className="rq-select-stat">
                  <TrophyIcon size={18} /> Força {chosen.strength}
                </span>
                {ascension > 0 && (
                  <span className="rq-asc-chip">
                    <FlameIcon size={13} /> Ascension {ascension}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rq-select-bottom">
            <section className="rq-event-strip">
              <h3 className="rq-event-label">Ascension (dificuldade)</h3>
              <div
                className="rq-asc-row"
                role="radiogroup"
                aria-label="Nível de ascension"
                onKeyDown={handleRadioGroupKeyDown}
              >
                {Array.from({ length: ASCENSION_MAX + 1 }, (_, a) => (
                  <button
                    key={a}
                    role="radio"
                    aria-checked={ascension === a}
                    tabIndex={ascension === a ? 0 : -1}
                    className={`rq-asc-btn ${ascension === a ? 'active' : ''}`}
                    style={{ ['--asc-heat' as string]: ascensionHeat(a) }}
                    onClick={() => setAscension(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <p className="rq-asc-desc">{ascensionSummary(ascension)}</p>
            </section>

            <section className="rq-event-strip">
              <h3 className="rq-event-label">Escolha sua seleção</h3>
              <div
                className="rq-flag-row"
                role="radiogroup"
                aria-label="Escolha sua seleção"
                onKeyDown={handleRadioGroupKeyDown}
              >
                {teams.map((c) => {
                  const locked = c.id !== BRAZIL_ID
                  return (
                    <button
                      key={c.id}
                      role="radio"
                      aria-checked={clubId === c.id}
                      tabIndex={clubId === c.id ? 0 : -1}
                      className={`rq-flag ${clubId === c.id ? 'active' : ''} ${locked ? 'rq-flag-locked' : ''}`}
                      disabled={locked}
                      title={locked ? `${c.name} — em breve` : c.name}
                    >
                      <span className="rq-flag-badge">
                        <ClubBadge club={c} size={44} />
                        {locked && (
                          <span className="rq-flag-lock" aria-hidden>
                            <LockIcon size={12} />
                          </span>
                        )}
                      </span>
                      <span className="rq-flag-name">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <button className="rq-event-go" onClick={start}>
              Começar a jornada — {chosen.name}
              {ascension > 0 ? ` · A${ascension}` : ''} →
            </button>
          </div>
        </div>
      )}

      {screen === 'help' && (
        <div className="rq-event">
          <BackButton onClick={() => setScreen('menu')} />
          <div className="cm-brand-lockup rq-event-brand">
            <span className="cm-brand-kicker">Como jogar</span>
            <h2 className="cm-title">A jornada</h2>
          </div>

          <section className="rq-event-strip">
            <div className="rq-title-tags">
              <span className="rq-title-tag rq-tag-red">Roguelike</span>
              <span className="rq-title-tag rq-tag-blue">Copa do Mundo</span>
              <span className="rq-title-tag rq-tag-gold">{START_LIVES} vidas</span>
            </div>
            <p className="cm-subtitle">
              Escolha uma seleção da Copa do Mundo e suba o mapa enfrentando um adversário por fase
              até o chefão final. Você tem {START_LIVES} vidas: a 2ª derrota elimina e recomeça do
              zero. Vença o chefão para ser campeão.
            </p>
          </section>

          <section className="rq-event-strip">
            <ul className="rq-help-list">
              <li>
                <b>Mapa:</b> escolha o caminho fase a fase — cada rota mistura partidas, treinamento,
                mercado e bênçãos.
              </li>
              <li>
                <b>Vidas:</b> começa com {START_LIVES} (ícones de coração no topo). Perder uma
                partida custa 1 vida e a corrida continua; a última vida perdida elimina de vez.
              </li>
              <li>
                <b>Entre os jogos:</b> melhore atributos no treinamento, contrate reforços no mercado
                e use poções nos momentos decisivos.
              </li>
              <li>
                <b>Ascension:</b> venceu o chefão? Suba a dificuldade até o nível {ASCENSION_MAX} e
                prove que não foi sorte.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
