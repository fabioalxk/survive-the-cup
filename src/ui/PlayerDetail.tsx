import type { ReactNode } from 'react'
import type { GenPlayer } from '../game/types'
import { AttrGroups, RoleTag, attrColor } from './attrDisplay'
import { PlayerAvatar } from './PlayerAvatar'

/**
 * Painel de detalhe de um jogador (cabeçalho de identidade + grupos de
 * atributos) — compartilhado pelas telas de elenco e de tática.
 */
export function PlayerDetail({
  player,
  teamId,
  extra,
}: {
  player: GenPlayer
  teamId?: string
  /** complemento da linha de identidade (ex.: "· Titular") */
  extra?: ReactNode
}) {
  return (
    <div className="rq-simple-detail">
      <div className="cm-squad-detail-head">
        <span className="cm-squad-detail-num">{player.number}</span>
        <PlayerAvatar teamId={teamId} name={player.name} id={player.id} size={48} />
        <div className="cm-squad-detail-id">
          <strong>{player.name}</strong>
          <span>
            <RoleTag role={player.role} /> · {player.age} anos
            {extra}
          </span>
        </div>
        <span className="cm-squad-detail-ovr" style={{ color: attrColor(player.overall) }}>
          {player.overall}
        </span>
      </div>
      <AttrGroups role={player.role} attrs={player.attrs} />
    </div>
  )
}
