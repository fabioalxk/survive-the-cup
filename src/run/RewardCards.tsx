import { useEffect } from 'react'
import type { RunState } from '../game/runTypes'
import { POTION_BOOST, POTION_INFO, claimPotion, pickReward } from '../game/run'
import { potionSfx, wonRewardSfx } from '../sfx/crowd'
import { AttrList, ROLE_LABEL, attrColor, attrLabel } from '../ui/attrDisplay'
import { GiftIcon, PotionIcon } from '../ui/icons'
import { PlayerAvatar } from '../ui/PlayerAvatar'
import type { GenPlayer } from '../game/types'
import type { RunApi } from './useRun'

function RewardCard({ p, onPick }: { p: GenPlayer; onPick: () => void }) {
  return (
    <button className={`rc-card cm-role-${p.role.toLowerCase()}`} onClick={onPick}>
      <div className="rc-card-portrait">
        <img className="rc-card-spot" src="/assets/icons/card_spotlight.webp" alt="" aria-hidden="true" />
        <span className="rc-card-role">{ROLE_LABEL[p.role]}</span>
        <span className="rc-card-ovr" style={{ color: attrColor(p.overall) }}>
          {p.overall}
        </span>
        <PlayerAvatar teamId={undefined} name={p.name} id={p.id} size={168} className="rc-card-face" />
      </div>
      <div className="rc-card-body">
        <div className="rc-card-name">{p.name}</div>
        <div className="rc-card-age">{p.age} anos</div>
        <AttrList role={p.role} attrs={p.attrs} />
        <span className="cm-btn cm-btn-primary cm-btn-block rc-pick-btn">Escolher</span>
      </div>
    </button>
  )
}

/** Pop-up de recompensa após vencer: 3 cartas caóticas, escolhe 1 pro banco. */
export default function RewardCards({ state, act }: { state: RunState; act: RunApi['act'] }) {
  useEffect(() => {
    if (state.pendingReward) wonRewardSfx()
  }, [state.pendingReward])

  if (!state.pendingReward) return null
  return (
    <div className="cm-backdrop rq-scene rq-scene-reward">
      <div className="rc-scene">
        <div className="rc-banner">
          <GiftIcon size={22} className="rq-h2-ico" /> Reforço conquistado!
        </div>
        <p className="rc-sub">Escolha 1 dos 3 jogadores — ele entra no seu banco de reservas.</p>
        {state.pendingPotion && (
          <button
            className={`rq-potion-earned rq-potion-${state.pendingPotion}`}
            onClick={() => {
              potionSfx()
              act(claimPotion)
            }}
            title="Clique para guardar a poção no cabeçalho"
          >
            <PotionIcon kind={state.pendingPotion} size={30} className="rq-potion-earned-ico" />
            <span className="rq-potion-earned-txt">
              <strong>{POTION_INFO[state.pendingPotion].label}</strong>
              <small>
                +{POTION_BOOST} de {attrLabel(state.pendingPotion)} num titular, por 1 partida
              </small>
            </span>
            <span className="rq-potion-grab">Pegar</span>
          </button>
        )}
        <div className="rc-grid">
          {state.pendingReward.map((p, i) => (
            <RewardCard key={p.id} p={p} onPick={() => act((s) => pickReward(s, i))} />
          ))}
        </div>
      </div>
    </div>
  )
}
