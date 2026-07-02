import { useEffect } from 'react'
import type { CareerState } from '../game/types'
import { fmtMoney, signPlayer, SQUAD_MAX } from '../game/career'
import { startMerchantMusic, stopMerchantMusic } from '../sfx/crowd'
import { MarketPlayerCard } from '../ui/MarketPlayerCard'
import type { CareerApi } from './useCareer'

/**
 * Mercado de transferências: jogadores disponíveis para contratar. Disponível
 * tanto na janela (entre temporadas) quanto durante a temporada.
 */
export default function MarketView({ state, act }: { state: CareerState; act: CareerApi['act'] }) {
  useEffect(() => {
    startMerchantMusic()
    return stopMerchantMusic
  }, [])

  const club = state.clubs[state.clubId]
  const full = club.squad.length >= SQUAD_MAX
  const market = [...state.market].sort((a, b) => b.overall - a.overall)

  return (
    <div className="cm-market">
      <div className="cm-market-bar">
        <span>
          Verba: <strong>{fmtMoney(state.money)}</strong>
        </span>
        <span>
          Elenco: {club.squad.length}/{SQUAD_MAX}
        </span>
      </div>
      {market.length === 0 && <p className="cm-empty">Nenhum jogador disponível no momento.</p>}
      <ul className="mk-grid">
        {market.map((m) => (
          <MarketPlayerCard
            key={m.id}
            player={m}
            price={fmtMoney(m.fee)}
            action={{
              label: 'Contratar',
              disabled: state.money < m.fee || full,
              title: full
                ? `Elenco cheio (máximo ${SQUAD_MAX} jogadores)`
                : state.money < m.fee
                  ? 'Verba insuficiente'
                  : undefined,
              onClick: () => act((s) => signPlayer(s, m.id)),
            }}
          />
        ))}
      </ul>
    </div>
  )
}
