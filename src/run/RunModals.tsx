import { useEffect, useRef } from 'react'
import type { RunState } from '../game/runTypes'
import { START_LIVES } from '../game/run'
import { ASCENSION_MAX } from '../game/ascension'
import { ALL_CLUBS } from '../game/worldcup'
import { defeatSfx, victorySfx } from '../sfx/crowd'
import { useEscapeKey } from '../shared/useEscapeKey'
import { useScrollOverflow } from '../shared/useScrollOverflow'
import { FlameIcon, HeartbreakIcon, RestartIcon } from '../ui/icons'
import { SkullIcon, TrophyIcon } from './MapIcons'
import { STAGE_COUNT } from '../game/runGen'

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="cm-backdrop">{children}</div>
}

/** Painel do modal com semântica de dialog para leitores de tela. */
function ModalPanel({
  className,
  label,
  children,
  panelRef,
}: {
  className: string
  label: string
  children: React.ReactNode
  /** só o `HelpModal` usa — precisa medir o próprio scroll pra faixa de "tem mais". */
  panelRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div className={className} role="dialog" aria-modal="true" aria-label={label} ref={panelRef}>
      {children}
    </div>
  )
}

const lastMatchLine = (state: RunState) =>
  state.lastMatch && (
    <>
      Derrota para o {state.lastMatch.oppName} (
      <span aria-label={`${state.lastMatch.homeGoals} a ${state.lastMatch.awayGoals}`}>
        <span aria-hidden>
          {state.lastMatch.homeGoals}×{state.lastMatch.awayGoals}
        </span>
      </span>
      ) na fase {state.lastMatch.stage}.
    </>
  )

/**
 * Balanço da corrida — MESMAS métricas na vitória e na derrota (uma marcação,
 * dois usos): sem isto o gameover terminava uma jornada de várias fases sem
 * dizer nada do que aconteceu nela.
 *
 * Duas linhas de 2 em vez de uma linha só: `.cm-won-stats` é flex sem quebra,
 * então 4 métricas numa linha só espremiam os rótulos até sobrar palavra órfã.
 */
function RunSummary({ state }: { state: RunState }) {
  const wins = state.nodes.filter((n) => n.cleared && n.opponent).length
  const metrics: [string, string][] = [
    [`${state.stage}/${STAGE_COUNT + 1}`, 'fase'],
    [`${wins}`, wins === 1 ? 'vitória' : 'vitórias'],
    [`${state.squad.length}`, 'no elenco'],
    [`${state.coins}`, 'moedas'],
  ]
  return (
    <>
      {[metrics.slice(0, 2), metrics.slice(2)].map((row) => (
        <div className="cm-won-stats" key={row[0][1]}>
          {row.map(([value, label]) => (
            <span key={label}>
              <b style={{ fontSize: 19 }}>{value}</b>{' '}
              <small style={{ color: 'var(--cm-muted)' }}>{label}</small>
            </span>
          ))}
        </div>
      ))}
    </>
  )
}

