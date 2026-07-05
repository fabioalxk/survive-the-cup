import { useEffect } from 'react'
import type { RunState } from '../game/runTypes'
import { START_LIVES } from '../game/run'
import { ASCENSION_MAX } from '../game/ascension'
import { ALL_CLUBS } from '../game/worldcup'
import { defeatSfx, victorySfx } from '../sfx/crowd'
import { useEscapeKey } from '../shared/useEscapeKey'
import { FlameIcon, HeartbreakIcon, RestartIcon, SkullIcon } from '../ui/icons'
import { TrophyIcon } from './MapIcons'

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="cm-backdrop">{children}</div>
}

/** Painel do modal com semântica de dialog para leitores de tela. */
function ModalPanel({
  className,
  label,
  children,
}: {
  className: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={className} role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>
  )
}

const lastMatchLine = (state: RunState) =>
  state.lastMatch && (
    <>
      Derrota para o {state.lastMatch.oppName} ({state.lastMatch.homeGoals}×{state.lastMatch.awayGoals})
      na fase {state.lastMatch.stage}.
    </>
  )

/** Tela de VIDA PERDIDA: perdeu uma partida mas ainda tem vida — a corrida continua. */
export function LifeLostModal({ state, onContinue }: { state: RunState; onContinue: () => void }) {
  useEffect(() => { defeatSfx() }, [])
  return (
    <Backdrop>
      <ModalPanel className="cm-modal cm-modal-over" label="Você perdeu 1 vida">
        <div className="rq-over-emoji rq-over-red">
          <HeartbreakIcon size={56} />
        </div>
        <h2>VOCÊ PERDEU 1 VIDA</h2>
        <p className="cm-modal-sub">{lastMatchLine(state)}</p>
        <p className="cm-modal-sub">
          {state.lives === 1 ? 'Resta 1 vida' : `Restam ${state.lives} vidas`}: a próxima derrota
          elimina. O confronto continua no mapa — tente a revanche ou reforce o time antes.
        </p>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onContinue} autoFocus>
          Continuar a corrida
        </button>
      </ModalPanel>
    </Backdrop>
  )
}

/** Tela de ELIMINAÇÃO: as vidas acabaram, a corrida acaba — só reinicia do zero. */
export function GameOverModal({ state, onNewRun }: { state: RunState; onNewRun: () => void }) {
  useEffect(() => { defeatSfx() }, [])
  return (
    <Backdrop>
      <ModalPanel className="cm-modal cm-modal-over" label="Eliminado">
        <div className="rq-over-emoji rq-over-bone">
          <SkullIcon size={56} />
        </div>
        <h2>ELIMINADO</h2>
        {state.ascension > 0 && (
          <span className="rq-asc-chip" title={`Ascension ${state.ascension} — dificuldade aumentada`}>
            <FlameIcon size={13} /> A{state.ascension}
          </span>
        )}
        <p className="cm-modal-sub">{lastMatchLine(state)}</p>
        <p className="cm-modal-sub">Suas vidas acabaram. Fim de jornada — comece uma corrida nova do zero.</p>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onNewRun} autoFocus>
          <RestartIcon size={15} className="cm-btn-ico-lead" /> Nova corrida
        </button>
      </ModalPanel>
    </Backdrop>
  )
}

/** Confirmação antes de descartar a corrida atual (botão de reiniciar do cabeçalho). */
export function ConfirmResetModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEscapeKey(onCancel, true)
  return (
    <Backdrop>
      <ModalPanel className="cm-modal cm-modal-confirm" label="Recomeçar do zero?">
        <div className="rq-over-emoji rq-over-red">
          <RestartIcon size={40} />
        </div>
        <h2>Recomeçar do zero?</h2>
        <p className="cm-modal-sub">
          Isso apaga o progresso da corrida atual (elenco, moedas, mapa). Não tem como desfazer.
        </p>
        <div className="cm-modal-actions">
          {/* foco vai pro Cancelar (não pro Recomeçar): opção destrutiva nunca deve ser o
              padrão de quem confirma sem querer com Enter/toque duplo */}
          <button className="cm-btn cm-btn-ghost cm-btn-lg" onClick={onCancel} autoFocus>
            Cancelar
          </button>
          <button className="cm-btn cm-btn-danger cm-btn-lg" onClick={onConfirm}>
            <RestartIcon size={15} className="cm-btn-ico-lead" /> Recomeçar
          </button>
        </div>
      </ModalPanel>
    </Backdrop>
  )
}

