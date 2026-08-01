import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

import type { MatchState, Player } from '../../sim/types'
import { FIELD, PHYS } from '../../sim/constants'
import { CLASH_THRESHOLD, colorDist } from '../../game/kits'
import { buildBall, rollBall, type BallView } from './ball'
import { SHADOW_DIR, SPREAD } from './decals'
import { buildFx, type Fx } from './fx'
import { buildPiece, disposePiece, type KitColors, type PlayerPiece } from './players'
import { animateStadium, buildStadium, type Stadium } from './stadium'
import { skyTexture } from './textures'

/**
 * Renderer 3D da partida (ThreeJS). Recebe o MESMO `MatchState` do motor 2D e
 * o desenha num estádio real: câmera de transmissão, iluminação de refletor,
 * sombras dinâmicas, bloom e vinheta. O motor não sabe que existe 3D — a
 * conversão de coordenadas mora só aqui (sim x→X, sim y→Z, altura da bola→Y).
 */

/** Ângulo da câmera acima do gramado. Alto o bastante p/ ler a partida inteira
 *  como um tabuleiro, baixo o bastante p/ ver arquibancada, gols e volume. */
const CAM_ELEVATION = THREE.MathUtils.degToRad(62)
/** Margem do enquadramento: 1 = campo colado nas bordas. */
const FIT = 0.985
/** Bloom em jogo normal e no estouro da comemoração de gol. */
const BLOOM_IDLE = 0.16
/** Raio DESENHADO da peça do jogador — espelha o `R` de `players.ts`. */
const PIECE_R = PHYS.playerRadius * 1.5
/** Raio DESENHADO da bola — espelha o fator de exagero da esfera em `ball.ts`. */
const BALL_DRAW_R = PHYS.ballRadius * 1.55
/**
 * Diâmetro da mancha de contato do botão. Bem acima do `SPREAD` da bola de
 * propósito: a peça é larga e baixa, e com a mancha do tamanho do próprio
 * botão ela ficava inteira ESCONDIDA embaixo dele — o jogador lia como adesivo
 * chapado, sem nenhuma âncora no gramado.
 */
const PLAYER_SHADOW = PIECE_R * 4
/**
 * Ângulo do tombo. Passa do reto de propósito: em 90° a peça ficava equilibrada
 * na aresta, como uma moeda em pé; passando um pouco ela DESCANSA sobre a lateral.
 */
const FALL_ANGLE = THREE.MathUtils.degToRad(104)
const BLOOM_GOAL = 0.42
/**
 * Zona de exclusão (m) entre dois nomes na relva: elipse ALONGADA no sentido em
 * que o texto se estende. Em retrato o canvas gira 90°, então o eixo longo do
 * rótulo passa a ser o Z do mundo — sem inverter, os nomes voltavam a colidir.
 */
const LABEL_GAP = { long: 7.5, short: 2.6 }
/**
 * Vinheta MULTIPLICATIVA. A `VignetteShader` da three MISTURA a imagem com um
 * cinza (`mix(texel, 1-darkness, dot(uv,uv))`): além de apagar as duas grandes
 * áreas, ela LEVANTAVA o preto da arquibancada nos cantos (névoa leitosa).
 * Multiplicar escurece de verdade e preserva o preto.
 */
