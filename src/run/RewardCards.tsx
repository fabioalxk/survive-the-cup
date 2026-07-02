import type { RunState } from '../game/runTypes'
import { POTION_BOOST, POTION_INFO, claimPotion, pickReward } from '../game/run'
import { potionSfx } from '../sfx/crowd'
import { AttrList, ROLE_LABEL, attrColor, attrLabel } from '../ui/attrDisplay'
import { GiftIcon, PotionIcon } from '../ui/icons'
import type { GenPlayer } from '../game/types'
import type { RunApi } from './useRun'

function RewardCard({ p, onPick }: { p: GenPlayer; onPick: () => void }) {
  return (
    <button className="rc-card" onClick={onPick}>
      <div className="rc-card-head">
        <span className={`rc-card-role cm-role-${p.role.toLowerCase()}`}>{ROLE_LABEL[p.role]}</span>
        <span className="rc-card-ovr" style={{ color: attrColor(p.overall) }}>
          {p.overall}
        </span>
      </div>
      <div className="rc-card-name">{p.name}</div>
      <div className="rc-card-age">{p.age} anos</div>
      <AttrList role={p.role} attrs={p.attrs} />
      <span className="cm-btn cm-btn-primary cm-btn-block rc-pick-btn">Escolher</span>
    </button>
  )
}

/** Pop-up de recompensa após vencer: 3 cartas caóticas, escolhe 1 pro banco. */
export default function RewardCards({ state, act }: { state: RunState; act: RunApi['act'] }) {
  if (!state.pendingReward) return null
  return (
    <div className="cm-backdrop">
      <div className="rc-modal">
        <h2>
          <GiftIcon size={26} className="rq-h2-ico" /> Reforço conquistado!
        </h2>
        <p className="cm-modal-sub">Escolha 1 dos 3 jogadores — ele entra no seu banco de reservas.</p>
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
