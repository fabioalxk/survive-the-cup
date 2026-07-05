import { useEffect, useRef } from 'react'
import type { RunNode, RunState } from '../game/runTypes'
import { enterNode } from '../game/run'
import { MAP_WIDTH, STAGE_COUNT } from '../game/runGen'
import { ALL_CLUBS } from '../game/worldcup'
import { ClubBadge } from '../ui/ClubBadge'
import { LockIcon } from '../ui/icons'
import { CrownIcon, FlagIcon, GymIcon, MarketIcon, TrophyIcon } from './MapIcons'
import type { MapIconProps } from './MapIcons'
import type { RunApi } from './useRun'

/** Deslocamento lateral pseudo-aleatório (determinístico pelo id) — evita grade perfeita. */
const jitter = (id: string): number => {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return ((h % 500) / 100) - 2.5 // ±2.5%
}

/**
 * Espaçamento vertical (%) entre linhas consecutivas — início, cada fase e o
 * chefão ficam TODOS igualmente distantes (a largada não fica mais colada na
 * fase 1). Há STAGE_COUNT+1 vãos entre as STAGE_COUNT+2 linhas.
 */
const ROW_GAP = 90 / (STAGE_COUNT + 1)

/** Ponto de partida do mapa (embaixo, no centro) — de onde saem os 3 caminhos. */
const START_X = 50
const START_Y = 96

/**
 * Altura total do mapa (em px). É bem maior que a área visível de propósito: dá
 * MUITO espaço vertical entre as fases e o container rola na vertical. ~150px por
 * "linha" (início + fases + chefão) deixa os eventos folgados e legíveis.
 */
const MAP_HEIGHT = (STAGE_COUNT + 2) * 150

const isBossStage = (stage: number): boolean => stage > STAGE_COUNT

/**
 * Fase → % de cima. Linhas igualmente espaçadas do início (embaixo, "linha 0")
 * ao chefão (topo): início=96%, fase 1 logo acima, e assim por diante. O mesmo
 * vão de `ROW_GAP` separa a largada da fase 1 e as fases entre si.
 */
const yOf = (stage: number): number => START_Y - stage * ROW_GAP

/**
 * Coluna → % da largura (as fases ocupam de ~20% a ~80%; o chefão fica centralizado).
 * As 3 rotas iniciais sempre tocam as colunas extremas de propósito (ver `spread` em
 * buildGraph, runGen.ts) — a faixa ocupada é sempre a mesma, então o jeito de não
 * colar nas bordas é dar mais respiro aqui, e não tentar "encolher" por render.
 */
const LANE_MIN_X = 20
const LANE_MAX_X = 80
const xOf = (node: RunNode): number => {
  if (isBossStage(node.stage)) return 50
  const frac = MAP_WIDTH > 1 ? node.lane / (MAP_WIDTH - 1) : 0.5
  return LANE_MIN_X + frac * (LANE_MAX_X - LANE_MIN_X) + jitter(node.id)
}

/** Emblema SVG de cada tipo de nó de evento (desenhados em MapIcons.tsx). */
const KIND_ART: Record<string, (p: MapIconProps) => JSX.Element> = {
  market: MarketIcon,
  gym: GymIcon,
  boss: TrophyIcon,
}
const KIND_LABEL: Record<string, string> = {
  match: 'Partida',
  market: 'Mercado',
  gym: 'Treinamento',
  boss: 'CHEFÃO',
}

type NodeStatus = 'cleared' | 'available' | 'locked'

