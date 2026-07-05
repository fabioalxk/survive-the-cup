import type { MatchState, Player, TeamId } from '../sim/types'
import { AIR, FIELD, GOAL, PHYS } from '../sim/constants'
import { TEAMS } from '../sim/teams'
import { len, lerpV, norm, perp } from '../sim/vector'

/** As 3 regiões recoloríveis do uniforme (sprite) + cor do número. */
export interface KitColors {
  shirt: string
  shorts: string
  socks: string
  text: string
}

/**
 * Sobrescrita de cores dos uniformes (modo carreira: clubes reais). Quando
 * definida, substitui as cores do TEAMS (Brasil/Argentina da demo). null = demo.
 */
let kitOverride: Record<TeamId, KitColors> | null = null
export const setMatchKits = (kits: Record<TeamId, KitColors> | null): void => {
  kitOverride = kits
}
/** Cores do uniforme de linha do time (carreira sobrepõe a demo). */
const kitInfo = (team: TeamId): KitColors => (kitOverride ? kitOverride[team] : TEAMS[team])

/**
 * Em telas retrato (celular) o canvas é girado 90° no CSS p/ o campo landscape
 * preencher a altura do aparelho — mas isso deita TODO o conteúdo, inclusive os
 * rótulos (número e nome). Com este flag ligado, esses textos são contra-girados
 * no desenho para continuarem legíveis na horizontal. null/false = sem giro.
 */
let labelsUpright = false
export const setLabelsUpright = (v: boolean): void => {
  labelsUpright = v
}

/** Placa de nome abaixo do jogador: some por padrão (poluía a leitura do jogo com muitos jogadores em campo). */
let showNames = false
export const setShowNames = (v: boolean): void => {
  showNames = v
}

/**
 * Desenha `body` com o contexto contra-girado −90° em torno do pivô (x,y), de
 * modo que o conteúdo fique na vertical mesmo com o canvas girado +90° no CSS.
 * Sem o flag, executa `body` sem alteração (campo na horizontal, desktop).
 */
const uprightLabel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: () => void,
): void => {
  if (!labelsUpright) {
    body()
    return
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-Math.PI / 2)
  ctx.translate(-x, -y)
  body()
  ctx.restore()
}

/** margem (m) ao redor do campo, para desenhar redes e arquibancada */
export const PAD = 4

export const canvasSize = (scale: number) => ({
  width: Math.round((FIELD.w + PAD * 2) * scale),
  height: Math.round((FIELD.h + PAD * 2) * scale),
})

const COLORS = {
  // verde dessaturado, na paleta do mapa desenhado à mão (nada de verde-neon)
  grassDark: '#3a7a48',
  grassLight: '#458a55',
  surround: '#1c3d27',
  surroundEdge: '#122b1a',
  // linhas cor de giz, um tico abaixo do branco puro
  line: 'rgba(244,246,235,0.88)',
  lineSoft: 'rgba(244,246,235,0.5)',
  ball: '#f8fafc',
  ballEdge: '#0f172a',
  controller: '#fde047',
  net: 'rgba(255,255,255,0.42)',
  post: '#f4f6fb',
}

/**
 * Uniforme de goleiro: na vida real o GK sempre veste cor contrastante com a
 * dos jogadores de linha (e do adversário). Verde/laranja são clássicos.
 */
const GK_KITS: Record<string, KitColors> = {
  // uniforme de goleiro é monocromático (camisa=short=meião) na vida real
  home: { shirt: '#15803d', shorts: '#15803d', socks: '#15803d', text: '#f0fdf4' }, // Brasil de linha é amarelo → GK verde
  away: { shirt: '#f97316', shorts: '#f97316', socks: '#f97316', text: '#1c1917' }, // Argentina de linha é azul → GK laranja
}

/**
 * Padrão do uniforme estampado no domo do botão (identidade visual do time):
 * 'solid' = camisa lisa; 'stripes' = listras verticais (ex.: o albiceleste da
 * Argentina). Goleiro não recebe estampa (usa GK_KITS).
 */
const KIT_PATTERN: Record<string, 'solid' | 'stripes' | 'trim'> = {
  home: 'trim', // Brasil: amarelo com gola/punhos verdes
  away: 'stripes', // Argentina: listras celeste/branco
}

/** Cor do acabamento (gola/punhos) p/ o padrão 'trim'. */
const KIT_TRIM: Record<string, string> = {
  home: '#15803d', // verde-Brasil
}

/** Capitão de cada time (nº da camisa) — recebe a braçadeira dourada no botão. */
const CAPTAINS: Record<string, number> = {
  home: 5, // Casemiro
  away: 10, // Messi
}

/** Contador de frames (proxy de tempo) p/ animações ambiente, ex.: bandeiras ao vento. */
let animFrame = 0
/** Oscilação suave de bandeira (px) a partir do contador de frames + semente. */
const flutter = (seed: number, scale: number) =>
  Math.sin(animFrame * 0.12 + seed) * scale * 0.5