/** Regras da jornada, acessível a qualquer momento pelo botão de ajuda do cabeçalho. */
export function HelpModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose, true)
  return (
    <Backdrop>
      <ModalPanel className="cm-modal rq-help-modal" label="Como jogar">
        <h2>Como jogar</h2>
        <ul className="rq-help-list">
          <li>
            <b>Mapa:</b> escolha o caminho fase a fase — cada rota mistura partidas, treinamento,
            mercado e bênçãos.
          </li>
          <li>
            <b>Contratar (mercado/recompensa):</b> toque numa carta pra escolher o reforço, depois
            toque em <b>"★ Encaixar no melhor lugar"</b> — o jogo já sugere quem sai. Prefere
            escolher você mesmo? Toque direto no jogador do campinho que dá o lugar.
          </li>
          <li>
            <b>Substituir posição (vestiário):</b> toque em <b>"Organizar"</b> pra montar a melhor
            escalação num só toque, ou toque em 2 jogadores do campinho pra trocar os dois de lugar.
          </li>
          <li>
            <b>Vidas:</b> você começa com {START_LIVES} (ícones de coração no topo). Perder uma
            partida custa 1 vida e a corrida continua; a última vida perdida elimina de vez.
          </li>
          <li>
            <b>Entre os jogos:</b> melhore atributos no treinamento e use poções nos momentos
            decisivos.
          </li>
          <li>
            <b>Ascension:</b> venceu o chefão? Suba a dificuldade até o nível {ASCENSION_MAX} e
            prove que não foi sorte.
          </li>
        </ul>
        {/* sem autoFocus: essa lista é a mais longa dos modais (4 tópicos) — em
            tela baixa ela passa da altura visível, e focar o botão do rodapé
            de cara rola o painel pro fim, escondendo o título e os primeiros
            tópicos sem dar pra voltar. Esc já fecha; quem usa teclado tabula
            até aqui do mesmo jeito. */}
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onClose}>
          Entendi
        </button>
      </ModalPanel>
    </Backdrop>
  )
}

/** Tela de VITÓRIA: venceu o chefão final. */
export function VictoryModal({ state, onNewRun }: { state: RunState; onNewRun: () => void }) {
  useEffect(() => { victorySfx() }, [])
  const club = ALL_CLUBS[state.clubId]
  return (
    <Backdrop>
      <ModalPanel className="cm-modal cm-modal-won" label="Você venceu o chefão!">
        <div className="cm-won-trophy">
          <TrophyIcon size={78} />
        </div>
        <h2>VOCÊ VENCEU O CHEFÃO!</h2>
        <p className="cm-modal-sub">
          {state.managerName} levou o {club?.name ?? state.clubId} do primeiro quadradinho até o topo do
          mapa — jornada completa!
          {state.ascension === ASCENSION_MAX
            ? ' No nível máximo de Ascension — não foi sorte.'
            : state.ascension > 0
              ? ` Na Ascension ${state.ascension}.`
              : ''}
        </p>
        <div className="cm-won-stats">
          {state.ascension > 0 && (
            <span className="rq-asc-chip" title={`Ascension ${state.ascension} — dificuldade aumentada`}>
              <FlameIcon size={13} /> A{state.ascension}
            </span>
          )}
          <span>{state.squad.length} jogadores no elenco final</span>
          <span>{state.coins} moedas guardadas</span>
        </div>
        <button className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block" onClick={onNewRun} autoFocus>
          <RestartIcon size={15} className="cm-btn-ico-lead" /> Nova corrida
        </button>
      </ModalPanel>
    </Backdrop>
  )
}
