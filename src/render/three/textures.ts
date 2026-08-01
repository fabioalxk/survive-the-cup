import * as THREE from 'three'
import { FIELD } from '../../sim/constants'

/**
 * Texturas do estádio geradas em runtime (canvas 2D → CanvasTexture). Zero
 * arquivo de imagem: o jogo continua com bundle leve e as cores/proporções
 * ficam ligadas às constantes reais do campo (FIELD/GOAL), sem asset a
 * dessincronizar quando o motor muda.
 */

/** Canvas offscreen com contexto 2D já pronto — base de todas as texturas. */
const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

/** Ruído determinístico em [0,1) — mesma textura em toda execução (sem cintilar). */
const hash = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** CanvasTexture já configurada (sRGB para cor, linear para dados). */
const toTexture = (c: HTMLCanvasElement, color: boolean): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(c)
  if (color) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  t.needsUpdate = true
  return t
}

/**
 * Resolução da textura do gramado (px por metro). 32 = 3.1 cm por texel: a
 * linha oficial de 12 cm cabe em ~3.8 texels e finalmente lê BRANCA de perto e
 * de longe (com 20 ela ficava em 2.4 texels e o mip a diluía no verde).
 */
const PPM = 32
/**
 * Faixa de campo de jogo desenhada além das linhas laterais (m). Fonte única:
 * alimenta a textura, o plano do gramado e a pista da tigela. 9 m dá o espaço
 * real atrás do gol (com GOAL.depth 2.2 sobram ~6.8 m até a publicidade) — com
 * 5 o gol encostava no painel de LED e o campo lia como várzea comprimida.
 */
export const RUNOFF = 9

const TEX_W = Math.round((FIELD.w + RUNOFF * 2) * PPM)
const TEX_H = Math.round((FIELD.h + RUNOFF * 2) * PPM)

/** metro → pixel na textura do gramado (origem no canto do campo de jogo). */
const mx = (m: number) => (m + RUNOFF) * PPM
const my = (m: number) => (m + RUNOFF) * PPM

/**
 * Albedo do gramado: base verde + corte xadrez (faixas cruzadas), granulado,
 * áreas gastas e TODAS as marcações oficiais na escala real. É a textura que
 * dá o "tapete de transmissão"; o relevo vem do normal map separado.
 */
