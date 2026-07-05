import type { ComponentProps, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { GenPlayer } from '../game/types'
import { AttrGroups, RoleTag, attrColor } from './attrDisplay'
import { CloseIcon } from './icons'
import { PlayerAvatar } from './PlayerAvatar'

/** Cabeçalho de identidade do jogador (número, foto, nome, OVR). */
export function PlayerDetailHead({
  player,
  teamId,
  extra,
  showRole = true,
}: {
  player: GenPlayer
  teamId?: string
  /** complemento da linha de identidade (ex.: "· Titular") */
  extra?: ReactNode
  /** false no modo run: a posição vem do slot, não de um rótulo do jogador */
  showRole?: boolean
}) {
  return (
    <div className="cm-squad-detail-head">
      <span className="cm-squad-detail-num">{player.number}</span>
      <PlayerAvatar teamId={teamId} name={player.name} id={player.id} size={48} />
      <div className="cm-squad-detail-id">
        <strong>{player.name}</strong>
        <span>
          {showRole && (
            <>
              <RoleTag role={player.role} /> ·{' '}
            </>
          )}
          {player.age} anos
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
 * atributos) — compartilhado pelas telas de elenco e de tática. Com
 * `showRole: false` some o rótulo de posição e TODOS os atributos aparecem.
 */
export function PlayerDetail(props: ComponentProps<typeof PlayerDetailHead>) {
  return (
    <div className="rq-simple-detail">
      <PlayerDetailHead {...props} />
      <AttrGroups role={props.showRole === false ? undefined : props.player.role} attrs={props.player.attrs} />
    </div>
  )
}

/**
 * PlayerDetail "destacável": no desktop flutua ao lado da tela (nunca cobre o
 * campinho); no celular o CSS (`.rq-detail-pop`) o transforma numa cartela
 * fixa no rodapé, com o ✕ para fechar. Renderizado num PORTAL direto no body:
 * `position: fixed` só ancora de verdade na janela se não houver um ancestral
 * "containing block" no caminho — e o `.cm-modal` que hospeda isto tem uma
 * animação de entrada (transform) que cria um sem querer, prendendo o painel
 * dentro do card em vez de flutuar ao lado/embaixo da tela de verdade.
 */
export function PlayerDetailPop({
  onClose,
  ...detail
}: { onClose: () => void } & ComponentProps<typeof PlayerDetail>) {
  return createPortal(
    <div className="rq-detail-pop">
      <button
        className="cm-tactics-close rq-detail-close"
        onClick={onClose}
        title="Fechar"
        aria-label="Fechar"
      >
        <CloseIcon size={16} />
      </button>
      <PlayerDetail {...detail} />
    </div>,
    document.body,
  )
}
