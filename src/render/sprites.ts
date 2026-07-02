/**
 * Sprites de jogador (visto de cima), gerados por IA — ver tools/generate-
 * sprites.mjs (corrida) e tools/generate-action-sprites.mjs (chute, cabeceio,
 * lateral, defesa). Substituem o domo de acrílico do "botão" quando a imagem
 * já carregou; a câmera do jogo é ortogonal de cima, então uma única pose
 * cobre as 360° de direção via rotação do canvas — não existe sprite por
 * direção (exceto a defesa do goleiro, que espelha horizontalmente).
 *
 * O uniforme é pintado em 3 cores-chave bem separadas (camisa/short/meião —
 * ver KIT_KEYS/tools/_spriteStyle.mjs) e recolorido em runtime, cada peça
 * independente, pra qualquer combinação real de clube/seleção.
 */
import type { Vec2 } from '../sim/types'
import type { KitColors } from './renderer'

const BODY_POOL_SIZE = 6
const GRID_COLS = 3
const GRID_ROWS = 3
const RUN_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7]
const IDLE_FRAME = 8

/** Índice do corpo (pele/cabelo) do jogador — mesma convenção de PlayerAvatar (id % pool). */
export const bodyIndexFor = (playerId: number): number => Math.abs(playerId) % BODY_POOL_SIZE

// =====================================================================
// Carregamento das imagens (silencioso enquanto não chegam — quem chama
// cai de volta pro desenho do botão até ficar pronto).
// =====================================================================

// fora do browser (testes SSR) não há Image — sem sprites, todo mundo cai no fallback
const canLoadImages = typeof Image !== 'undefined'

const loadImg = (src: string): HTMLImageElement | null => {
  if (!canLoadImages) return null
  const img = new Image()
  img.src = src
  return img
}

const isReady = (img: HTMLImageElement | null): img is HTMLImageElement =>
  !!img && img.complete && img.naturalWidth > 0

const bodyImages: (HTMLImageElement | null)[] = Array.from({ length: BODY_POOL_SIZE }, (_, i) =>
  loadImg(`/assets/sprites/body_${String(i).padStart(2, '0')}.png`),
)

// =====================================================================
// Recolorir as 3 peças do uniforme por matiz preservando luminosidade —
// cada peça tem sua própria cor-chave (ver KIT_KEYS em tools/_spriteStyle.mjs),
// bem separadas entre si pra não se confundirem nem com pele/cabelo/bota.
// =====================================================================

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

// Precisam bater com KIT_KEYS em tools/_spriteStyle.mjs.
const KIT_KEY_HEX = { shirt: '#39FF14', shorts: '#0044FF', socks: '#FF00AA' } as const
const KIT_KEY_HUES: Record<keyof typeof KIT_KEY_HEX, number> = {
  shirt: hexToHsl(KIT_KEY_HEX.shirt)[0],
  shorts: hexToHsl(KIT_KEY_HEX.shorts)[0],
  socks: hexToHsl(KIT_KEY_HEX.socks)[0],
}
const HUE_TOLERANCE = 35 // as 3 chaves ficam a ≥80° uma da outra — folga segura

/** Recolore in-place cada peça do uniforme (camisa/short/meião) pra sua cor-alvo. */
function recolorKit(imageData: ImageData, colors: KitColors): void {
  const targets = {
    shirt: hexToHsl(colors.shirt),
    shorts: hexToHsl(colors.shorts),
    socks: hexToHsl(colors.socks),
  }
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    if (s < 0.2) continue // baixa saturação → pele/contorno/bota/luva, não é uniforme
    // acha a peça (camisa/short/meião) cuja cor-chave está mais perto deste pixel
    let bestPart: keyof typeof KIT_KEY_HUES | null = null
    let bestDist = Infinity
    for (const part of Object.keys(KIT_KEY_HUES) as (keyof typeof KIT_KEY_HUES)[]) {
      const dist = hueDist(h, KIT_KEY_HUES[part])
      if (dist < bestDist) {
        bestDist = dist
        bestPart = part
      }
    }
    if (!bestPart || bestDist > HUE_TOLERANCE) continue
    const weight = 1 - bestDist / HUE_TOLERANCE
    const [targetHue, targetSat] = targets[bestPart]
    const [nr, ng, nb] = hslToRgb(targetHue, targetSat, l)
    d[i] += (nr - d[i]) * weight
    d[i + 1] += (ng - d[i + 1]) * weight
    d[i + 2] += (nb - d[i + 2]) * weight
  }
}