export const grassAlbedo = (): THREE.CanvasTexture => {
  const { c, ctx } = makeCanvas(TEX_W, TEX_H)

  // base: UM verde só. A faixa de escape é a MESMA grama do campo — o que a
  // separa é sombreamento, nunca troca de cor (com dois verdes chapados o campo
  // lia como um retângulo impresso colado sobre um tapete escuro).
  ctx.fillStyle = '#2f7040'
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  // corte do gramado: célula de ~5.25 m (padrão de transmissão), CONTÍNUO para
  // dentro da faixa de escape e com as bordas esfumadas — o rolo sobrepõe a
  // passada anterior em vez de trocar de tom num degrau de 1 px.
  const sw = (FIELD.w * PPM) / 20
  const mow = (
    step: number,
    origin: number,
    span: number,
    light: number,
    dark: number,
    vertical: boolean,
  ) => {
    const feather = (0.2 * PPM) / step // ~20 cm de sobreposição do rolo
    const last = Math.ceil((span - origin) / step)
    for (let i = Math.floor(-origin / step); i <= last; i++) {
      const a = origin + i * step
      const even = ((i % 2) + 2) % 2 === 0
      const rgb = even ? '255,255,255' : '0,0,0'
      const al = even ? light : dark
      const g = vertical
        ? ctx.createLinearGradient(a, 0, a + step, 0)
        : ctx.createLinearGradient(0, a, 0, a + step)
      g.addColorStop(0, `rgba(${rgb},0)`)
      g.addColorStop(feather, `rgba(${rgb},${al})`)
      g.addColorStop(1 - feather, `rgba(${rgb},${al})`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g
      if (vertical) ctx.fillRect(a, 0, step, TEX_H)
      else ctx.fillRect(0, a, TEX_W, step)
    }
  }
  mow(sw, mx(0), TEX_W, 0.055, 0.05, true)
  mow((FIELD.h * PPM) / 13, my(0), TEX_H, 0.03, 0.035, false)

  // faixa de escape: só um escurecimento em degradê a partir da linha (sombra
  // do muro), para o campo de jogo destacar sem nenhum degrau duro na lateral.
  const shade = (from: number, to: number, vertical: boolean) => {
    const g = vertical
      ? ctx.createLinearGradient(from, 0, to, 0)
      : ctx.createLinearGradient(0, from, 0, to)
    g.addColorStop(0, 'rgba(3,18,9,0)')
    g.addColorStop(1, 'rgba(3,18,9,0.4)')
    ctx.fillStyle = g
    const a = Math.min(from, to)
    const len = Math.abs(to - from)
    if (vertical) ctx.fillRect(a, 0, len, TEX_H)
    else ctx.fillRect(0, a, TEX_W, len)
  }
  shade(mx(0), 0, true)
  shade(mx(FIELD.w), TEX_W, true)
  shade(my(0), 0, false)
  shade(my(FIELD.h), TEX_H, false)

  // desgaste onde mais se pisa. CLIPADO ao campo de jogo (senão pintava de bege
  // a faixa de escape inteira atrás dos gols) e quebrado em manchas deslocadas:
  // um único círculo perfeito lia como vinheta, não como grama pisada.
  const wear = (cxm: number, cym: number, rxm: number, rym: number, a: number) => {
    const g = ctx.createRadialGradient(mx(cxm), my(cym), 0, mx(cxm), my(cym), rxm * PPM)
    g.addColorStop(0, `rgba(198,186,142,${a})`)
    g.addColorStop(1, 'rgba(198,186,142,0)')
    ctx.save()
    ctx.translate(mx(cxm), my(cym))
    ctx.scale(1, rym / rxm)
    ctx.translate(-mx(cxm), -my(cym))
    ctx.fillStyle = g
    ctx.fillRect(mx(cxm) - rxm * PPM, my(cym) - rxm * PPM, rxm * PPM * 2, rxm * PPM * 2)
    ctx.restore()
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(mx(0), my(0), FIELD.w * PPM, FIELD.h * PPM)
  ctx.clip()
  wear(FIELD.cx, FIELD.cy, 9, 9, 0.12)
  for (const s of [1, -1]) {
    const line = s === 1 ? 0 : FIELD.w
    wear(line + s * 5, FIELD.cy, 8, 9.5, 0.16) // boca do gol (pisada do goleiro)
    wear(line + s * 2, FIELD.cy - 1.6, 4.5, 4, 0.13) // linha, junto ao pau
    wear(line + s * 11, FIELD.cy + 1.4, 5, 4.5, 0.1) // marca do pênalti
  }
  ctx.restore()

  // granulado: lâminas curtas, MUITAS e com pouco contraste — densidade alta +
  // contraste baixo = grão de grama; poucas e claras viravam poeira sobre feltro.
  // Deitam no sentido do corte, alternando a cada faixa do rolo.
  const blades = (color: string, salt: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = PPM * 0.05
    ctx.beginPath()
    for (let i = 0; i < 90000; i++) {
      const x = hash(i, salt) * TEX_W
      const y = hash(i, salt + 1) * TEX_H
      const lean = Math.floor((x - mx(0)) / sw) % 2 === 0 ? 0.5 : -0.5
      const len = PPM * (0.14 + hash(i, salt + 2) * 0.16)
      ctx.moveTo(x, y)
      ctx.lineTo(x + lean * len, y + len)
    }
    ctx.stroke()
  }
  blades('rgba(150,200,120,0.05)', 20)
  blades('rgba(6,30,14,0.055)', 24)

  drawMarkings(ctx)
  return toTexture(c, true)
}

/** Marcações oficiais (Lei 1) desenhadas na escala real do campo. */
const drawMarkings = (ctx: CanvasRenderingContext2D) => {
  const lw = 0.12 * PPM // 12 cm, largura oficial da linha
  // branco CHEIO: com alpha o verde vazava por baixo e, no mip, a linha (sobretudo
  // a de fundo, escorçada pela perspectiva) lia cinza-esverdeada em vez de cal.
  ctx.strokeStyle = '#f8faf6'
  ctx.fillStyle = '#f8faf6'
  ctx.lineWidth = lw

  ctx.strokeRect(mx(0), my(0), FIELD.w * PPM, FIELD.h * PPM)

  ctx.beginPath()
  ctx.moveTo(mx(FIELD.cx), my(0))
  ctx.lineTo(mx(FIELD.cx), my(FIELD.h))
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(mx(FIELD.cx), my(FIELD.cy), 9.15 * PPM, 0, Math.PI * 2)
  ctx.stroke()

  const spot = (m: number, cy = FIELD.cy) => {
    ctx.beginPath()
    ctx.arc(mx(m), my(cy), 0.16 * PPM, 0, Math.PI * 2)
    ctx.fill()
  }
  spot(FIELD.cx)

  for (const left of [true, false]) {
    const sx = left ? 0 : FIELD.w
    const sgn = left ? 1 : -1
    const box = (depth: number, width: number) => {
      const x = left ? mx(0) : mx(FIELD.w) - depth * PPM
      ctx.strokeRect(x, my(FIELD.cy - width / 2), depth * PPM, width * PPM)
    }
    box(16.5, 40.32)
    box(5.5, 18.32)

    const pen = sx + sgn * 11
    spot(pen)

    // meia-lua: só o trecho do arco de 9.15 m que fica FORA da grande área
    const th = Math.acos((16.5 - 11) / 9.15)
    ctx.beginPath()
    if (left) ctx.arc(mx(pen), my(FIELD.cy), 9.15 * PPM, -th, th)
    else ctx.arc(mx(pen), my(FIELD.cy), 9.15 * PPM, Math.PI - th, Math.PI + th)
    ctx.stroke()
  }

  // arcos de escanteio (raio oficial 1 m)
  const corner = (cxm: number, cym: number, a0: number, a1: number) => {
    ctx.beginPath()
    ctx.arc(mx(cxm), my(cym), PPM, a0, a1)
    ctx.stroke()
  }
  corner(0, 0, 0, Math.PI / 2)
  corner(FIELD.w, 0, Math.PI / 2, Math.PI)
  corner(FIELD.w, FIELD.h, Math.PI, Math.PI * 1.5)
  corner(0, FIELD.h, Math.PI * 1.5, Math.PI * 2)
}

/**
 * Normal map do gramado (tile de 11 m): ondulação LARGA no passo do corte, não
 * lâmina individual. Lâmina de 1 cm num tapete que a câmera resolve a ~20 px/m
 * fica 10× acima de Nyquist — vira média cinza e o normal map só custa banda.
 * Relevo na escala que a câmera enxerga é o que gera o brilho sob os refletores.
 */
export const grassNormal = (): THREE.CanvasTexture => {
  const S = 512
  const { c, ctx } = makeCanvas(S, S)
  const img = ctx.createImageData(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      // 2 ondas por tile ≈ 5.5 m = passo do rolo; o ruído em blocos de ~34 cm
      // sobrevive ao mip e quebra a regularidade da onda.
      const wave = Math.sin((x / S) * Math.PI * 4)
      const bx = Math.floor(x / 16)
      const by = Math.floor(y / 16)
      const dx = wave * 0.5 + (hash(bx + by * S, 4) - 0.5) * 0.5
      const dy = (hash(by + bx * S, 5) - 0.5) * 0.5
      img.data[i] = 128 + dx * 127
      img.data[i + 1] = 128 + dy * 127
      img.data[i + 2] = 235
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = toTexture(c, false)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(FIELD.w / 11, FIELD.h / 11)
  return t
}

/**
 * Bola: padrão do icosaedro truncado (12 pentágonos pretos) projetado em UV
 * equiretangular. Desenhar os pentágonos por posição esférica evita a "colcha
 * de retalhos" que sai ao estampar um mapa plano numa esfera.
 */
export const ballAlbedo = (): THREE.CanvasTexture => {
  const W = 1024
  const H = 512
  const { c, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#f6f8fa'
  ctx.fillRect(0, 0, W, H)

  // centros dos 12 pentágonos = vértices de um icosaedro
  const phi = (1 + Math.sqrt(5)) / 2
  const verts: THREE.Vector3[] = []
  for (const s1 of [-1, 1])
    for (const s2 of [-1, 1]) {
      verts.push(new THREE.Vector3(0, s1, s2 * phi).normalize())
      verts.push(new THREE.Vector3(s1, s2 * phi, 0).normalize())
      verts.push(new THREE.Vector3(s2 * phi, 0, s1).normalize())
    }

  // O polo da UV equiretangular é onde a compressão é máxima — e numa câmera de
  // cima o polo é o que se vê 100% do tempo. Gira o icosaedro para o polo cair no
  // CENTRO de uma face (miolo de hexágono, bem resolvido): assim nenhum pentágono
  // sai esticado no topo (era isso que lia como uma "carinha" na bola).
  const faceUp = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(phi, 0, 2 * phi + 1).normalize(),
    new THREE.Vector3(0, 1, 0),
  )
  for (const v of verts) v.applyQuaternion(faceUp)

  const img = ctx.getImageData(0, 0, W, H)
  const p = new THREE.Vector3()
  for (let y = 0; y < H; y++) {
    const theta = (y / H) * Math.PI
    for (let x = 0; x < W; x++) {
      const lambda = (x / W) * Math.PI * 2
      p.set(
        Math.sin(theta) * Math.cos(lambda),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(lambda),
      )
      let best = -2
      for (const v of verts) best = Math.max(best, p.dot(v))
      // dentro do "casquete" ao redor do vértice → gomo escuro; borda suave = costura
      const edge = THREE.MathUtils.smoothstep(best, 0.905, 0.925)
      const seam = 1 - THREE.MathUtils.smoothstep(Math.abs(best - 0.915), 0.0, 0.012)
      const v = 246 - edge * 216 - seam * 26
      const i = (y * W + x) * 4
      img.data[i] = v
      img.data[i + 1] = v + edge * 4
      img.data[i + 2] = v + edge * 12
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(c, true)
}

/**
 * Rede do gol: alpha map de malha em losango (recorta o plano da rede). São 8
 * losangos por tile — o repeat em stadium.ts conta com isso. O tile dobrou (512)
 * e o fio caiu para 6.25% da célula: ~1 cm de corda numa malha de 16 cm, metade
 * do que era (2 cm lia como chuvisco/moiré, não como malha). Não dá para afinar
 * mais enquanto o material usar `transparent + alphaTest` sem alphaToCoverage:
 * a cobertura cai abaixo do alphaTest no mip e a rede SOME de longe.
 */
export const netAlpha = (): THREE.CanvasTexture => {
  const S = 512
  const { c, ctx } = makeCanvas(S, S)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.beginPath()
  const step = S / 8
  for (let i = -S; i <= S * 2; i += step) {
    ctx.moveTo(i, 0)
    ctx.lineTo(i + S, S)
    ctx.moveTo(i, 0)
    ctx.lineTo(i - S, S)
  }
  ctx.stroke()
  const t = toTexture(c, false)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/**
 * Arquibancada lotada: bloco de "cabeças" coloridas com variação de tom, usado
 * como textura das bancadas. Tiling alto → multidão densa sem instanciar
 * milhares de meshes.
 */
/** Lado (m) do bloco de arquibancada que a textura da torcida representa. */
export const CROWD_TILE = 22

export const crowdTexture = (): THREE.CanvasTexture => {
  const S = 1024
  const { c, ctx } = makeCanvas(S, S)
  ctx.fillStyle = '#05090f'
  ctx.fillRect(0, 0, S, S)

  // torcida noturna: maioria em tons escuros e frios, poucos pontos claros —
  // a massa lê como gente à distância e não vira uma mancha colorida.
  const shirts = [
    '#1b2536', '#26334a', '#141c2a', '#8ea3c2', '#dde6f4',
    '#33405c', '#1a2030', '#5a6b8c', '#c9d6ea', '#3d3a4e',
  ]

  /**
   * Um setor de 11 m. O tile carrega QUATRO deles, com semente e corredor em
   * colunas diferentes: o período do tiling quadruplica sem custar memória
   * relevante — antes dava para CONTAR os tiles ao longo da bancada.
   * 22 × 14 pessoas em 11 m = 0.50 × 0.79 m por torcedor (escala real): com
   * 11 × 12 cada um media 1 m e a bancada lia como cascalho meio vazio.
   */
  const sector = (ox: number, oy: number, B: number, seed: number) => {
    const cols = 22
    const rows = 14
    const cw = B / cols
    const rh = B / rows
    const aisleCol = 2 + Math.floor(hash(seed, 40) * (cols - 4))
    for (let gy = 0; gy < rows; gy++) {
      // degrau: a fileira de trás é um tico mais escura (sombra do assento)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(ox, oy + gy * rh, B, rh * 0.16)
      for (let gx = 0; gx < cols; gx++) {
        if (gx === aisleCol) continue
        const i = gy * 31 + gx + seed * 997
        if (hash(i, 14) < 0.03) continue // cadeira vazia
        const x = ox + gx * cw + cw / 2 + (hash(i, 6) - 0.5) * cw * 0.3
        const y = oy + gy * rh + rh * 0.6 + (hash(i, 7) - 0.5) * rh * 0.2
        const r = cw * (0.42 + hash(i, 8) * 0.12)
        ctx.fillStyle = shirts[Math.floor(hash(i, 9) * shirts.length)]
        ctx.beginPath()
        ctx.ellipse(x, y + r * 0.6, r * 1.0, r * 1.1, 0, 0, Math.PI * 2)
        ctx.fill()
        const skin = 100 - hash(i, 10) * 62
        ctx.fillStyle = `rgb(${skin + 22},${skin},${skin - 8})`
        ctx.beginPath()
        ctx.arc(x, y - r * 0.55, r * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // corredor de acesso: é o que dá RITMO à bancada. Os degraus precisam de
    // CONTRASTE de verdade e de um balizamento claro no piso — riscos a 5% de
    // branco sumiam no mip e sobrava só uma faixa escura igual a uma costura.
    const ax = ox + aisleCol * cw
    ctx.fillStyle = '#111c29'
    ctx.fillRect(ax, oy, cw, B)
    const sh = rh / 2
    for (let k = 0; k * sh < B; k++) {
      ctx.fillStyle = k % 2 === 0 ? 'rgba(214,228,248,0.17)' : 'rgba(0,0,0,0.32)'
      ctx.fillRect(ax, oy + k * sh, cw, sh * 0.55)
    }
    ctx.fillStyle = 'rgba(222,234,252,0.3)'
    ctx.fillRect(ax + cw * 0.08, oy, cw * 0.13, B)
    ctx.fillRect(ax + cw * 0.79, oy, cw * 0.13, B)
  }
  const B = S / 2
  for (let i = 0; i < 4; i++) sector((i % 2) * B, Math.floor(i / 2) * B, B, i + 1)

  const t = toTexture(c, true)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/**
 * Painel de LED da borda do campo. Recebe as cores dos dois times para a
 * publicidade herdar a identidade da partida em vez de um cinza genérico.
 */
export const ledTexture = (a: string, b: string): THREE.CanvasTexture => {
  const W = 2048
  const H = 128
  const { c, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#0b1730'
  ctx.fillRect(0, 0, W, H)

  const blocks = 8
  const bw = W / blocks
  for (let i = 0; i < blocks; i++) {
    ctx.fillStyle = i % 2 === 0 ? a : b
    ctx.globalAlpha = 0.85
    ctx.fillRect(i * bw + bw * 0.06, H * 0.18, bw * 0.88, H * 0.64)
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `900 ${Math.round(H * 0.4)}px Outfit, Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SURVIVE THE CUP', i * bw + bw / 2, H / 2)
  }
  // grade de pixels do painel
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H)
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
  const t = toTexture(c, true)
  t.wrapS = THREE.RepeatWrapping
  return t
}

/** Número da camisa estampado no topo do botão. */
export const numberTexture = (n: number, fg: string): THREE.CanvasTexture => {
  const S = 128
  const { c, ctx } = makeCanvas(S, S)
  ctx.clearRect(0, 0, S, S)
  ctx.font = `900 ${n > 9 ? 62 : 76}px Outfit, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.strokeText(String(n), S / 2, S / 2 + 2)
  ctx.fillStyle = fg
  ctx.fillText(String(n), S / 2, S / 2)
  const t = toTexture(c, true)
  t.premultiplyAlpha = false
  return t
}

/** Placa de nome do jogador (sprite billboard) — texto claro com contorno escuro. */
export const nameTexture = (name: string): THREE.CanvasTexture => {
  const H = 64
  const pad = 12
  const probe = makeCanvas(8, 8).ctx
  probe.font = `700 40px Inter, "Segoe UI", sans-serif`
  const w = Math.ceil(probe.measureText(name).width) + pad * 2
  const { c, ctx } = makeCanvas(w, H)
  ctx.font = `700 40px Inter, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 7
  ctx.strokeStyle = 'rgba(2,6,14,0.85)'
  ctx.strokeText(name, w / 2, H / 2)
  ctx.fillStyle = '#f2f7ff'
  ctx.fillText(name, w / 2, H / 2)
  return toTexture(c, true)
}

/** Céu noturno: degradê + estrelas, usado como fundo e base do ambiente PBR. */
export const skyTexture = (): THREE.CanvasTexture => {
  const W = 1024
  const H = 512
  const { c, ctx } = makeCanvas(W, H)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#03060f')
  g.addColorStop(0.45, '#071224')
  g.addColorStop(0.72, '#0d2038')
  g.addColorStop(1, '#132a41')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) {
    const x = hash(i, 11) * W
    const y = hash(i, 12) * H * 0.62
    const a = 0.15 + hash(i, 13) * 0.6
    ctx.fillStyle = `rgba(226,238,255,${a})`
    ctx.fillRect(x, y, 1.3, 1.3)
  }
  const t = toTexture(c, true)
  t.mapping = THREE.EquirectangularReflectionMapping
  return t
}

/** Halo suave (sprite aditivo) — luz dos refletores, brilho de gol, flashes. */
export const glowTexture = (): THREE.CanvasTexture => {
  const S = 128
  const { c, ctx } = makeCanvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return toTexture(c, true)
}

/** Sombra difusa projetada no gramado (blob sob jogador/bola). */
export const shadowTexture = (): THREE.CanvasTexture => {
  const S = 128
  const { c, ctx } = makeCanvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  // queda tardia: o miolo fica quase opaco e só some perto da borda — uma
  // mancha larga e mole vira uma sujeira cinza em vez de sombra.
  g.addColorStop(0, 'rgba(0,0,0,0.85)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.72)')
  g.addColorStop(0.75, 'rgba(0,0,0,0.24)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return toTexture(c, false)
}