/** Converte #rrggbb em {r,g,b}. */
const hexRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/**
 * Clareia (amt>0) ou escurece (amt<0) uma cor #rrggbb, |amt| em 0..1.
 * Usado para dar volume aos botões (domo claro no topo, lateral escura).
 */
const shade = (hex: string, amt: number): string => {
  const { r, g, b } = hexRgb(hex)
  const mix = (c: number) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

/** Luminância relativa simples (0..1) — escolhe contorno claro/escuro. */
const isLight = (hex: string): boolean => {
  const { r, g, b } = hexRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

export const drawMatch = (
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  scale: number,
  /** fração do passo já decorrida (0..1) — interpola prev→pos no render */
  alpha = 1,
): void => {
  const px = (m: number) => (m + PAD) * scale
  const size = canvasSize(scale)
  animFrame++ // avança o relógio de animação ambiente (bandeiras ao vento)

  // fundo (entorno do gramado) — fica fixo; só o campo treme no impacto do gol.
  // gradiente radial dá sensação de holofotes incidindo no centro do estádio.
  const surround = ctx.createRadialGradient(
    size.width / 2, size.height / 2, scale * 6,
    size.width / 2, size.height / 2, Math.max(size.width, size.height) * 0.62,
  )
  surround.addColorStop(0, COLORS.surround)
  surround.addColorStop(1, COLORS.surroundEdge)
  ctx.fillStyle = surround
  ctx.fillRect(0, 0, size.width, size.height)

  const cel = state.celebration
  ctx.save()
  if (cel) {
    // tremor de tela no impacto do gol, decaindo rápido (~0.45s)
    const k = Math.max(0, 1 - cel.t / 0.45)
    if (k > 0) {
      const amp = scale * 0.55 * k * k
      ctx.translate(Math.sin(cel.t * 92) * amp, Math.cos(cel.t * 78) * amp)
    }
  }

  drawPitch(ctx, px, scale)
  // nomes primeiro: jogadores desenhados depois ficam sempre por cima deles
  if (showNames) for (const p of state.players) drawPlayerName(ctx, p, px, scale, alpha)
  for (const p of state.players) drawPlayer(ctx, p, px, scale, alpha, cel)
  drawBall(ctx, state, px, scale, alpha)
  if (cel) drawCelebration(ctx, state, px, scale)
  ctx.restore()

  // vinheta cinematográfica: escurece levemente os cantos da tela toda,
  // concentrando o olhar no centro do gramado (profundidade de transmissão).
  const vig = ctx.createRadialGradient(
    size.width / 2, size.height / 2, Math.min(size.width, size.height) * 0.35,
    size.width / 2, size.height / 2, Math.max(size.width, size.height) * 0.72,
  )
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, size.width, size.height)
}

/**
 * Pista visual em CAMPO de que saiu gol: a rede do gol que sofreu pulsa na cor
 * de quem marcou e um anel destaca a bola parada dentro da rede — fica claro
 * ONDE e de QUEM foi o gol antes mesmo de ler o banner.
 */
const drawCelebration = (
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  px: Px,
  scale: number,
) => {
  const c = state.celebration!
  const accent = kitInfo(c.team).shirt
  const pulse = 0.5 + 0.5 * Math.sin(c.t * 9)

  // realça a rede do gol sofrido
  const gy0 = px(GOAL.top)
  const gy1 = px(GOAL.bottom)
  const lineX = px(c.goalX)
  const backX = c.goalX === 0 ? px(-GOAL.depth) : px(FIELD.w + GOAL.depth)
  ctx.save()
  ctx.globalAlpha = 0.2 + 0.35 * pulse
  ctx.fillStyle = accent
  ctx.fillRect(Math.min(lineX, backX), gy0, Math.abs(backX - lineX), gy1 - gy0)
  ctx.restore()

  // anel pulsante em torno da bola na rede
  const cx = px(state.ball.pos.x)
  const cy = px(state.ball.pos.y)

  // clarão de impacto: estoura da bola no fundo da rede e expande/some (~0.6s)
  const flashK = Math.max(0, 1 - c.t / 0.6)
  if (flashK > 0) {
    const fr = scale * (6 + 30 * (1 - flashK))
    const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr)
    fg.addColorStop(0, `rgba(255,255,255,${0.7 * flashK})`)
    fg.addColorStop(0.4, `rgba(255,255,255,${0.25 * flashK})`)
    fg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.arc(cx, cy, fr, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(2, scale * 0.28)
  ctx.beginPath()
  ctx.arc(cx, cy, scale * (1.1 + pulse * 1.3), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  drawFlashbulbs(ctx, c.t, scale)
  drawConfetti(ctx, c.t, accent, kitInfo(c.team).text, scale)
}

/**
 * Flashes de câmera na arquibancada (faixa do PAD): pontos brancos que piscam
 * em posições fixas, ligando/desligando no tempo — dá o clima de estádio.
 */
const drawFlashbulbs = (ctx: CanvasRenderingContext2D, t: number, scale: number) => {
  const size = canvasSize(scale)
  const band = PAD * scale
  const tick = Math.floor(t * 12)
  ctx.save()
  for (let i = 1; i <= 40; i++) {
    // liga/desliga pseudo-aleatório, mas determinístico por (i, tick)
    if ((Math.sin(i * (tick + 1) * 7.13) * 0.5 + 0.5) < 0.8) continue
    const x = (Math.sin(i * 78.233) * 0.5 + 0.5) * size.width
    const top = i % 2 === 0
    const yy = (Math.cos(i * 12.17) * 0.5 + 0.5) * band
    const y = top ? yy : size.height - yy
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(x, y, scale * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(x, y, scale * 0.85, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Confete caindo nas cores do time que marcou. Posição é função pura do tempo
 * (sem estado): cada partícula cai e balança, repetindo ao sair da tela.
 */
const drawConfetti = (
  ctx: CanvasRenderingContext2D,
  t: number,
  c1: string,
  c2: string,
  scale: number,
) => {
  const size = canvasSize(scale)
  const cols = [c1, '#ffffff', c2]
  ctx.save()
  ctx.globalAlpha = 0.9
  for (let i = 0; i < 110; i++) {
    const sx = (Math.sin(i * 12.9898) * 0.5 + 0.5) * size.width
    const speed = 55 + (i % 7) * 14
    const y = ((t * speed + i * 41) % (size.height + 40)) - 20
    const x = sx + Math.sin(t * 2 + i) * scale * 1.8
    // cada fita rodopia ao cair; o "achatamento" no eixo Y simula o giro 3D
    const spin = t * (3 + (i % 5)) + i
    const w = scale * (0.45 + (i % 3) * 0.12)
    const h = scale * (0.8 + (i % 4) * 0.2) * Math.abs(Math.cos(spin))
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.sin(spin) * 0.9)
    ctx.fillStyle = cols[i % 3]
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
  }
  ctx.restore()
}

type Px = (m: number) => number

/**
 * Placas de publicidade (painéis LED) emoldurando o campo na faixa do PAD —
 * elemento clássico de transmissão que preenche o entorno escuro e dá a
 * sensação de estádio real. São painéis segmentados com brilho no topo.
 */
const drawBoards = (ctx: CanvasRenderingContext2D, px: Px, scale: number) => {
  const left = px(0)
  const top = px(0)
  const right = px(FIELD.w)
  const bottom = px(FIELD.h)
  const gap = scale * 0.9 // recuo (track) entre a linha de fundo e a placa
  const bt = scale * 1.15 // espessura da placa
  const ox = left - gap - bt
  const oy = top - gap - bt
  const ow = right - left + (gap + bt) * 2
  const innerH = bottom - top + gap * 2

  const panel = (x: number, y: number, w: number, h: number, horiz: boolean) => {
    const g = horiz
      ? ctx.createLinearGradient(0, y, 0, y + h)
      : ctx.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, '#13233b')
    g.addColorStop(0.5, '#1f3a63')
    g.addColorStop(1, '#0d1828')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    // brilho de borda (reflexo do painel)
    ctx.fillStyle = 'rgba(255,255,255,0.13)'
    if (horiz) ctx.fillRect(x, y, w, Math.max(1, h * 0.16))
    else ctx.fillRect(x, y, Math.max(1, w * 0.16), h)
    // divisórias dos segmentos de LED
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'
    ctx.lineWidth = 1
    const seg = scale * 3
    ctx.beginPath()
    if (horiz) {
      for (let sx = x; sx <= x + w; sx += seg) {
        ctx.moveTo(sx, y)
        ctx.lineTo(sx, y + h)
      }
    } else {
      for (let sy = y; sy <= y + h; sy += seg) {
        ctx.moveTo(x, sy)
        ctx.lineTo(x + w, sy)
      }
    }
    ctx.stroke()
  }

  panel(ox, oy, ow, bt, true) // topo
  panel(ox, bottom + gap, ow, bt, true) // base
  panel(ox, top - gap, bt, innerH, false) // esquerda
  panel(right + gap, top - gap, bt, innerH, false) // direita
}

const drawPitch = (ctx: CanvasRenderingContext2D, px: Px, scale: number) => {
  const W = px(FIELD.w)
  const H = px(FIELD.h)
  const x0 = px(0)
  const y0 = px(0)
  const pw = W - x0
  const ph = H - y0

  drawBoards(ctx, px, scale)

  // listras do gramado (faixas verticais de corte alternado)
  const stripes = 14
  const sw = pw / stripes
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? COLORS.grassDark : COLORS.grassLight
    ctx.fillRect(x0 + i * sw, y0, sw + 1, ph)
  }

  // corte cruzado (mowing xadrez): bandas horizontais suaves sobre as listras
  // verticais → o gramado ganha o aspecto quadriculado de campo bem cuidado.
  const rows = 9
  const rh = ph / rows
  ctx.save()
  for (let j = 0; j < rows; j++) {
    ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)'
    ctx.fillRect(x0, y0 + j * rh, pw, rh + 1)
  }
  ctx.restore()

  // granulado do gramado: pontinhos fixos (determinísticos por índice) quebram
  // a cor chapada e dão textura de grama de perto. Posição via hash de sin, sem
  // tempo → não cintila entre frames.
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, pw, ph)
  ctx.clip()
  const specks = 520
  const sp = Math.max(1, scale * 0.16)
  for (let i = 0; i < specks; i++) {
    const gx = x0 + ((Math.sin(i * 12.9898) * 0.5 + 0.5) * pw)
    const gy = y0 + ((Math.sin(i * 78.233) * 0.5 + 0.5) * ph)
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(gx, gy, sp, sp * 2)
  }

  // áreas desgastadas (grama gasta): boca dos gols e círculo central — onde mais
  // se pisa numa partida real. Manchas claras/terrosas suaves, recortadas no campo.
  const wear = (mx: number, my: number, wrx: number, wry: number) =>
    softEllipse(ctx, px(mx), px(my), wrx * scale, wry * scale, [
      [0, 'rgba(206,196,150,0.16)'],
      [1, 'rgba(206,196,150,0)'],
    ])
  wear(FIELD.cx, FIELD.cy, 8, 8) // círculo central
  wear(10, FIELD.cy, 9, 11) // boca do gol esquerdo
  wear(FIELD.w - 10, FIELD.cy, 9, 11) // boca do gol direito

  // reflexos dos refletores (4 bancos de luz do estádio): poças elípticas
  // claras e suaves nos quadrantes — clima de jogo noturno sob holofotes.
  const rr = Math.min(pw, ph) * 0.36
  const pool = (fx: number, fy: number) =>
    softEllipse(ctx, x0 + pw * fx, y0 + ph * fy, rr, rr * 0.6, [
      [0, 'rgba(255,255,245,0.07)'],
      [1, 'rgba(255,255,245,0)'],
    ])
  pool(0.28, 0.27)
  pool(0.72, 0.27)
  pool(0.28, 0.73)
  pool(0.72, 0.73)
  ctx.restore()

  // brilho de holofote: clareia o miolo do gramado e escurece as bordas,
  // dando relevo e profundidade ao tapete (efeito "campo iluminado").
  const light = ctx.createRadialGradient(
    px(FIELD.cx), px(FIELD.cy), scale * 4,
    px(FIELD.cx), px(FIELD.cy), Math.max(pw, ph) * 0.62,
  )
  light.addColorStop(0, 'rgba(255,255,255,0.10)')
  light.addColorStop(0.55, 'rgba(255,255,255,0.0)')
  light.addColorStop(1, 'rgba(0,0,0,0.22)')
  ctx.fillStyle = light
  ctx.fillRect(x0, y0, pw, ph)

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = Math.max(1.5, scale * 0.14)
  ctx.lineCap = 'round'

  // linhas externas
  ctx.strokeRect(x0, y0, pw, ph)

  // meio-campo + círculo central
  ctx.beginPath()
  ctx.moveTo(px(FIELD.cx), y0)
  ctx.lineTo(px(FIELD.cx), H)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(px(FIELD.cx), px(FIELD.cy), 9.15 * scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(px(FIELD.cx), px(FIELD.cy), scale * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.line
  ctx.fill()

  // arcos de escanteio nos quatro cantos (raio oficial 1m)
  const r = scale
  const corner = (cxm: number, cym: number, start: number, end: number) => {
    ctx.beginPath()
    ctx.arc(px(cxm), px(cym), r, start, end)
    ctx.stroke()
  }
  corner(0, 0, 0, Math.PI / 2)
  corner(FIELD.w, 0, Math.PI / 2, Math.PI)
  corner(FIELD.w, FIELD.h, Math.PI, Math.PI * 1.5)
  corner(0, FIELD.h, Math.PI * 1.5, Math.PI * 2)

  // bandeirinhas de escanteio: poste + flâmula vermelha apontando p/ fora —
  // detalhe real do campo, com uma sombrinha p/ dar volume na vista de cima.
  const cornerFlag = (mx: number, my: number, dx: number, dy: number) => {
    const cxp = px(mx)
    const cyp = px(my)
    const fl = scale * 1.7
    const px2 = -dy * scale * 0.78 // perpendicular p/ a largura da flâmula
    const py2 = dx * scale * 0.78
    // tremulação ao vento: a ponta da flâmula oscila perpendicular à haste
    const wob = flutter(mx + my, scale)
    const tx = cxp + dx * fl - dy * wob
    const ty = cyp + dy * fl + dx * wob
    // sombra da flâmula no gramado
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.moveTo(cxp + scale * 0.3, cyp + scale * 0.3)
    ctx.lineTo(tx + scale * 0.3, ty + scale * 0.3)
    ctx.lineTo(cxp + px2 + scale * 0.3, cyp + py2 + scale * 0.3)
    ctx.closePath()
    ctx.fill()
    // flâmula
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(cxp, cyp)
    ctx.lineTo(tx, ty)
    ctx.lineTo(cxp + px2, cyp + py2)
    ctx.closePath()
    ctx.fill()
    // poste
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.arc(cxp, cyp, Math.max(1, scale * 0.34), 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.stroke()
  }
  const k = 0.707
  cornerFlag(0, 0, -k, -k)
  cornerFlag(FIELD.w, 0, k, -k)
  cornerFlag(0, FIELD.h, -k, k)
  cornerFlag(FIELD.w, FIELD.h, k, k)

  drawGoalEnd(ctx, px, scale, true)
  drawGoalEnd(ctx, px, scale, false)
}

const drawGoalEnd = (
  ctx: CanvasRenderingContext2D,
  px: Px,
  scale: number,
  left: boolean,
) => {
  // grande área (16.5 x 40.3) e pequena área (5.5 x 18.3)
  const box = (depth: number, width: number) => {
    const w = depth * scale
    const h = width * scale
    const y = px(FIELD.cy) - h / 2
    const x = left ? px(0) : px(FIELD.w) - w
    ctx.strokeRect(x, y, w, h)
  }
  box(16.5, 40.3)
  box(5.5, 18.3)

  // marca do pênalti
  const spotX = left ? 11 : FIELD.w - 11
  ctx.beginPath()
  ctx.arc(px(spotX), px(FIELD.cy), scale * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.line
  ctx.fill()

  // arco da grande área (a "meia-lua"/D), só a parte FORA da área
  const arcR = 9.15
  const boxEdge = 16.5 - 11 // distância do ponto à linha da grande área
  const th = Math.acos(boxEdge / arcR)
  ctx.beginPath()
  if (left) ctx.arc(px(spotX), px(FIELD.cy), arcR * scale, -th, th)
  else ctx.arc(px(spotX), px(FIELD.cy), arcR * scale, Math.PI - th, Math.PI + th)
  ctx.stroke()

  // gol: rede + traves
  const gy0 = px(GOAL.top)
  const gy1 = px(GOAL.bottom)
  const lineX = px(left ? 0 : FIELD.w)
  const backX = left ? px(-GOAL.depth) : px(FIELD.w + GOAL.depth)
  const nx0 = Math.min(lineX, backX)
  const nw = Math.abs(backX - lineX)

  // sombra sutil dentro do gol (a rede recolhe luz no fundo)
  const netShade = ctx.createLinearGradient(lineX, 0, backX, 0)
  netShade.addColorStop(0, 'rgba(0,0,0,0.05)')
  netShade.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = netShade
  ctx.fillRect(nx0, gy0, nw, gy1 - gy0)

  // malha da rede — losangos (diagonais cruzadas): leitura de rede de gol real,
  // bem mais convincente que o quadriculado reto. Recortada no retângulo do gol.
  ctx.save()
  ctx.beginPath()
  ctx.rect(nx0, gy0, nw, gy1 - gy0)
  ctx.clip()
  ctx.strokeStyle = COLORS.net
  ctx.lineWidth = 1
  const mesh = Math.max(2, scale * 0.62) // passo da malha em px
  const nh = gy1 - gy0
  ctx.beginPath()
  // diagonais descendo p/ a direita (\)
  for (let sx = nx0 - nh; sx <= nx0 + nw; sx += mesh) {
    ctx.moveTo(sx, gy0)
    ctx.lineTo(sx + nh, gy1)
  }
  // diagonais descendo p/ a esquerda (/)
  for (let sx = nx0; sx <= nx0 + nw + nh; sx += mesh) {
    ctx.moveTo(sx, gy0)
    ctx.lineTo(sx - nh, gy1)
  }
  ctx.stroke()
  ctx.restore()

  // traves (postes) + travessão lateral, com brilho de cilindro
  const postW = Math.max(2.5, scale * 0.34)
  ctx.strokeStyle = COLORS.post
  ctx.lineWidth = postW
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(lineX, gy0)
  ctx.lineTo(backX, gy0)
  ctx.moveTo(lineX, gy1)
  ctx.lineTo(backX, gy1)
  ctx.moveTo(backX, gy0)
  ctx.lineTo(backX, gy1)
  ctx.stroke()
  // realce fino nos postes
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = Math.max(1, postW * 0.32)
  ctx.beginPath()
  ctx.moveTo(lineX, gy0 - postW * 0.18)
  ctx.lineTo(backX, gy0 - postW * 0.18)
  ctx.moveTo(lineX, gy1 - postW * 0.18)
  ctx.lineTo(backX, gy1 - postW * 0.18)
  ctx.stroke()
}

/**
 * Sombra elíptica SUAVE sob um corpo (dá profundidade e ancora o movimento).
 * Usa gradiente radial (escuro no miolo → transparente na borda) para imitar
 * uma sombra difusa de holofote, em vez de um disco preto de borda dura.
 */
/**
 * Mancha elíptica suave: gradiente radial isotrópico desenhado num espaço
 * normalizado (círculo raio 1) e escalado p/ a elipse — base reutilizável de
 * sombras, desgaste do gramado e poças de refletor.
 */
const softEllipse = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  stops: [number, string][],
) => {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawShadow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  off: number,
  a: number,
) =>
  softEllipse(ctx, cx + off, cy + off, rx, ry, [
    [0, `rgba(0,0,0,${a})`],
    [0.7, `rgba(0,0,0,${a * 0.6})`],
    [1, 'rgba(0,0,0,0)'],
  ])

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  px: Px,
  scale: number,
  alpha: number,
  cel: MatchState['celebration'],
) => {
  const r = PHYS.playerRadius * 1.55 * scale
  // posição interpolada entre o passo anterior e o atual → movimento suave
  const ip = lerpV(p.prevPos, p.pos, alpha)
  const cx = px(ip.x)
  const cyGround = px(ip.y)
  const info = kitInfo(p.team)
  // goleiro usa uniforme próprio (contraste), jogador de linha usa o do time
  const kit = p.role === 'GK' ? GK_KITS[p.team] : info
  const down = p.downAmt // 0..1 (transição suave em pé ↔ caído)
  const speed = len(p.vel)

  // pulo de comemoração: o time que marcou saltita (a sombra fica no chão, o
  // corpo sobe — vende o "pulando de alegria" mesmo na vista de cima)
  const hop = cel !== null && p.team === cel.team && p.role !== 'GK' && down < 0.5
  const bob = hop ? Math.abs(Math.sin(cel!.t * 7 + p.id)) * scale * 1.1 : 0
  const cy = cyGround - bob

  // sombra no chão; encolhe e clareia um nada quando o corpo sobe (profundidade)
  const sh = 1 - (bob / scale) * 0.12
  drawShadow(ctx, cx, cyGround, r * 1.2 * sh, r * 0.66 * sh, scale * 0.45, 0.3 * sh)

  // trilha de velocidade: reforça a percepção de movimento e mascara o stepping
  if (speed > 1.5 && down < 0.5) {
    const d = norm(p.vel)
    const trail = Math.min(speed * 0.12, 2.2) * scale
    ctx.save()
    ctx.globalAlpha = 0.12 * (1 - down)
    ctx.strokeStyle = kit.shirt
    ctx.lineWidth = r * 1.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx - d.x * trail, cy - d.y * trail)
    ctx.stroke()
    ctx.restore()
  }

  // realce do dono da bola — surge/some com fade (ctrlAmt), sem piscar
  if (p.ctrlAmt > 0.01) {
    ctx.save()
    ctx.globalAlpha = p.ctrlAmt * (1 - down)
    ctx.beginPath()
    ctx.arc(cx, cy, r + scale * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.controller
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  // corpo: interpola círculo (em pé) → elipse deitada (caído)
  ctx.globalAlpha = 1 - down * 0.45
  const rx = r * (1 + 0.35 * down)
  const ry = r * (1 - 0.4 * down)

  // === botão de futebol: domo colorido sobre pedestal metálico ===
  // 1) pedestal/base (disco mais largo, claro/metálico) deslocado p/ baixo —
  //    aparece como uma meia-lua sob o domo: a marca do futebol de botão.
  const lift = scale * 0.32 * (1 - down)
  const baseR = rx * 1.14
  const baseGrad = ctx.createRadialGradient(
    cx - rx * 0.3, cy + lift - ry * 0.2, rx * 0.1,
    cx, cy + lift, baseR,
  )
  baseGrad.addColorStop(0, '#f8fafc')
  baseGrad.addColorStop(0.55, '#cbd5e1')
  baseGrad.addColorStop(1, '#475569')
  ctx.beginPath()
  ctx.ellipse(cx, cy + lift, baseR, ry * 1.14, 0, 0, Math.PI * 2)
  ctx.fillStyle = baseGrad
  ctx.fill()
  ctx.lineWidth = Math.max(1, scale * 0.07)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.stroke()

  // 2) lateral colorida (espessura do domo apoiada na base)
  ctx.beginPath()
  ctx.ellipse(cx, cy + lift * 0.35, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2)
  ctx.fillStyle = shade(kit.shirt, -0.42)
  ctx.fill()

  // 3) face superior (domo) com gradiente radial (luz do canto sup. esquerdo)
  //    → topo claro/abaulado, beirada escura: volume de acrílico do botão
  const dome = ctx.createRadialGradient(
    cx - rx * 0.32, cy - ry * 0.36, rx * 0.12,
    cx, cy, rx * 1.08,
  )
  dome.addColorStop(0, shade(kit.shirt, 0.5))
  dome.addColorStop(0.5, kit.shirt)
  dome.addColorStop(1, shade(kit.shirt, -0.3))
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = dome
  ctx.fill()

  // 3b) estampa do uniforme (identidade do time) recortada no domo — sob o
  //     brilho e o número p/ não perder o aspecto de acrílico.
  // na carreira (clubes reais) o uniforme é liso; a demo usa os padrões fixos
  const pat = kitOverride || p.role === 'GK' ? 'solid' : KIT_PATTERN[p.team]
  if (pat === 'stripes') {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#f8fafc'
    const bw = rx * 0.4 // largura de cada banda
    for (const off of [-1, 1]) {
      ctx.fillRect(cx + off * bw - bw * 0.5, cy - ry, bw, ry * 2)
    }
    ctx.restore()
  } else if (pat === 'trim') {
    // anel fino na cor de acabamento, junto à borda → gola/punhos do uniforme
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.lineWidth = Math.max(1, scale * 0.16)
    ctx.strokeStyle = KIT_TRIM[p.team]
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // 4) aro do domo
  ctx.lineWidth = Math.max(1, scale * 0.12)
  ctx.strokeStyle = p.yellow
    ? '#facc15'
    : isLight(kit.shirt)
      ? 'rgba(0,0,0,0.45)'
      : 'rgba(255,255,255,0.35)'
  ctx.stroke()

  // 4b) bisel interno: anel fino claro logo dentro da borda — imita a refração
  //     na quina do acrílico, aprofundando o aspecto abaulado do domo.
  if (down < 0.6) {
    ctx.save()
    ctx.globalAlpha = (1 - down) * 0.4
    ctx.lineWidth = Math.max(1, scale * 0.1)
    ctx.strokeStyle = shade(kit.shirt, 0.55)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.82, ry * 0.82, 0, Math.PI * 0.85, Math.PI * 1.95)
    ctx.stroke()
    ctx.restore()
  }

  // 4c) braçadeira de capitão: pequeno arco dourado na quina do botão (só na demo)
  if (!kitOverride && CAPTAINS[p.team] === p.number && down < 0.5) {
    ctx.save()
    ctx.globalAlpha = 1 - down
    ctx.lineWidth = Math.max(1.5, scale * 0.36)
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.74, ry * 0.74, 0, Math.PI * 1.12, Math.PI * 1.5)
    ctx.stroke()
    ctx.restore()
  }

  // 5) brilho especular (reflexo de luz no acrílico), some quando caído
  if (down < 0.6) {
    ctx.save()
    ctx.globalAlpha = (1 - down) * 0.4
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(cx - rx * 0.3, cy - ry * 0.42, rx * 0.46, ry * 0.26, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 5b) luz de preenchimento (rim light): arco tênue na quina inferior-direita
    //     — 2ª fonte de luz do estádio, dá acabamento fotográfico ao domo.
    ctx.save()
    ctx.globalAlpha = (1 - down) * 0.2
    ctx.lineWidth = Math.max(1, scale * 0.13)
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.9, ry * 0.9, 0, Math.PI * 0.08, Math.PI * 0.46)
    ctx.stroke()
    ctx.restore()
  }

  // seta de orientação (heading): indica a direção de movimento do botão.
  if (speed > 0.6 && down < 0.4) {
    const d = norm(p.vel)
    const pl = perp(d)
    const tip = { x: cx + d.x * r * 1.4, y: cy + d.y * r * 1.4 }
    const base = { x: cx + d.x * r * 0.75, y: cy + d.y * r * 0.75 }
    ctx.globalAlpha = (1 - down) * 0.85
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(base.x + pl.x * r * 0.45, base.y + pl.y * r * 0.45)
    ctx.lineTo(base.x - pl.x * r * 0.45, base.y - pl.y * r * 0.45)
    ctx.closePath()
    ctx.fill()
  }

  // número do jogador
  ctx.globalAlpha = 1 - down * 0.4
  ctx.font = `bold ${Math.round(r * 1.05)}px "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const num = String(p.number)
  uprightLabel(ctx, cx, cy, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText(num, cx, cy + Math.max(0.6, scale * 0.06))
    ctx.fillStyle = kit.text
    ctx.fillText(num, cx, cy)
  })
  ctx.restore()

  // marca de "caído" — aparece junto com a transição
  if (down > 0.3) {
    ctx.save()
    ctx.globalAlpha = down
    ctx.fillStyle = '#ef4444'
    ctx.font = `bold ${Math.round(scale * 1.6)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✚', cx, cy - r - scale * 0.9)
    ctx.restore()
  }

}

// Nome abaixo do jogador — desenhado num passe separado ANTES dos jogadores no
// render, para os sprites ficarem sempre por cima dos nomes. Texto branco
// simples, sem fundo.
const drawPlayerName = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  px: Px,
  scale: number,
  alpha: number,
) => {
  const ip = lerpV(p.prevPos, p.pos, alpha)
  const cx = px(ip.x)
  const cy = px(ip.y)
  const r = PHYS.playerRadius * 1.55 * scale
  ctx.save()
  ctx.globalAlpha = 1 - p.downAmt * 0.5
  ctx.font = `600 ${Math.round(scale * 1.12)}px "Segoe UI", Roboto, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  // Posição do nome. No desktop fica abaixo do botão (canvas +y). No celular o
  // canvas é girado +90° no CSS, então "abaixo na tela" corresponde a canvas +x.
  const gap = r + scale * 1.9
  const lcx = labelsUpright ? cx + gap : cx
  const lcy = labelsUpright ? cy : cy + gap
  // gira o nome p/ ficar legível no celular
  uprightLabel(ctx, lcx, lcy, () => {
    ctx.fillStyle = '#fff'
    ctx.fillText(p.name, lcx, lcy)
  })
  ctx.restore()
}

const drawBall = (
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  px: Px,
  scale: number,
  alpha: number,
) => {
  const b = state.ball
  const ip = lerpV(b.prevPos, b.pos, alpha)
  // ALTURA interpolada: a bola sobe na tela (−y) e a sombra fica no gramado —
  // a separação entre as duas é o que "vende" o voo na vista de cima.
  const z = Math.max(0, b.prevZ + (b.z - b.prevZ) * alpha)
  const lift = z * scale * AIR.renderLift
  const cx = px(ip.x)
  const cyGround = px(ip.y)
  const cy = cyGround - lift
  // perspectiva: quanto mais alta, maior parece a bola (aproxima do "olho")
  const r = PHYS.ballRadius * 1.2 * scale * (1 + Math.min(z * 0.05, 0.55))

  // rastro de velocidade: em chutes/passes fortes, um "cometa" branco atrás da
  // bola vende a potência do lance. Comprimento ∝ deslocamento por passo.
  const vx = b.pos.x - b.prevPos.x
  const vy = b.pos.y - b.prevPos.y
  const segPx = Math.hypot(vx, vy) * scale
  if (segPx > r * 1.4) {
    const inv = 1 / Math.hypot(vx, vy)
    const trailLen = Math.min(segPx * 1.3, r * 11)
    const tx = cx - vx * inv * trailLen
    const ty = cy - vy * inv * trailLen
    const g = ctx.createLinearGradient(cx, cy, tx, ty)
    g.addColorStop(0, 'rgba(248,250,252,0.5)')
    g.addColorStop(1, 'rgba(248,250,252,0)')
    ctx.save()
    ctx.strokeStyle = g
    ctx.lineWidth = r * 1.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.restore()
  }

  // sombra no GRAMADO (sob o ponto da bola): encolhe e clareia conforme a bola
  // sobe — quanto mais alto o voo, menor e mais difusa a sombra lá embaixo.
  const shK = 1 / (1 + z * 0.2)
  drawShadow(ctx, cx, cyGround, r * 1.25 * shK, r * 0.75 * shK, scale * 0.34, 0.34 * shK)

  // corpo da bola: gradiente radial (luz no topo-esq., sombra embaixo-dir.)
  const body = ctx.createRadialGradient(
    cx - r * 0.35, cy - r * 0.35, r * 0.1,
    cx, cy, r * 1.05,
  )
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.7, COLORS.ball)
  body.addColorStop(1, '#c7ced8')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  // padrão de gomos rodando com `roll` — recortado no disco da bola.
  // pentágono central + manchas ao redor: leitura clássica de bola de futebol.
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(b.roll)
  ctx.fillStyle = COLORS.ballEdge
  const pent = (ox: number, oy: number, pr: number, rot: number) => {
    ctx.beginPath()
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * Math.PI * 2 - Math.PI / 2
      const x = ox + Math.cos(a) * pr
      const y = oy + Math.sin(a) * pr
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
  pent(0, 0, r * 0.34, 0) // gomo central
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2
    pent(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.2, a)
  }
  ctx.restore()

  // contorno + brilho especular fixo (não gira) no topo-esquerdo
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(1, scale * 0.07)
  ctx.strokeStyle = COLORS.ballEdge
  ctx.stroke()
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.34, cy - r * 0.34, r * 0.3, r * 0.2, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
