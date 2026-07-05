import { useEffect, useRef, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { buyPlayer, leaveNode, shopOffers } from '../game/run'
import { buySfx, startMerchantMusic, stopMerchantMusic } from '../sfx/crowd'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import { CoinIcon, HelpIcon } from '../ui/icons'
import { MarketIcon } from './MapIcons'
import PlacePlayerBoard, { CandidateCard } from './PlacePlayerBoard'
import type { RunApi } from './useRun'

/**
 * Evento de MERCADO no mapa: só COMPRA — e comprar é encaixar. Toque na carta
 * e depois no botão "melhor lugar" (ou num jogador do campinho) — dá pra
 * arrastar a oferta também, mas não é preciso. O contratado entra naquele
 * slot e quem saiu deixa o time de vez.
 */
export default function MarketNodeView({
  state,
  act,
  onHelp,
}: {
  state: RunState
  act: RunApi['act']
  /** abre "Como jogar" — o cabeçalho do mapa fica atrás do modal, então cada tela de decisão tem seu próprio atalho. */
  onHelp: () => void
}) {
  const [armed, setArmed] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hasMore = useScrollOverflow(bodyRef)
  useEffect(() => {
    startMerchantMusic()
    return stopMerchantMusic
  }, [])

  // shopOffers é determinístico nos DADOS mas gera ids novos a cada chamada,
  // então quem já foi comprado é reconhecido por nome+idade, não por id.
  const owned = (p: { name: string; age: number }) =>
    state.squad.some((s) => s.name === p.name && s.age === p.age)
  const offers = shopOffers(state)
    .filter((o) => !owned(o.player))
    .sort((a, b) => b.fee - a.fee)
  const candidate = armed !== null ? (offers[armed]?.player ?? null) : null

  const place = (offerIndex: number, slotIndex: number) => {
    buySfx()
    act((s) => buyPlayer(s, offers[offerIndex], slotIndex))
    setArmed(null)
  }

  return (
    <div className="cm-backdrop rq-scene rq-scene-market">
      <div className="cm-modal rq-market">
        <header className="rq-market-head">
          <span className="rq-market-ico">
            <MarketIcon size={30} />
          </span>
          <div>
            <h2 className="cm-ribbon cm-ribbon-sm">Mercador de jogadores</h2>
            <p>
              {candidate
                ? `Toque em quem sai — ${candidate.name} entra no lugar dele.`
                : 'Toque numa oferta pra ver onde ela rende mais no seu time.'}
            </p>
          </div>
          <div className="rq-market-wallet">
            <span className="rq-market-coins">
              <CoinIcon size={17} /> {state.coins}
            </span>
            <button
              className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico"
              onClick={onHelp}
              title="Como jogar"
              aria-label="Como jogar"
            >
              <HelpIcon size={15} />
            </button>
          </div>
        </header>

        <div className={`rq-market-body pb-layout${hasMore ? ' has-more' : ''}`} ref={bodyRef}>
          {offers.length === 0 ? (
            <p className="cm-empty">O mercador não tem mais ninguém pra oferecer.</p>
          ) : (
            <div className="rc-grid mk-offers">
              {offers.map((o, i) => (
                <CandidateCard
                  key={o.player.id}
                  p={o.player}
                  armed={armed === i}
                  disabled={state.coins < o.fee}
                  price={
                    <>
                      <CoinIcon size={16} /> {o.fee}
                    </>
                  }
                  onArm={(on) => setArmed(on ? i : null)}
                  onPlace={(slot) => place(i, slot)}
                />
              ))}
            </div>
          )}
          <PlacePlayerBoard
            state={state}
            candidate={candidate}
            onPlace={(slot) => armed !== null && place(armed, slot)}
          />
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
