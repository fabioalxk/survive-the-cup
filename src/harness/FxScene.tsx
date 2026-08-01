import { useEffect, useRef } from 'react'
import { createMatch } from '../sim/engine'
import { FIELD, GOAL } from '../sim/constants'
import type { MatchState } from '../sim/types'
import { canvasSize, createMatchRenderer, releaseMatchRenderer, setShowNames } from '../render/renderer'

/**
 * Bancada de EFEITOS (só dev/QA). Aciona o renderer 3D direto, com um estado de
 * partida fabricado, para conseguir olhar situações que numa partida de verdade
 * só aparecem por acaso: comemoração de gol, bola no ar, jogador caído.
 *
 *   /harness.html?scene=fx                comemoração de gol (padrão)
 *   /harness.html?scene=fx&t=0.15         instante da comemoração (s)
 *   /harness.html?scene=fx&fx=air         bola alta com sombra no chão
 *   /harness.html?scene=fx&fx=down        jogadores caídos / cartão
 *   /harness.html?scene=fx&freeze=0       deixa o tempo correr
 */
const SCALE = 12

/** Aplica ao estado a situação pedida — tudo determinístico, sem simular. */
const stage = (m: MatchState, kind: string, t: number): void => {
  if (kind === 'air') {
    m.ball.pos = { x: FIELD.cx - 14, y: FIELD.cy - 9 }
    m.ball.prevPos = { x: FIELD.cx - 17, y: FIELD.cy - 10 }
    m.ball.z = 6.5
    m.ball.prevZ = 6.1
    return
  }
  if (kind === 'down') {
    m.players[3].downAmt = 1
    m.players[4].downAmt = 0.6
    m.players[5].yellow = true
    m.players[6].ctrlAmt = 1
    return
  }
  // gol: bola no fundo da rede + comemoração do mandante
  m.ball.pos = { x: -GOAL.depth * 0.6, y: FIELD.cy + 1.2 }
  m.ball.prevPos = { ...m.ball.pos }
  m.score.away = 1
  m.celebration = {
    team: 'away',
    t,
    goalX: 0,
    golaco: true,
    scorerName: 'Messi',
    scorerNumber: 10,
    assistName: null,
    context: null,
    milestone: null,
  } as MatchState['celebration']
}

export default function FxScene({ query }: { query: URLSearchParams }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const size = canvasSize(SCALE)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    setShowNames(true)
    const m = createMatch()
    const kind = query.get('fx') ?? 'goal'
    const t0 = Number(query.get('t') ?? 0.35)
    const freeze = query.get('freeze') !== '0'

    const aspect = canvas.width / canvas.height
    let lastW = 0
    let view: Awaited<ReturnType<typeof createMatchRenderer>> | null = null
    let dropped = false
    let raf = 0
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w <= 0 || w === lastW) return
      lastW = w
      view?.resize(w, w / aspect)
    })

    const start = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      stage(m, kind, freeze ? t0 : t0 + (now - start) / 1000)
      view?.render(m, 1)
    }
    void createMatchRenderer(canvas).then((v) => {
      if (dropped) return v.dispose()
      view = v
      ro.observe(canvas)
      raf = requestAnimationFrame(frame)
    })

    return () => {
      dropped = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (view) {
        releaseMatchRenderer(view)
        view.dispose()
      }
      setShowNames(false)
    }
  }, [query])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
      <canvas
        ref={ref}
        width={size.width}
        height={size.height}
        style={{ width: '100%', height: 'auto', maxHeight: '100%' }}
      />
    </div>
  )
}