const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: 0.85 },
    darkness: { value: 0.55 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * offset;
      gl_FragColor = vec4(texel.rgb * (1.0 - darkness * dot(uv, uv)), texel.a);
    }`,
}

export interface MatchRendererOpts {
  kits: Record<'home' | 'away', KitColors>
  accents: [string, string]
}

export class MatchRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  // near ALTO de propósito: a câmera fica a ~150 m do gramado; com near=1 a
  // precisão do z-buffer lá na frente virava decímetros e os decalques rentes
  // ao chão (sombras de contato) sumiam no teste de profundidade.
  private camera = new THREE.PerspectiveCamera(30, 1.5, 30, 460)
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private stadium: Stadium
  private ball: BallView
  private fx: Fx
  private pieces = new Map<number, PlayerPiece>()
  private pmrem: THREE.PMREMGenerator
  private env: THREE.Texture
  private sky: THREE.Texture
  private kits: Record<'home' | 'away', KitColors>
  private gks: Record<'home' | 'away', KitColors>
  private camBase = new THREE.Vector3()
  // alvo adiantado em relação ao centro do gramado: como o `fitCamera` recua na
  // direção do ALVO, adiantá-lo sobe o campo no quadro. É o que corta a faixa
  // morta de teto escuro no topo (era 22% da altura) e devolve espaço à
  // arquibancada da frente, que fechava a moldura cortada crua.
  private target = new THREE.Vector3(FIELD.cx, 0, FIELD.cy + 4)
  private labelRotation = 0
  private showNames = false
  private clock = new THREE.Clock()
  private tmp = new THREE.Vector3()
  private tmpDir = new THREE.Vector2()
  private prevBall = new THREE.Vector2(FIELD.cx, FIELD.cy)
  /** direção do tombo CONGELADA por jogador (ver `updatePlayer`). */
  private falls = new Map<number, THREE.Vector2>()
  /** quanto a sombra escorre no plano por metro de altura (vem da luz-chave). */
  private shadowPerMeter = new THREE.Vector2()
  /** tamanho nativo do palco, lido do <canvas> antes do 1º `setSize` (ver `resize`). */
  private native: THREE.Vector2

  constructor(canvas: HTMLCanvasElement, opts: MatchRendererOpts) {
    this.kits = opts.kits
    this.gks = gkKits(opts.kits)
    this.native = new THREE.Vector2(canvas.width, canvas.height)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // o SMAA do composer faz o anti-serrilhado
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    })
    // pixelRatio 1 no renderer: o buffer é dado em PIXELS DE DEVICE já prontos
    // por `resize` (que precisa de controle exato dos inteiros gravados em
    // canvas.width/height). O composer copia esse ratio na construção.
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    // ambiente PBR a partir do céu noturno: dá reflexo coerente ao acrílico dos
    // botões e ao metal do pedestal sem custar uma sonda de luz por frame.
    this.sky = skyTexture()
    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.env = this.pmrem.fromEquirectangular(this.sky).texture
    this.scene.background = this.sky
    this.scene.environment = this.env
    this.scene.fog = new THREE.FogExp2('#060d18', 0.0021)

    this.stadium = buildStadium(opts.accents[0], opts.accents[1])
    this.scene.add(this.stadium.root)

    this.ball = buildBall()
    this.scene.add(this.ball.group, this.ball.shadow)

    this.fx = buildFx()
    this.fx.setColors(opts.accents[0], opts.accents[1])
    this.scene.add(this.fx.root)

    // --- luz ---
    this.scene.add(new THREE.HemisphereLight('#7fa8e6', '#0d1f14', 0.24))
    this.scene.add(new THREE.AmbientLight('#2b3d55', 0.18))

    // Chave: única direcional que projeta sombra (custo previsível). O ângulo
    // é BAIXO de propósito — com a luz quase a pino a sombra caía embaixo do
    // próprio botão e sumia; rasante, ela se estende no gramado e ancora cada
    // peça (é o que dá a sensação de volume no campo).
    const key = new THREE.DirectionalLight('#fff4dc', 3.2)
    key.position.set(FIELD.cx - 74, 54, FIELD.cy - 58)
    key.target.position.copy(this.target)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 40
    key.shadow.camera.far = 260
    const half = 82
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half })
    key.shadow.camera.updateProjectionMatrix()
    key.shadow.bias = -0.00025
    key.shadow.normalBias = 0.03
    this.scene.add(key, key.target)
    // FONTE ÚNICA do deslocamento das sombras postiças: a projeção de um ponto a
    // altura h cai a `h * (dir horizontal da luz / altura da luz)`. Antes era uma
    // constante chutada (0.8) e a mancha da bola alta descolava da sombra real.
    this.shadowPerMeter
      .set(this.target.x - key.position.x, this.target.z - key.position.z)
      .divideScalar(key.position.y - this.target.y)

    // holofote do gramado: NÃO projeta sombra (é só o "pool" de luz). É o que
    // separa o campo aceso da arquibancada em penumbra, como numa transmissão.
    const pool = new THREE.SpotLight('#fff8ea', 9000, 300, 0.95, 0.85, 2)
    pool.position.set(FIELD.cx, 78, FIELD.cy)
    pool.target.position.copy(this.target)
    this.scene.add(pool, pool.target)

    // preenchimento oposto: mata a sombra chapada sem gerar 2ª sombra
    const fill = new THREE.DirectionalLight('#bcd4f5', 0.85)
    fill.position.set(FIELD.cx + 46, 50, FIELD.cy + 42)
    fill.target.position.copy(this.target)
    this.scene.add(fill, fill.target)

    // --- pós-processamento ---
    // alvo MULTIAMOSTRADO (MSAA por hardware, WebGL2) em vez de um passe SMAA:
    // mesma nitidez de borda por uma fração do custo — o passe SMAA sozinho
    // custava mais que todo o resto do quadro.
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // raio curto e limiar alto: só LED, lâmpadas e o clarão do gol florescem. Com
    // o halo largo as linhas do gramado sangravam e o quadro ficava leitoso.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM_IDLE, 0.45, 0.95)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    // vinheta DEPOIS do OutputPass: em espaço linear o `darkness` extrapola a
    // cor para valores negativos e a conversão p/ sRGB devolve lixo (manchas
    // magenta nos cantos escuros).
    this.composer.addPass(new ShaderPass(vignetteShader))

    this.resize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height)
  }

  /** Ajusta buffers e reenquadra a câmera para o novo tamanho de exibição. */
  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return
    // O buffer é sempre um MÚLTIPLO INTEIRO do tamanho nativo do palco, então a
    // proporção intrínseca do <canvas> (width/height) NUNCA muda. É obrigatório:
    // o CSS deriva a dimensão livre do canvas justamente dessa proporção, e uma
    // proporção diferente a cada quadro realimentava o ResizeObserver para
    // sempre — como todo `setSize` LIMPA o drawing buffer, em retrato (dpr 2) a
    // tela ficava 100% preta. Arredondar w/h em px não bastava: o `floor` do
    // pixelRatio mudava a proporção de novo.
    // `false`: NÃO mexe no style do canvas — quem manda no tamanho exibido é o CSS.
    const pr = Math.min(devicePixelRatio || 1, 1.5)
    const k = Math.max(1, Math.round((w * pr) / this.native.x))
    const bw = this.native.x * k
    const bh = this.native.y * k
    this.renderer.setSize(bw, bh, false)
    this.composer.setSize(bw, bh)
    this.bloom.setSize(bw, bh)
    this.camera.aspect = bw / bh
    this.fitCamera()
  }

  /**
   * Posiciona a câmera na direção fixa de transmissão e recua até TODO o campo
   * (mais a faixa de escape) caber no enquadramento. Iterativo: projeta os
   * cantos e corrige a distância — robusto para qualquer proporção de tela.
   */
  private fitCamera(): void {
    const dir = new THREE.Vector3(
      0,
      Math.sin(CAM_ELEVATION),
      Math.cos(CAM_ELEVATION),
    ).normalize()
    const m = 5
    const corners: THREE.Vector3[] = []
    for (const x of [-m, FIELD.w + m])
      for (const z of [-m, FIELD.h + m]) for (const y of [0, 3]) corners.push(new THREE.Vector3(x, y, z))

    let dist = 150
    for (let i = 0; i < 12; i++) {
      this.camera.position.copy(this.target).addScaledVector(dir, dist)
      this.camera.lookAt(this.target)
      this.camera.updateMatrixWorld(true)
      this.camera.updateProjectionMatrix()
      let worst = 0
      for (const c of corners) {
        this.tmp.copy(c).project(this.camera)
        worst = Math.max(worst, Math.abs(this.tmp.x), Math.abs(this.tmp.y))
      }
      if (worst < 1e-4) break
      dist *= worst / FIT
    }
    this.camBase.copy(this.camera.position)
  }

  /** Nomes dos jogadores flutuando sobre os botões. */
  setShowNames(v: boolean): void {
    this.showNames = v
    for (const p of this.pieces.values()) p.label.visible = v
  }

  /**
   * Em retrato o <canvas> é girado 90° no CSS; contragira números e nomes p/
   * continuarem legíveis na horizontal (mesmo contrato do renderer 2D).
   */
  setLabelsUpright(v: boolean): void {
    this.labelRotation = v ? Math.PI / 2 : 0
    for (const p of this.pieces.values()) {
      p.labelMat.rotation = this.labelRotation
      p.numberMesh.rotation.z = this.labelRotation
    }
  }

  /** Troca as cores dos uniformes em cena (partida nova sem recriar o estádio). */
  setKits(kits: Record<'home' | 'away', KitColors>): void {
    this.kits = kits
    this.gks = gkKits(kits)
    this.disposePieces()
  }

  private pieceFor(p: Player): PlayerPiece {
    const found = this.pieces.get(p.id)
    if (found) return found
    const kit = p.role === 'GK' ? this.gks[p.team] : this.kits[p.team]
    const piece = buildPiece(p, kit, this.labelRotation)
    piece.label.visible = this.showNames
    piece.labelMat.rotation = this.labelRotation
    this.scene.add(piece.group)
    this.pieces.set(p.id, piece)
    return piece
  }

  /** Desenha um frame. `alpha` = fração do passo já decorrida (interpolação). */
  render(state: MatchState, alpha: number): void {
    const t = this.clock.getElapsedTime()
    const cel = state.celebration

    for (const p of state.players) this.updatePlayer(p, alpha, cel)
    if (this.showNames) this.layoutLabels(state.players)
    this.updateBall(state, alpha)

    animateStadium(this.stadium, t)

    // rede do gol sofrido pulsa na cor de quem marcou
    for (const side of ['left', 'right'] as const) {
      const mat = this.stadium.nets[side]
      const hit = cel && (cel.goalX === 0) === (side === 'left')
      if (hit) {
        const pulse = 0.5 + 0.5 * Math.sin(cel!.t * 9)
        mat.color.set(this.kits[cel!.team].shirt)
        mat.emissive?.set(this.kits[cel!.team].shirt)
        mat.emissiveIntensity = 0.35 + pulse * 0.5
      } else {
        mat.color.set('#eef3fb')
        mat.emissiveIntensity = 0
      }
    }

    this.tmp.set(state.ball.pos.x, Math.max(0.4, state.ball.z), state.ball.pos.y)
    this.fx.update(cel ? cel.t : null, this.tmp)
    this.bloom.strength = cel ? BLOOM_GOAL : BLOOM_IDLE
    for (const s of this.stadium.floodGlow) s.material.opacity = cel ? 0.8 : 0.55

    // tremor de câmera no impacto do gol, decaindo em ~0.45 s
    this.camera.position.copy(this.camBase)
    if (cel) {
      const k = Math.max(0, 1 - cel.t / 0.45)
      if (k > 0) {
        const amp = 0.55 * k * k
        this.camera.position.x += Math.sin(cel.t * 92) * amp
        this.camera.position.y += Math.cos(cel.t * 78) * amp
      }
    }
    this.camera.lookAt(this.target)

    this.composer.render()
  }

  private updatePlayer(p: Player, alpha: number, cel: MatchState['celebration']): void {
    const piece = this.pieceFor(p)
    const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha
    const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha

    // pulo de comemoração: só o time que marcou, e só quem está de pé
    const hop =
      cel && p.team === cel.team && p.role !== 'GK' && p.downAmt < 0.5
        ? Math.abs(Math.sin(cel.t * 7 + p.id)) * 0.55
        : 0

    piece.group.position.set(x, hop, z)

    // Tombo: a peça gira em torno da base no eixo perpendicular à direção da
    // queda. A direção é CONGELADA no quadro em que o jogador cai — relida de
    // `vel` a cada quadro, a peça deitada rodopiava sozinha ao levantar. Sem
    // velocidade (já no chão) ela vem do id, senão os 22 caem para o mesmo lado.
    const down = p.downAmt
    let dir = this.falls.get(p.id)
    if (down < 0.001) {
      if (dir) this.falls.delete(p.id)
      dir = undefined
      piece.tilt.rotation.set(0, 0, 0)
    } else {
      if (!dir) {
        const sp = Math.hypot(p.vel.x, p.vel.y)
        const a = sp > 0.05 ? Math.atan2(p.vel.y, p.vel.x) : p.id * 2.399
        dir = new THREE.Vector2(Math.cos(a), Math.sin(a))
        this.falls.set(p.id, dir)
      }
      const ang = down * FALL_ANGLE
      piece.tilt.rotation.set(dir.y * ang, 0, -dir.x * ang)
    }

    // Mancha de contato. Vive no espaço do `group`, então acompanha o tombo na
    // mão: o corpo deitado se afasta ~R do pivô e, parada no pivô, a mancha
    // deixava o caído boiando sem sombra nenhuma.
    const sk = 1 - hop * 0.22 // no pulo a peça sobe e a mancha encolhe
    const lay = dir ? Math.sin(down * FALL_ANGLE) * PIECE_R : 0
    const dx = dir ? dir.x : 0
    const dz = dir ? dir.y : 0
    piece.shadow.position.set(
      SHADOW_DIR.x * PIECE_R * 1.1 + dx * lay,
      0.04,
      SHADOW_DIR.y * PIECE_R * 1.1 + dz * lay,
    )
    piece.shadow.rotation.z = dir ? Math.atan2(-dz, dx) : 0
    piece.shadow.scale.set(PLAYER_SHADOW * sk * (1 + down * 0.45), PLAYER_SHADOW * sk, 1)
    // mais densa que a da bola: só o anel que sobra do botão aparece, e com o
    // valor antigo a peça continuava lendo como adesivo chapado no gramado
    piece.shadowMat.opacity = 0.78 * sk * (1 - down * 0.35)

    // aro: dono da bola (amarelo) ou cartão amarelo pendurado (âmbar fraco)
    const ctrl = p.ctrlAmt * (1 - down)
    piece.ringMat.opacity = Math.max(ctrl * 0.9, p.yellow ? 0.28 : 0)
    piece.ringMat.color.set(ctrl > 0.02 ? '#fde047' : '#f59e0b')

    // número apaga por fade enquanto a peça tomba (o corte binário estalava)
    const numberMat = piece.numberMesh.material as THREE.Material
    numberMat.opacity = THREE.MathUtils.clamp((0.85 - down) / 0.25, 0, 1)
  }

  /**
   * Um nome por região: em aglomeração (escanteio, bola parada) dois rótulos
   * vizinhos viravam um borrão ilegível. Esconde o de quem já tem um nome
   * colado — a elipse é larga em X porque o texto é deitado.
   */
  private layoutLabels(players: Player[]): void {
    const shown: THREE.Vector3[] = []
    for (const p of players) {
      const piece = this.pieces.get(p.id)
      if (!piece) continue
      const at = piece.group.position
      const upright = this.labelRotation !== 0
      const clash = shown.some((s) => {
        const dx = (s.x - at.x) / (upright ? LABEL_GAP.short : LABEL_GAP.long)
        const dz = (s.z - at.z) / (upright ? LABEL_GAP.long : LABEL_GAP.short)
        return dx * dx + dz * dz < 1
      })
      piece.label.visible = !clash
      if (!clash) shown.push(at)
    }
  }

  private updateBall(state: MatchState, alpha: number): void {
    const b = state.ball
    let x = b.prevPos.x + (b.pos.x - b.prevPos.x) * alpha
    let z = b.prevPos.y + (b.pos.y - b.prevPos.y) * alpha
    const h = Math.max(0, b.prevZ + (b.z - b.prevZ) * alpha)

    // POSE de apresentação (a sim segue intocada): a bola rasteira de quem
    // conduz fica no CENTRO do jogador, e a esfera desenhada — exagerada para
    // ser vista de cima — sumia dentro do domo de acrílico, virando um adesivo
    // sobre o número. Aqui ela é apresentada ENCOSTADA na borda da peça, no
    // sentido em que o jogador corre. Bola alta passa por cima e não é tocada.
    const reach = PIECE_R + BALL_DRAW_R
    if (h < 0.9) {
      let near: Player | undefined
      let best = reach * reach
      for (const p of state.players) {
        const d = (p.pos.x - x) ** 2 + (p.pos.y - z) ** 2
        if (d < best) {
          best = d
          near = p
        }
      }
      if (near) {
        const ox = near.prevPos.x + (near.pos.x - near.prevPos.x) * alpha
        const oz = near.prevPos.y + (near.pos.y - near.prevPos.y) * alpha
        // radial enquanto a bola tem lado; no centro (conduzindo) vale a
        // direção da corrida, senão a da própria bola
        const d = this.tmpDir.set(x - ox, z - oz)
        if (d.lengthSq() < 0.09) d.set(near.vel.x, near.vel.y)
        if (d.lengthSq() < 1e-4) d.set(b.vel.x, b.vel.y)
        if (d.lengthSq() < 1e-4) d.set(1, 0)
        d.normalize().multiplyScalar(reach)
        x = ox + d.x
        z = oz + d.y
      }
    }

    this.ball.group.position.set(x, BALL_DRAW_R + h, z)
    // a sombra fica no GRAMADO e encolhe/clareia conforme a bola sobe — é a
    // separação entre as duas que "vende" o voo numa câmera de cima.
    const shK = 1 / (1 + h * 0.16)
    const sh = this.shadowPerMeter
    this.ball.shadow.position.set(x + sh.x * h, 0.02, z + sh.y * h)
    this.ball.shadow.scale.setScalar(BALL_DRAW_R * SPREAD * shK)
    this.ball.shadowMat.opacity = 0.62 * shK

    const dx = x - this.prevBall.x
    const dz = z - this.prevBall.y
    rollBall(this.ball, dx, dz)
    this.prevBall.set(x, z)

    // Rastro: só em lances fortes. É um sprite de TELA, então o alongamento tem
    // que seguir o deslocamento PROJETADO (sem isso o borrão era sempre
    // horizontal) e o âncora vai para a frente da bola, deixando o borrão ATRÁS.
    const speed = Math.hypot(b.pos.x - b.prevPos.x, b.pos.y - b.prevPos.y) * 60
    const k = THREE.MathUtils.clamp((speed - 14) / 26, 0, 1)
    this.ball.trailMat.opacity = k * 0.5
    this.ball.trail.scale.set(1.2 + k * 3.4, 1.2 + k * 1.2, 1)
    if (k > 0 && Math.hypot(dx, dz) > 1e-3) {
      const y = BALL_DRAW_R + h
      this.tmp.set(x, y, z).project(this.camera)
      const px = this.tmp.x
      const py = this.tmp.y
      this.tmp.set(x - dx, y, z - dz).project(this.camera)
      this.ball.trailMat.rotation = Math.atan2(py - this.tmp.y, (px - this.tmp.x) * this.camera.aspect)
      this.ball.trail.center.set(0.86, 0.5)
    }
  }

  private disposePieces(): void {
    for (const piece of this.pieces.values()) {
      this.scene.remove(piece.group)
      disposePiece(piece)
    }
    this.pieces.clear()
    this.falls.clear()
  }

  dispose(): void {
    this.disposePieces()
    this.stadium.dispose()
    this.ball.dispose()
    this.fx.dispose()
    this.env.dispose()
    this.sky.dispose()
    this.pmrem.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}

/**
 * Uniformes de goleiro: por regra real, o GK precisa contrastar com AS DUAS
 * camisas de linha E com o outro goleiro — girar o matiz só do próprio time
 * (como era) devolvia, com o Brasil, um ciano igualzinho ao da Argentina. Gira
 * o matiz em passos e para no 1º que passa no MESMO limiar de conflito usado
 * pelo resto do jogo (`kits.ts`), em vez de reimplementar cor aqui.
 */
const gkKits = (kits: Record<'home' | 'away', KitColors>): Record<'home' | 'away', KitColors> => {
  const taken = [kits.home.shirt, kits.away.shirt]
  const out = {} as Record<'home' | 'away', KitColors>
  const c = new THREE.Color()
  const hsl = { h: 0, s: 0, l: 0 }
  for (const team of ['home', 'away'] as const) {
    c.set(kits[team].shirt).getHSL(hsl)
    let shirt = ''
    for (let i = 0; i < 12; i++) {
      c.setHSL((hsl.h + 0.45 + i / 12) % 1, Math.max(0.55, hsl.s), 0.42)
      shirt = `#${c.getHexString()}`
      if (taken.every((t) => colorDist(t, shirt) >= CLASH_THRESHOLD)) break
    }
    taken.push(shirt)
    out[team] = { shirt, shorts: shirt, socks: shirt, text: '#f8fafc' }
  }
  return out
}
