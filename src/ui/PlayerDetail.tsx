import type { ComponentProps, ReactNode } from 'react'
import type { GenPlayer } from '../game/types'
import { AttrGroups, RoleTag, attrColor } from './attrDisplay'
import { CloseIcon } from './icons'
import { PlayerAvatar } from './PlayerAvatar'

/** Cabeçalho de identidade do jogador (número, foto, nome, função, OVR). */
export function PlayerDetailHead({
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
  )
}

/**
 * Painel de detalhe de um jogador (cabeçalho de identidade + grupos de
 * atributos) — compartilhado pelas telas de elenco e de tática.
 */
export function PlayerDetail(props: ComponentProps<typeof PlayerDetailHead>) {
  return (
    <div className="rq-simple-detail">
      <PlayerDetailHead {...props} />
      <AttrGroups role={props.player.role} attrs={props.player.attrs} />
    </div>
  )
}

/**
 * PlayerDetail "destacável": no desktop fica no fluxo da tela como sempre; no
 * celular o CSS (`.rq-detail-pop`) o transforma numa cartela fixa no rodapé,
 * com o ✕ para fechar — assim a tela de trás continua cabendo inteira.
 */
export function PlayerDetailPop({
  onClose,
  ...detail
}: { onClose: () => void } & ComponentProps<typeof PlayerDetail>) {
  return (
    <div className="rq-detail-pop">
      <button className="cm-tactics-close rq-detail-close" onClick={onClose} title="Fechar">
        <CloseIcon size={16} />
      </button>
      <PlayerDetail {...detail} />
    </div>
  )
}
