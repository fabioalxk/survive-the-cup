import type { CareerState } from '../game/types'
import { acceptOffer, declineOffers, openTransferWindow } from '../game/career'
import { divisionName } from './format'
import type { CareerApi } from './useCareer'
import { ALL_CLUBS } from '../game/clubs'
import { ClubBadge } from '../ui/ClubBadge'
import { ArtIcon } from '../ui/ArtIcon'

/** Resumo exibido ao fim de cada temporada (acesso, queda, título). */
export function SeasonEndModal({ state, act }: { state: CareerState; act: CareerApi['act'] }) {
  const h = state.lastSeason
  if (!h) return null
  const headline = h.champion
    ? (
        <>
          <ArtIcon name="trophy" /> Campeão da {divisionName(h.division)}!
        </>
      )
    : h.promoted
      ? `⬆️ Acesso conquistado!`
      : h.relegated
        ? `⬇️ Rebaixamento`
        : `Temporada encerrada`
  return (
    <Backdrop>
      <div className="cm-modal">
        <h2>{headline}</h2>
        <p className="cm-modal-sub">
          {h.clubName} terminou em <strong>{h.position}º</strong> na {divisionName(h.division)} de{' '}
          {h.year}.
        </p>
        {h.promoted && <p>Próxima temporada na {divisionName(state.pendingDivision)}!</p>}
        {h.relegated && <p>O clube disputará a {divisionName(state.pendingDivision)}.</p>}
        <button
          className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block"
          onClick={() => act((s) => openTransferWindow(s))}
        >
          Ir para a janela de transferências →
        </button>
      </div>
    </Backdrop>
  )
}

/** Ofertas de emprego de clubes maiores. */
export function OffersModal({
  state,
  act,
}: {
  state: CareerState
  act: CareerApi['act']
}) {
  return (
    <Backdrop>
      <div className="cm-modal">
        <h2>
          <ArtIcon name="phone" /> Propostas de emprego
        </h2>
        <p className="cm-modal-sub">
          Seu trabalho chamou atenção. Aceitar significa assumir o novo clube na próxima
          temporada.
        </p>
        <div className="cm-offers">
          {state.offers.map((o) => (
            <div key={o.clubId} className="cm-offer">
              <div className="cm-offer-id">
                {ALL_CLUBS[o.clubId] && <ClubBadge club={ALL_CLUBS[o.clubId]} size={34} />}
                <div>
                  <strong>{o.clubName}</strong>
                  <span>{divisionName(o.division)}</span>
                </div>
              </div>
              <button
                className="cm-btn cm-btn-primary"
                onClick={() => act((s) => acceptOffer(s, o.clubId))}
              >
                Aceitar
              </button>
            </div>
          ))}
        </div>
        <button className="cm-btn cm-btn-block" onClick={() => act((s) => declineOffers(s))}>
          Recusar e seguir no clube atual
        </button>
      </div>
    </Backdrop>
  )
}

/** Tela de vitória: zerou o jogo (campeão da Série A). */
export function WonModal({ state, onNewGame }: { state: CareerState; onNewGame: () => void }) {
  return (
    <Backdrop>
      <div className="cm-modal cm-modal-won">
        <div className="cm-won-trophy">
          <ArtIcon name="trophy" />
        </div>
        <h2>VOCÊ É CAMPEÃO BRASILEIRO!</h2>
        <p className="cm-modal-sub">
          {state.managerName} levou o {state.clubs[state.clubId].name} ao título da Série A.
          Uma carreira lendária — da Série D ao topo do futebol nacional!
        </p>
        <div className="cm-won-stats">
          <span>{state.history.length} temporadas</span>
          <span>{state.trophies.length} títulos</span>
        </div>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onNewGame}>
          Nova carreira
        </button>
      </div>
    </Backdrop>
  )
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="cm-backdrop">{children}</div>
}
