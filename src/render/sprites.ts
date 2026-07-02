/**
 * Sprites de jogador correndo (visto de cima), gerados por IA — ver
 * tools/generate-sprites.mjs e tools/generate-art.mjs. Substituem o domo
 * de acrílico do "botão" quando a imagem já carregou; a câmera do jogo é
 * ortogonal de cima, então uma única pose cobre as 360° de direção via
 * rotação do canvas — não existe sprite por direção.
 *
 * Geometria da grade e cor-chave do uniforme precisam bater com o manifest
 * gerado em public/assets/sprites/manifest.json (fonte: generate-sprites.mjs).
 */
import type { Vec2 } from '../sim/types'

const BODY_POOL_SIZE = 6
const GRID_COLS = 3
const GRID_ROWS = 3
const RUN_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7]
const IDLE_FRAME = 8
const KIT_KEY_HUE = hexToHsl('#39FF14')[0]

/** Índice do corpo (pele/cabelo) do jogador — mesma convenção de PlayerAvatar (id % pool). */
export const bodyIndexFor = (playerId: number): number => Math.abs(playerId) % BODY_POOL_SIZE

// =====================================================================
// Carregamento das imagens (silencioso enquanto não chegam — quem chama
// cai de volta pro desenho do botão até ficar pronto).
// =====================================================================

const bodyImages: HTMLImageElement[] = Array.from({ length: BODY_POOL_SIZE }, (_, i) => {
  const img = new Image()
  img.src = `/assets/sprites/body_${String(i).padStart(2, '0')}.png`
  return img
})

const isReady = (i: number): boolean => bodyImages[i].complete && bodyImages[i].naturalWidth > 0

// =====================================================================
// Recolorir o uniforme por matiz preservando luminosidade — mesmo truque
// do preview (tools/build-sprite-preview.mjs), computado uma vez por
// combinação (corpo, cor do time) e cacheado num canvas offscreen.
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

/** Recolore in-place os pixels cujo matiz está perto do verde-chave do uniforme. */
function recolorKit(imageData: ImageData, targetHex: string): void {
  const [targetHue, targetSat] = hexToHsl(targetHex)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    if (s < 0.2) continue // baixa saturação → pele/contorno/bota, não é uniforme
    const dist = hueDist(h, KIT_KEY_HUE)
    if (dist > 55) continue
    const weight = 1 - Math.min(1, dist / 55)
    const [nr, ng, nb] = hslToRgb(targetHue, targetSat, l)
    d[i] += (nr - d[i]) * weight
    d[i + 1] += (ng - d[i + 1]) * weight
    d[i + 2] += (nb - d[i + 2]) * weight
  }
}

const tintCache = new Map<string, HTMLCanvasElement>()

/** Canvas do corpo já recolorido pra cor do time (calcula uma vez, cacheia). */
function getTintedBody(bodyIndex: number, shirtHex: string): HTMLCanvasElement | null {
  if (!isReady(bodyIndex)) return null
  const key = `${bodyIndex}|${shirtHex}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const img = bodyImages[bodyIndex]
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  recolorKit(imageData, shirtHex)
  ctx.putImageData(imageData, 0, 0)
  tintCache.set(key, canvas)
  return canvas
}

// =====================================================================
// Animação: o avanço do ciclo de corrida é guiado pela DISTÂNCIA percorrida
// (não pelo tempo), então a passada bate com o movimento em qualquer
// velocidade de jogo (Normal/Rápido/Turbo) sem parecer moonwalk.
// =====================================================================

const METERS_PER_STRIDE = 1.4 // ciclo completo (8 quadros) a cada ~1.4m — ajuste visual
const IDLE_SPEED_MPS = 0.6 // abaixo disso mostra o quadro parado

interface AnimState {
  frameFloat: number
  lastPos: Vec2
  angle: number
}
const animState = new Map<number, AnimState>()

/**
 * Desenha o jogador correndo no lugar do botão. Retorna false (sem desenhar
 * nada) se o sprite ainda não carregou ou não deveria ser usado agora —
 * quem chama cai de volta pro desenho do botão nesse caso.
 */
export function drawRunningPlayer(
  ctx: CanvasRenderingContext2D,
  playerId: number,
  shirtHex: string,
  ip: Vec2,
  cx: number,
  cy: number,
  sizePx: number,
  speedMps: number,
): boolean {
  const bodyIndex = bodyIndexFor(playerId)
  const tinted = getTintedBody(bodyIndex, shirtHex)
  if (!tinted) return false

  let anim = animState.get(playerId)
  if (!anim) {
    anim = { frameFloat: 0, lastPos: ip, angle: -Math.PI / 2 }
    animState.set(playerId, anim)
  }
  const dx = ip.x - anim.lastPos.x
  const dy = ip.y - anim.lastPos.y
  const dist = Math.hypot(dx, dy)
  anim.lastPos = ip
  const idle = speedMps < IDLE_SPEED_MPS
  if (!idle) {
    anim.angle = Math.atan2(dy, dx)
    anim.frameFloat += (dist / METERS_PER_STRIDE) * RUN_FRAMES.length
  }

  const cellW = tinted.width / GRID_COLS
  const cellH = tinted.height / GRID_ROWS
  const drawFrame = (frame: number, alpha: number) => {
    const col = frame % GRID_COLS
    const row = Math.floor(frame / GRID_COLS)
    ctx.globalAlpha = alpha
    ctx.drawImage(tinted, col * cellW, row * cellH, cellW, cellH, -sizePx / 2, -sizePx / 2, sizePx, sizePx)
  }

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(anim.angle + Math.PI / 2) // sprite "olha" pra cima (norte) no frame de origem
  if (idle) {
    drawFrame(IDLE_FRAME, 1)
  } else {
    const n = RUN_FRAMES.length
    const f = ((anim.frameFloat % n) + n) % n
    const i0 = Math.floor(f)
    const t = f - i0
    drawFrame(RUN_FRAMES[i0], 1)
    if (t > 0.001) drawFrame(RUN_FRAMES[(i0 + 1) % n], t)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  return true
}
