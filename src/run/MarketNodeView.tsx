import { useEffect } from 'react'
import type { RunState } from '../game/runTypes'
import {
  SQUAD_MAX,
  SQUAD_MIN,
  buyPlayer,
  coinValueOf,
  leaveNode,
  sellPlayer,
  shopOffers,
} from '../game/run'
import { buySfx, sellSfx, startMerchantMusic, stopMerchantMusic } from '../sfx/crowd'
import { byRole } from '../ui/attrDisplay'
import { MarketPlayerCard } from '../ui/MarketPlayerCard'
import { CoinIcon } from '../ui/icons'
import { MarketIcon } from './MapIcons'
import type { RunApi } from './useRun'

const CoinPrice = ({ value }: { value: number }) => (
  <>
    <CoinIcon size={16} /> {value}
  </>
)

/** Evento de MERCADO no mapa: só aqui dá pra comprar/vender — nunca fora de um nó. */
export default function MarketNodeView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  useEffect(() => {
    startMerchantMusic()
    return stopMerchantMusic
  }, [])

  // shopOffers é determinístico nos DADOS mas gera ids novos a cada chamada,
  // então quem já foi comprado é reconhecido por nome+idade+posição, não por id.
  const owned = (p: { name: string; age: number; role: string }) =>
    state.squad.some((s) => s.name === p.name && s.age === p.age && s.role === p.role)
  const offers = shopOffers(state)
    .filter((o) => !owned(o.player))
    .sort((a, b) => b.player.overall - a.player.overall)
  const squad = [...state.squad].sort(byRole)
  const full = state.squad.length >= SQUAD_MAX
  const locked = state.squad.length <= SQUAD_MIN

  return (
    <div className="cm-backdrop rq-scene rq-scene-market">
      <div className="cm-modal rq-market">
        <header className="rq-market-head">
          <span className="rq-market-ico">
            <MarketIcon size={30} />
          </span>
          <div>
            <h2 className="cm-ribbon cm-ribbon-sm">Mercador de jogadores</h2>
            <p>Compare os atributos de cada jogador antes de fechar negócio.</p>
          </div>
          <div className="rq-market-wallet">
            <span className="rq-market-coins">
              <CoinIcon size={17} /> {state.coins}
            </span>
            <span className="rq-market-count">
              Elenco {state.squad.length}/{SQUAD_MAX} · mínimo {SQUAD_MIN}
            </span>
          </div>
        </header>

        <div className="rq-market-body">
          <section>
            <h4>Contratar</h4>
            {offers.length === 0 ? (
              <p className="cm-empty">O mercador não tem mais ninguém pra oferecer.</p>
            ) : (
              <ul className="mk-grid">
                {offers.map((o) => (
                  <MarketPlayerCard
                    key={o.player.id}
                    player={o.player}
                    price={<CoinPrice value={o.fee} />}
                    action={{
                      label: 'Contratar',
                      disabled: state.coins < o.fee || full,
                      title: full
                        ? `Elenco cheio (máximo ${SQUAD_MAX} jogadores)`
                        : state.coins < o.fee
                          ? 'Moedas insuficientes'
                          : undefined,
                      onClick: () => {
                        buySfx()
                        act((s) => buyPlayer(s, o))
                      },
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4>Vender do elenco</h4>
            <ul className="mk-grid">
              {squad.map((p) => (
                <MarketPlayerCard
                  key={p.id}
                  player={p}
                  teamId={state.clubId}
                  price={<CoinPrice value={Math.round(coinValueOf(p.overall, p.age) * 0.85)} />}
                  action={{
                    label: 'Vender',
                    danger: true,
                    disabled: locked,
                    title: locked ? `Não pode ficar com menos de ${SQUAD_MIN} jogadores` : undefined,
                    onClick: () => {
                      sellSfx()
                      act((s) => sellPlayer(s, p.id))
                    },
                  }}
                />
              ))}
            </ul>
          </section>
        </div>

        <footer className="rq-market-foot">
          <button className="cm-btn cm-btn-go cm-btn-lg cm-btn-block" onClick={() => act((s) => leaveNode(s))}>
            Seguir viagem →
          </button>
        </footer>
      </div>
    </div>
  )
}