/** Tela de VIDA PERDIDA: perdeu uma partida mas ainda tem vida — a corrida continua. */
export function LifeLostModal({ state, onContinue }: { state: RunState; onContinue: () => void }) {
  useEffect(() => { defeatSfx() }, [])
  // sem partida registrada o <p> ficava vazio mas mantinha os 18px de margem
  // de `.cm-modal-sub` — vão morto que mudava o espaçamento do cartão sem motivo.
  const line = lastMatchLine(state)
  return (
    <Backdrop>
      {/* registro COMPACTO (`.cm-modal` puro): perder 1 vida é recuperável e não
          pode pesar mais que o fim da jornada. Com `.cm-modal-over` esta tela
          herdava o card de 560px, o título de 40px e o facho vermelho do backdrop
          (`.cm-backdrop:has(.cm-modal-over)`) — e "VOCÊ PERDEU 1 VIDA" ocupava
          mais tela que "ELIMINADO". O desfecho fica só no gameover/vitória. */}
      <ModalPanel className="cm-modal" label="Você perdeu 1 vida">
        <div className="rq-over-emoji rq-over-red">
          <HeartbreakIcon size={56} />
        </div>
        <h2>VOCÊ PERDEU 1 VIDA</h2>
        {line && <p className="cm-modal-sub">{line}</p>}
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
  const line = lastMatchLine(state)
  return (
    <Backdrop>
      <ModalPanel className="cm-modal cm-modal-over" label="Eliminado">
        {/* mesmo tamanho do troféu da vitória: as duas telas irmãs fecham a
            jornada com o mesmo peso visual. */}
        <div className="rq-over-emoji rq-over-bone">
          <SkullIcon size={78} />
        </div>
        <h2>ELIMINADO</h2>
        {state.ascension > 0 && (
          <span className="rq-asc-chip" title={`Ascension ${state.ascension} — dificuldade aumentada`}>
            <FlameIcon size={13} /> A{state.ascension}
          </span>
        )}
        {line && <p className="cm-modal-sub">{line}</p>}
        <p className="cm-modal-sub">Suas vidas acabaram. Fim de jornada — comece uma corrida nova do zero.</p>
        <RunSummary state={state} />
        {/* MESMA ação = MESMA placa da vitória (`cm-btn-go`). A placa azul aqui era
            a mesma do "Continuar a corrida" do lifelost — duas ações opostas na
            mesma cor — e era o objeto mais saturado da tela, brilhando mais que o
            próprio título. O azul fica exclusivo de "continuar". */}
        <button className="cm-btn cm-btn-go cm-btn-lg cm-btn-block" onClick={onNewRun} autoFocus>
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
  const panelRef = useRef<HTMLDivElement>(null)
  // em telas baixas (ex. 360×640) esse é o modal mais alto do app — o painel
  // inteiro rola (`.cm-modal` já tem overflow-y:auto), mas sem NENHUMA pista
  // visual disso o último tópico e o botão "Entendi" ficavam invisíveis e
  // pareciam cortados/quebrados, não um convite a rolar (mesma classe de bug
  // já corrigida no mercado/academia/poções — mesmo padrão aqui).
  const hasMore = useScrollOverflow(panelRef)
  return (
    <Backdrop>
      <ModalPanel
        className={`cm-modal rq-help-modal${hasMore ? ' has-more' : ''}`}
        label="Como jogar"
        panelRef={panelRef}
      >
        <h2>Como jogar</h2>
        <ul className="rq-help-list">
          <li>
            <b>Mapa:</b> escolha o caminho fase a fase — cada rota mistura partidas, treinamento,
            mercado e bênçãos.
          </li>
          <li>
            <b>Contratar (mercado/recompensa):</b> cada carta já mostra no lugar de quem o reforço
            entra e o antes → depois da nota — <b>um clique na carta fecha a troca</b>. Não gostou
            de nenhum? Recuse e siga em frente.
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
        {/* o chip sai da linha de números e vem pro título, como no GameOverModal:
            na linha de stats ele entrava como 3ª coluna e quebrava o alinhamento. */}
        {state.ascension > 0 && (
          <span className="rq-asc-chip" title={`Ascension ${state.ascension} — dificuldade aumentada`}>
            <FlameIcon size={13} /> A{state.ascension}
          </span>
        )}
        <p className="cm-modal-sub">
          {state.managerName} levou o {club?.name ?? state.clubId} do primeiro quadradinho até o topo do
          mapa — jornada completa!
          {state.ascension === ASCENSION_MAX
            ? ' No nível máximo de Ascension — não foi sorte.'
            : state.ascension > 0
              ? ` Na Ascension ${state.ascension}.`
              : ''}
        </p>
        <RunSummary state={state} />
        {/* a única recompensa meta da corrida só aparecia escondida na Ajuda —
            é aqui que ela vira o gancho pra próxima jornada. */}
        {state.ascension < ASCENSION_MAX && (
          <p className="cm-modal-sub">
            <span className="rq-asc-chip">
              <FlameIcon size={13} /> Ascension {state.ascension + 1} liberada
            </span>
          </p>
        )}
        {/* mesma placa verde de confirmação das outras telas: a placa azul era o
            único elemento frio numa composição 100% ouro. */}
        <button className="cm-btn cm-btn-go cm-btn-lg cm-btn-block" onClick={onNewRun} autoFocus>
          <RestartIcon size={15} className="cm-btn-ico-lead" /> Nova corrida
        </button>
      </ModalPanel>
    </Backdrop>
  )
}
