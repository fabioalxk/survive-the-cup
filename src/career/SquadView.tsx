import { useState } from 'react'
import type { CareerState } from '../game/types'
import { fmtMoney, sellPlayer, SQUAD_MIN } from '../game/career'
import { ROLE_LABEL, attrColor, byRole, AttrGroups } from '../ui/attrDisplay'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import type { CareerApi } from './useCareer'

/** Tela "Meu Time": elenco ordenado por posição + detalhe do jogador + venda. */
export default function SquadView({ state, act }: { state: CareerState; act: CareerApi['act'] }) {
  const club = state.clubs[state.clubId]
  const squad = [...club.squad].sort(byRole)
  const [selId, setSelId] = useState<number | null>(squad[0]?.id ?? null)
  const player = squad.find((p) => p.id === selId) ?? squad[0]

  return (
    <div className="cm-squad">
      <div className="cm-squad-list">
        <div className="cm-squad-head">
          <span>Elenco — {club.squad.length} jogadores</span>
        </div>
        <ul>
          {squad.map((p) => (
            <li key={p.id}>
              <button
                className={`cm-squad-row ${p.id === player?.id ? 'active' : ''}`}
                onClick={() => setSelId(p.id)}
              >
                <span className="cm-squad-num">{p.number}</span>
                <PlayerAvatar teamId={club.id} name={p.name} id={p.id} />
                <span className="cm-squad-name">{p.name}</span>
                <span className="cm-squad-role">{ROLE_LABEL[p.role]}</span>
                <span className="cm-squad-age">{p.age}a</span>
                <span className="cm-squad-ovr" style={{ color: attrColor(p.overall) }}>
                  {p.overall}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {player && (
        <div className="cm-squad-detail">
          <div className="cm-squad-detail-head">
            <span className="cm-squad-detail-num">{player.number}</span>
            <PlayerAvatar teamId={club.id} name={player.name} id={player.id} size={48} />
            <div className="cm-squad-detail-id">
              <strong>{player.name}</strong>
              <span>
                {ROLE_LABEL[player.role]} · {player.age} anos · {fmtMoney(player.value)}
              </span>
            </div>
            <span className="cm-squad-detail-ovr" style={{ color: attrColor(player.overall) }}>
              {player.overall}
            </span>
          </div>
          <AttrGroups role={player.role} attrs={player.attrs} />
          <button
            className="cm-btn cm-btn-danger"
            disabled={club.squad.length <= SQUAD_MIN}
            onClick={() => {
              act((s) => sellPlayer(s, player.id))
              setSelId(null)
            }}
          >
            Vender por {fmtMoney(Math.round(player.value * 0.9))}
          </button>
        </div>
      )}
    </div>
  )
}