const kitCacheKey = (c: KitColors): string => `${c.shirt}|${c.shorts}|${c.socks}`

const tintCache = new Map<string, HTMLCanvasElement>()

/** Canvas da imagem já recolorido pra cor do time (calcula uma vez, cacheia). */
function getTinted(img: HTMLImageElement | null, cacheId: string, colors: KitColors): HTMLCanvasElement | null {
  if (!isReady(img)) return null
  const key = `${cacheId}|${kitCacheKey(colors)}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  recolorKit(imageData, colors)
  ctx.putImageData(imageData, 0, 0)
  tintCache.set(key, canvas)
  return canvas
}

/** Desenha um quadro (col/row de uma grade) girado e centrado em (cx,cy). */
function drawCell(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  cols: number,
  rows: number,
  frame: number,
  cx: number,
  cy: number,
  sizePx: number,
  angle: number,
  alpha: number,
  mirror: boolean,
): void {
  const cellW = src.width / cols
  const cellH = src.height / rows
  const col = frame % cols
  const row = Math.floor(frame / cols)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle + Math.PI / 2) // sprite "olha" pra cima (norte) no frame de origem
  if (mirror) ctx.scale(-1, 1) // espelha esquerda↔direita (defesa do goleiro pro lado oposto)
  ctx.globalAlpha = alpha
  ctx.drawImage(src, col * cellW, row * cellH, cellW, cellH, -sizePx / 2, -sizePx / 2, sizePx, sizePx)
  ctx.globalAlpha = 1
  ctx.restore()
}

// =====================================================================
// Corrida: o avanço do ciclo é guiado pela DISTÂNCIA percorrida (não pelo
// tempo), então a passada bate com o movimento em qualquer velocidade de
// jogo (Normal/Rápido/Turbo) sem parecer moonwalk.
// =====================================================================

const METERS_PER_STRIDE = 8.4 // ciclo completo (8 quadros) a cada ~8.4m
const IDLE_SPEED_MPS = 0.6 // abaixo disso mostra o quadro parado

interface RunState {
  frameFloat: number
  lastPos: Vec2
  angle: number
}
const runState = new Map<number, RunState>()

/**
 * Desenha o jogador correndo/parado no lugar do botão. Retorna false (sem
 * desenhar nada) se o sprite ainda não carregou — quem chama cai de volta
 * pro desenho do botão nesse caso.
 */
function drawRunning(
  ctx: CanvasRenderingContext2D,
  playerId: number,
  colors: KitColors,
  ip: Vec2,
  cx: number,
  cy: number,
  sizePx: number,
  speedMps: number,
): boolean {
  const bodyIndex = bodyIndexFor(playerId)
  const tinted = getTinted(bodyImages[bodyIndex], `body${bodyIndex}`, colors)
  if (!tinted) return false

  let st = runState.get(playerId)
  if (!st) {
    st = { frameFloat: 0, lastPos: ip, angle: -Math.PI / 2 }
    runState.set(playerId, st)
  }
  const dx = ip.x - st.lastPos.x
  const dy = ip.y - st.lastPos.y
  const dist = Math.hypot(dx, dy)
  st.lastPos = ip
  const idle = speedMps < IDLE_SPEED_MPS
  if (!idle) {
    st.angle = Math.atan2(dy, dx)
    st.frameFloat += (dist / METERS_PER_STRIDE) * RUN_FRAMES.length
  }

  if (idle) {
    drawCell(ctx, tinted, GRID_COLS, GRID_ROWS, IDLE_FRAME, cx, cy, sizePx, st.angle, 1, false)
  } else {
    const n = RUN_FRAMES.length
    const f = ((st.frameFloat % n) + n) % n
    const i0 = Math.floor(f)
    const t = f - i0
    drawCell(ctx, tinted, GRID_COLS, GRID_ROWS, RUN_FRAMES[i0], cx, cy, sizePx, st.angle, 1, false)
    if (t > 0.001) drawCell(ctx, tinted, GRID_COLS, GRID_ROWS, RUN_FRAMES[(i0 + 1) % n], cx, cy, sizePx, st.angle, t, false)
  }
  return true
}

// =====================================================================
// Ações de um só disparo (chute, cabeceio, lateral, defesa do goleiro) —
// tocam por uma duração fixa em tempo real (não guiadas por distância, ao
// contrário da corrida: são reações pontuais a um evento da simulação),
// depois voltam sozinhas pra corrida/parado.
// =====================================================================

export type ActionKind = 'kick' | 'header' | 'throwin' | 'save'

interface ActionDef {
  src: string
  cols: number
  rows: number
  frames: number
  durationMs: number
  mirrorable?: boolean
}

const ACTIONS: Record<ActionKind, ActionDef> = {
  kick: { src: '/assets/sprites/action_kick.png', cols: 3, rows: 2, frames: 6, durationMs: 380 },
  header: { src: '/assets/sprites/action_header.png', cols: 2, rows: 2, frames: 4, durationMs: 480 },
  throwin: { src: '/assets/sprites/action_throwin.png', cols: 2, rows: 2, frames: 4, durationMs: 550 },
  save: { src: '/assets/sprites/action_save.png', cols: 2, rows: 2, frames: 4, durationMs: 480, mirrorable: true },
}

const actionImages: Record<ActionKind, HTMLImageElement | null> = {
  kick: loadImg(ACTIONS.kick.src),
  header: loadImg(ACTIONS.header.src),
  throwin: loadImg(ACTIONS.throwin.src),
  save: loadImg(ACTIONS.save.src),
}

interface ActiveAction {
  kind: ActionKind
  startedAt: number
  angle: number
  mirror: boolean
}
const activeActions = new Map<number, ActiveAction>()

/**
 * Dispara uma ação de um só tiro pro jogador (chamar quando a simulação
 * emite o evento correspondente — ver useMatchLoop.ts). `angle` é a direção
 * pra onde o jogador deve ficar de frente (radianos, mesma convenção de
 * `Math.atan2`); `mirror` espelha a pose (usado na defesa pro lado oposto).
 */
export function triggerAction(playerId: number, kind: ActionKind, angle: number, mirror = false): void {
  activeActions.set(playerId, { kind, startedAt: performance.now(), angle, mirror })
}

/**
 * Se o jogador tem uma ação ativa, desenha o quadro correspondente e devolve
 * true (quem chama pula o desenho de corrida). Limpa a ação sozinha quando a
 * duração termina. Retorna false se não há ação ativa ou a imagem não carregou.
 */
function drawActionIfActive(
  ctx: CanvasRenderingContext2D,
  playerId: number,
  colors: KitColors,
  cx: number,
  cy: number,
  sizePx: number,
): boolean {
  const active = activeActions.get(playerId)
  if (!active) return false
  const def = ACTIONS[active.kind]
  const elapsed = performance.now() - active.startedAt
  if (elapsed >= def.durationMs) {
    activeActions.delete(playerId)
    return false
  }
  const tinted = getTinted(actionImages[active.kind], active.kind, colors)
  if (!tinted) return false
  const t = elapsed / def.durationMs // 0..1 ao longo da ação
  const frameFloat = t * def.frames
  const i0 = Math.min(def.frames - 1, Math.floor(frameFloat))
  const frac = Math.min(1, frameFloat - i0)
  drawCell(ctx, tinted, def.cols, def.rows, i0, cx, cy, sizePx, active.angle, 1, active.mirror)
  if (frac > 0.001 && i0 + 1 < def.frames) {
    drawCell(ctx, tinted, def.cols, def.rows, i0 + 1, cx, cy, sizePx, active.angle, frac, active.mirror)
  }
  return true
}

/**
 * Ponto de entrada único do renderer: desenha a ação em andamento (chute,
 * cabeceio, lateral, defesa) se houver uma; senão desenha corrida/parado.
 * Retorna false só quando NADA foi desenhado (sprite ainda não carregado) —
 * aí quem chama cai pro botão antigo.
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  playerId: number,
  colors: KitColors,
  ip: Vec2,
  cx: number,
  cy: number,
  sizePx: number,
  speedMps: number,
): boolean {
  if (drawActionIfActive(ctx, playerId, colors, cx, cy, sizePx)) return true
  return drawRunning(ctx, playerId, colors, ip, cx, cy, sizePx, speedMps)
}
