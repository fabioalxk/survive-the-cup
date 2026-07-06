import { useEffect, useMemo, useRef, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { buyPlayer, leaveNode, shopOffers } from '../game/run'
import { buySfx, startMerchantMusic, stopMerchantMusic } from '../sfx/crowd'
import { useMediaQuery } from '../shared/useMediaQuery'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import { CoinIcon, HelpIcon } from '../ui/icons'
import { CandidatePager } from './CandidatePager'
import { MarketIcon } from './MapIcons'
import PlacePlayerBoard, { CandidateCard } from './PlacePlayerBoard'
import type { RunApi } from './useRun'

/**
 * Evento de MERCADO no mapa: só COMPRA — e comprar é encaixar. A própria
 * oferta diz no lugar de quem o jogador entra (o slot que mais eleva a nota)
 * e UM clique fecha a compra. Quem saiu deixa o time de vez.
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
  const [hovered, setHovered] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hasMore = useScrollOverflow(bodyRef)
  // celular estreito: só cabe UMA oferta cheia por vez sem rolar (ver
  // CandidatePager) — desktop continua mostrando a grade toda de uma vez.
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const [page, setPage] = useState(0)
  useEffect(() => {
    startMerchantMusic()
    return stopMerchantMusic
  }, [])

  // shopOffers gera um `id` novo por jogador a cada chamada — sem memoizar,
  // cada render (inclusive só de armar uma carta) recriava as 5 ofertas com
  // ids diferentes, trocando a `key` de cada `CandidateCard` e remontando
  // tudo (perdendo o estado local do arraste no meio do próprio gesto).
  // Preso ao nó atual: refaz só ao entrar num mercado novo de verdade.
  const baseOffers = useMemo(() => shopOffers(state), [state.currentNodeId])
  // quem já foi comprado é reconhecido por nome+idade (não por id, que muda).
  const owned = (p: { name: string; age: number }) =>
    state.squad.some((s) => s.name === p.name && s.age === p.age)
  const offers = baseOffers.filter((o) => !owned(o.player)).sort((a, b) => b.fee - a.fee)
  const candidate = hovered !== null ? (offers[hovered]?.player ?? null) : null
  const shown = isNarrow ? offers.map((_, i) => i).filter((i) => i === page) : offers.map((_, i) => i)

  const place = (offerIndex: number, slotIndex: number) => {
    buySfx()
    act((s) => buyPlayer(s, offers[offerIndex], slotIndex))
    setHovered(null)
  }

  // comprar (ou o mercador renovar as ofertas) encolhe a lista — sem isto a
  // página ativa podia sobrar apontando pra fora do novo tamanho.
  useEffect(() => {
    const max = offers.length - 1
    if (page > max) setPage(Math.max(0, max))
  }, [offers.length, page])

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
              {offers.length === 0
                ? 'Nada por aqui desta vez — siga viagem.'
                : 'Um clique compra — cada oferta já mostra quem sai do time.'}
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

        {isNarrow && offers.length > 0 && (
          <CandidatePager count={offers.length} index={page} onSelect={setPage} />
        )}
        <div className={`rq-market-body pb-layout${hasMore ? ' has-more' : ''}`} ref={bodyRef}>
          {offers.length === 0 ? (
            <p className="cm-empty">O mercador não tem mais ninguém pra oferecer.</p>
          ) : (
            <div className="rc-grid mk-offers">
              {shown.map((i) => {
                const o = offers[i]
                return (
                  <CandidateCard
                    key={o.player.id}
                    p={o.player}
                    state={state}
                    disabled={state.coins < o.fee}
                    price={
                      <>
                        <CoinIcon size={16} /> {o.fee}
                      </>
                    }
                    onHover={(on) => setHovered(on ? i : null)}
                    onPick={(slot) => place(i, slot)}
                  />
                )
              })}
            </div>
          )}
          <PlacePlayerBoard state={state} candidate={candidate} />
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
