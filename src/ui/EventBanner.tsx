import { useEffect, useState } from 'react'
import type { Banner, TeamId } from '../sim/types'
import { BANNER } from '../sim/constants'
import { ArtIcon } from './ArtIcon'
import './EventBanner.css'

/** Aparência do time no lance (cor da barra e, se houver, bandeira/escudo). */
export interface BannerTeamStyle {
  shirt: string
  flag?: string
}

/**
 * Transições de FASE (apito inicial, intervalo, 2º tempo, fim): merecem uma faixa
 * CENTRAL grande e mais demorada — o jogador precisa perceber a troca de tempo /
 * de lado. Os demais lances (falta, cartão...) usam a faixa menor no topo.
 */
const PHASE_TYPES: ReadonlySet<Banner['type']> = new Set(['half', 'kickoff', 'fulltime'])

/** Ícone (arte gerada) da faixa conforme o lance — reforça visualmente o evento. */
const bannerIcon = (b: Banner): string => {
  if (b.title === 'VERMELHO') return 'card_red'
  if (b.title === 'AMARELO') return 'card_yellow'
  switch (b.type) {
    case 'penalty':
      return 'target'
    case 'corner':
      return 'corner_flag'
    case 'half':
      return 'stopwatch'
    case 'kickoff':
      return 'ball'
    case 'fulltime':
      return 'finish_flag'
    default:
      return 'whistle' // falta / vantagem / impedimento: apito do árbitro
  }
}

/**
 * FAIXA de anúncio do lance: entra sobre o campo por alguns segundos e some
 * sozinha. Existe para deixar CLARO o que acabou de acontecer — sem ela, o jogo
 * só "parava" sem explicar. Transições de fase saem CENTRAIS e maiores; lances de
 * jogo (falta, pênalti, cartão, escanteio) saem numa faixa menor no topo.
 *
 * `resolveTeam` traduz o time do lance ('home'/'away') na cor/bandeira que ESTE
 * modo usa — seleção (bandeira de país) ou carreira (cor do clube) — mantendo o
 * componente único para as duas telas.
 */
export function EventBanner({
  b,
  resolveTeam,
}: {
  b: Banner | null
  resolveTeam?: (team: TeamId) => BannerTeamStyle | null
}) {
  const [shown, setShown] = useState<Banner | null>(null)
  useEffect(() => {
    if (!b) return
    setShown(b)
    // mesma duração que o motor usa para congelar a jogada (BANNER, fonte única)
    const ms = PHASE_TYPES.has(b.type) ? BANNER.phaseMs : BANNER.eventMs
    // some sozinha; só apaga se ainda for ESTA faixa (outra pode tê-la substituído)
    const t = window.setTimeout(
      () => setShown((cur) => (cur?.id === b.id ? null : cur)),
      ms,
    )
    return () => window.clearTimeout(t)
  }, [b?.id])

  if (!shown) return null
  const info = shown.team && resolveTeam ? resolveTeam(shown.team) : null
  const phase = PHASE_TYPES.has(shown.type)
  const tone =
    shown.title === 'VERMELHO' ? 'red' : shown.title === 'AMARELO' ? 'yellow' : 'plain'
  return (
    <div
      key={shown.id}
      role="status"
      className={`event-banner ${phase ? 'event-banner--center' : ''} ev-${shown.type} ti-${tone}`}
      style={info ? ({ '--accent': info.shirt } as React.CSSProperties) : undefined}
    >
      <span className="eb-icon">
        <ArtIcon name={bannerIcon(shown)} />
      </span>
      <span className="eb-body">
        <span className="eb-title">
          {info?.flag && <img className="eb-flag" src={info.flag} alt="" />}
          {shown.title}
        </span>
        <span className="eb-text">{shown.text}</span>
      </span>
    </div>
  )
}
