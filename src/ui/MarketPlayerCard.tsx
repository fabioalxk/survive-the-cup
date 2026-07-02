import type { ReactNode } from 'react'
import type { GenPlayer } from '../game/types'
import { AttrList, RoleTag, attrColor } from './attrDisplay'
import { PlayerAvatar } from './PlayerAvatar'

export interface MarketCardAction {
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}

/**
 * Card de jogador do mercado (compartilhado entre carreira e roguelike):
 * identidade + geral + TODOS os atributos em barras + preço + botão de ação.
 * Assim dá pra comparar jogadores antes de fechar negócio, sem telas extras.
 */
export function MarketPlayerCard({
  player,
  teamId,
  price,
  action,
}: {
  player: GenPlayer
  teamId?: string
  price: ReactNode
  action: MarketCardAction
}) {
  return (
    <li className="mk-card">
      <div className="mk-head">
        <PlayerAvatar teamId={teamId} name={player.name} id={player.id} size={44} />
        <div className="mk-id">
          <strong>{player.name}</strong>
          <span>
            <RoleTag role={player.role} /> · {player.age} anos
          </span>
        </div>
        <span className="mk-ovr" style={{ color: attrColor(player.overall) }}>
          {player.overall}
          <small>Geral</small>
        </span>
      </div>
      <AttrList role={player.role} attrs={player.attrs} />
      <div className="mk-foot">
        <span className="mk-price">{price}</span>
        <button
          className={`cm-btn cm-btn-sm ${action.danger ? 'cm-btn-danger' : 'cm-btn-primary'}`}
          disabled={action.disabled}
          title={action.title}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      </div>
    </li>
  )
}