function NodeButton({
  node,
  status,
  far,
  onClick,
}: {
  node: RunNode
  status: NodeStatus
  /** fog of war: fase distante (mais de 1 à frente) fica esmaecida — o chefão nunca. */
  far: boolean
  onClick: () => void
}) {
  const x = xOf(node)
  const y = yOf(node.stage)
  const isBoss = node.kind === 'boss'
  const club = node.opponent ? ALL_CLUBS[node.opponent.clubId] : undefined
  // rótulo sob o nó: nome da seleção nas partidas (o chefão ganha o troféu no
  // JSX); "Mercado"/"Treinamento" nos nós de evento — igual em todos os tipos.
  const cap = isBoss ? (club?.name ?? 'CHEFÃO') : club ? club.name : KIND_LABEL[node.kind]
  const Art = KIND_ART[node.kind]
  return (
    <button
      className={`rq-node rq-node-${node.kind} rq-node-${status}${far ? ' rq-node-far' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      disabled={status !== 'available'}
      title={`${KIND_LABEL[node.kind]}${club ? ' · ' + club.name : ''}`}
    >
      {club ? (
        <>
          {isBoss && (
            <span className="rq-node-crown" aria-hidden>
              <CrownIcon size={28} />
            </span>
          )}
          <span className="rq-node-ring" aria-hidden />
          <span className="rq-node-badge">
            <ClubBadge club={club} size={isBoss ? 42 : 32} />
          </span>
        </>
      ) : (
        <>
          <span className="rq-node-halo" aria-hidden />
          <span className="rq-node-orbit" aria-hidden />
          <span className="rq-node-art">
            <Art size={isBoss ? 54 : 48} />
          </span>
          <span className="rq-node-ground" aria-hidden />
        </>
      )}
      {status === 'cleared' && <span className="rq-node-check">✓</span>}
      {status === 'locked' && (
        <span className="rq-node-lock" aria-hidden>
          <LockIcon size={11} />
        </span>
      )}
      <span
        className={`rq-node-cap${isBoss ? ' rq-node-cap-boss' : ''}${!isBoss ? ` rq-node-cap-band-${node.lane % 3}` : ''}`}
      >
        {isBoss && <TrophyIcon size={11} className="rq-cap-ico" />}
        {cap}
      </span>
    </button>
  )
}

/**
 * O mapa da corrida: fundo do estádio com os nós da jornada ligados por trilhas
 * curvas pontilhadas, subindo da fase 1 (embaixo) até o chefão (em cima). Não é
 * uma grade cheia — são ~3 rotas que se ramificam e se cruzam, no espírito do
 * Slay the Spire adaptado ao futebol.
 */
export default function MapView({ state, act }: { state: RunState; act: RunApi['act'] }) {
  const statusOf = (n: RunNode): NodeStatus =>
    n.cleared ? 'cleared' : state.availableNodeIds.includes(n.id) ? 'available' : 'locked'

  const atStart = state.stage === 0
  const firstNodes = state.nodes.filter((n) => n.stage === 1)
  // "você está aqui": nó recém-concluído (o topo da trilha percorrida) — ou o
  // próprio início, enquanto o jogador ainda não deu o primeiro passo.
  const currentNode = atStart ? undefined : state.nodes.find((n) => n.cleared && n.stage === state.stage)
  const hereX = currentNode ? xOf(currentNode) : START_X
  const hereY = currentNode ? yOf(currentNode.stage) : START_Y

  // rola o mapa (vertical) para centralizar os nós disponíveis agora — na largada
  // fica no início (embaixo) e vai subindo junto com o jogador a cada escolha.
  const scrollRef = useRef<HTMLDivElement>(null)
  const availKey = state.availableNodeIds.join(',')
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const avail = state.nodes.filter((n) => state.availableNodeIds.includes(n.id))
    const ys = avail.length ? avail.map((n) => yOf(n.stage)) : [START_Y]
    const centerPct = ys.reduce((a, b) => a + b, 0) / ys.length
    const target = (centerPct / 100) * el.scrollHeight - el.clientHeight / 2
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availKey])

  return (
    <div className="rq-map-wrap">
      <div className="rq-map-scroll" ref={scrollRef}>
        <div className="rq-map" style={{ height: MAP_HEIGHT }}>
          <img className="rq-map-bg" src="/assets/bg/bg_map.webp" alt="" />
        <div className="rq-map-veil" aria-hidden />

        <svg className="rq-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* trilhas do ponto inicial até as primeiras rotas (os "3 caminhos") */}
          {firstNodes.map((f) => {
            const x2 = xOf(f)
            const y2 = yOf(f.stage)
            const my = (START_Y + y2) / 2
            return (
              <path
                key={`start-${f.id}`}
                className="rq-line"
                d={`M ${START_X} ${START_Y} C ${START_X} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                fill="none"
              />
            )
          })}
          {state.nodes.flatMap((n) =>
            n.next.map((toId) => {
              const to = state.nodes.find((t) => t.id === toId)
              if (!to) return null
              const x1 = xOf(n)
              const y1 = yOf(n.stage)
              const x2 = xOf(to)
              const y2 = yOf(to.stage)
              const my = (y1 + y2) / 2
              // trilha já percorrida acende dourada (histórico); as demais ficam
              // pontilhadas neutras — quem indica os próximos passos agora é a
              // seta "você está aqui" e o pulso nos nós disponíveis. Trilhas que
              // levam a fases distantes esmaecem junto com os nós (mesma névoa).
              const far = to.stage > state.stage + 1 && to.kind !== 'boss'
              const cls = `rq-line${n.cleared ? ' rq-line-done' : ''}${far ? ' rq-line-far' : ''}`
              return (
                <path
                  key={`${n.id}-${toId}`}
                  className={cls}
                  d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                  fill="none"
                />
              )
            }),
          )}
        </svg>

        {state.nodes.map((n) => (
          <NodeButton
            key={n.id}
            node={n}
            status={statusOf(n)}
            far={n.kind !== 'boss' && n.stage > state.stage + 1}
            onClick={() => act((s) => enterNode(s, n.id))}
          />
        ))}

        {/* ponto de partida: origem dos 3 caminhos */}
        <div className="rq-start-node" style={{ left: `${START_X}%`, top: `${START_Y}%` }}>
          <span className="rq-start-cap">Início</span>
          <span className="rq-start-badge">
            <FlagIcon size={42} />
          </span>
        </div>

        {/* "você está aqui": seta vermelha apontando pra baixo, sobre a posição atual */}
        <div className="rq-here-arrow" style={{ left: `${hereX}%`, top: `${hereY}%` }} aria-hidden>
          ▼
        </div>
        </div>
      </div>
    </div>
  )
}
