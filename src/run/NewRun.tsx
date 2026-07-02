import { useState } from 'react'
import { BRAZIL_ID, WC_TEAM_LIST } from '../game/worldcup'
import {
  ASCENSION_MAX,
  gymTrains,
  offerLevelPenalty,
  opponentLevelBonus,
} from '../game/ascension'
import { ClubBadge } from '../ui/ClubBadge'
import { BallIcon, LockIcon, PlayIcon } from '../ui/icons'

const VERSION = 'v0.1.0'

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
  if (gymTrains(a) < gymTrains(0)) parts.push(`academia com só ${gymTrains(a)} melhoramentos`)
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

  const start = () => onStart('Técnico', clubId, ascension)
  const chosen = WC_TEAM_LIST.find((c) => c.id === clubId)!
  // Brasil primeiro (jogável); as demais aparecem bloqueadas — conteúdo futuro.
  const teams = [chosen, ...WC_TEAM_LIST.filter((c) => c.id !== BRAZIL_ID)]

  return (
    <div className="cm-newgame rq-title">
      <img
        className="rq-title-bg"
        src={screen === 'menu' ? '/assets/surviveTheCup.png' : '/assets/surviveTheCup_background.png'}
        alt=""
        aria-hidden
      />
      <div className="rq-title-veil" aria-hidden />

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
        <span className="rq-version">{VERSION}</span>
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
          <button className="rq-menu-item" onClick={() => window.close()}>
            Sair
          </button>
        </nav>
      )}

      {screen === 'setup' && (
        <div className="cm-newgame-card rq-panel">
          <button className="rq-back" onClick={() => setScreen('menu')}>
            ← Voltar
          </button>
          <div className="cm-brand">
            <span className="cm-brand-ball">
              <BallIcon size={46} />
            </span>
            <div className="cm-brand-lockup">
              <span className="cm-brand-kicker">Nova jornada</span>
              <h2 className="cm-title">Monte sua campanha</h2>
            </div>
          </div>

          {hasSave && (
            <button className="cm-btn cm-btn-primary cm-btn-block cm-btn-lg" onClick={onContinue}>
              <PlayIcon size={14} className="cm-btn-ico-lead" /> Continuar corrida
            </button>
          )}

          <div className="cm-step">
            <span>Sua seleção</span>
          </div>
          <div className="cm-club-grid rq-team-grid">
            {teams.map((c) => {
              const locked = c.id !== BRAZIL_ID
              return (
                <button
                  key={c.id}
                  className={`cm-club-card ${clubId === c.id ? 'active' : ''} ${locked ? 'rq-club-locked' : ''}`}
                  disabled={locked}
                  title={locked ? `${c.name} — em breve` : c.name}
                >
                  <ClubBadge club={c} size={40} />
                  <span className="cm-club-card-name">{c.name}</span>
                  {clubId === c.id && <span className="cm-club-check">✓</span>}
                  {locked && (
                    <span className="rq-club-lock" aria-hidden>
                      <LockIcon size={13} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="cm-step">
            <span>Ascension (dificuldade)</span>
          </div>
          <div className="rq-asc-row" role="radiogroup" aria-label="Nível de ascension">
            {Array.from({ length: ASCENSION_MAX + 1 }, (_, a) => (
              <button
                key={a}
                role="radio"
                aria-checked={ascension === a}
                className={`rq-asc-btn ${ascension === a ? 'active' : ''}`}
                style={{ ['--asc-heat' as string]: ascensionHeat(a) }}
                onClick={() => setAscension(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="rq-asc-desc">{ascensionSummary(ascension)}</p>

          <button className="cm-btn cm-btn-go cm-btn-block cm-btn-lg" onClick={start}>
            Começar a jornada — {chosen.name}
            {ascension > 0 ? ` · A${ascension}` : ''} →
          </button>
        </div>
      )}

      {screen === 'help' && (
        <div className="cm-newgame-card rq-panel">
          <button className="rq-back" onClick={() => setScreen('menu')}>
            ← Voltar
          </button>
          <div className="cm-brand-lockup">
            <span className="cm-brand-kicker">Como jogar</span>
            <h2 className="cm-title">A jornada</h2>
          </div>
          <div className="rq-title-tags">
            <span className="rq-title-tag rq-tag-red">Roguelike</span>
            <span className="rq-title-tag rq-tag-blue">Copa do Mundo</span>
            <span className="rq-title-tag rq-tag-gold">Perdeu, acabou</span>
          </div>
          <p className="cm-subtitle">
            Escolha uma seleção da Copa do Mundo e suba o mapa enfrentando um adversário por fase
            até o chefão final. Perdeu uma vez? Eliminado — recomeça do zero. Vença para ser
            campeão.
          </p>
          <ul className="rq-help-list">
            <li>
              <b>Mapa:</b> escolha o caminho fase a fase — cada rota mistura partidas, academia,
              mercado e bênçãos.
            </li>
            <li>
              <b>Partidas:</b> uma derrota encerra a corrida. Não existe replay.
            </li>
            <li>
              <b>Entre os jogos:</b> treine jogadores na academia, contrate reforços no mercado e
              use poções nos momentos decisivos.
            </li>
            <li>
              <b>Ascension:</b> venceu o chefão? Suba a dificuldade até o nível {ASCENSION_MAX} e
              prove que não foi sorte.
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
