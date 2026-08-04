import * as THREE from 'three'
import { FIELD, GOAL } from '../../sim/constants'
import {
  fitTiles,
  pathLength,
  profileLength,
  roundedRectPath,
  sweepRing,
  type ProfilePoint,
} from './bowl'
import {
  crowdTexture,
  CROWD_TILE,
  glowTexture,
  grassAlbedo,
  grassNormal,
  ledTexture,
  netAlpha,
  RUNOFF,
} from './textures'

/**
 * O estádio: gramado, gols, painéis de LED, a tigela de arquibancada com
 * torcida e cobertura, e os refletores. Tudo estático — montado uma vez e só
 * animado por textura (LED rolando, flâmulas ao vento, halo pulsando no gol).
 */

/** Faixa entre a linha lateral e o muro da arquibancada (m). */
const TRACK = RUNOFF
/** Meia-planta da tigela (o muro fica a TRACK da linha). */
const HALF_X = FIELD.w / 2 + TRACK
const HALF_Z = FIELD.h / 2 + TRACK
/**
 * Raio das curvas dos cantos da tigela. Precisa ser PEQUENO o bastante para a
 * curva nunca entrar no retângulo do campo NEM estrangular a faixa de escape:
 * com 13 m a curva chegava a 1.7 m do arco de escanteio (a faixa mudava de
 * largura do meio para o canto); com 8 m ela nunca fica a menos de ~3.8 m.
 */
const CORNER_R = 8

export interface Stadium {
  root: THREE.Group
  led: THREE.MeshStandardMaterial[]
  floodGlow: THREE.Sprite[]
  /** pivôs das flâmulas (Group), girados no update */
  flags: THREE.Object3D[]
  nets: { left: THREE.MeshStandardMaterial; right: THREE.MeshStandardMaterial }
  dispose: () => void
}

/**
 * Passo do degrau medido AO LONGO do perfil (m). O tile da torcida encaixa
 * inteiro em cada bandeja (~15-16 m) e pinta 28 fileiras nesse trecho, ou seja
 * ~0.55 m por fileira: com 1.2 m cada degrau físico vale ~2 fileiras pintadas.
 * Com os 7 degraus antigos eram 4 fileiras por degrau e a serrilha da
 * geometria não caía em fileira nenhuma — virava só mais uma frequência de
 * ruído concorrendo com a textura.
 */
const STEP_ARC = 1.2

/**
 * Perfil serrilhado de uma bandeja: alterna piso e espelho de degrau. Uma
 * rampa lisa não tem silhueta de fileira nenhuma — a torcida vira um adesivo
 * chapado; é o degrau que devolve volume e sombra à arquibancada.
 */
const steppedTier = (
  fromOut: number,
  fromY: number,
  toOut: number,
  toY: number,
): ProfilePoint[] => {
  const rows = Math.max(1, Math.round((toOut - fromOut + (toY - fromY)) / STEP_ARC))
  const dOut = (toOut - fromOut) / rows
  const dY = (toY - fromY) / rows
  const pts: ProfilePoint[] = []
  for (let i = 0; i < rows; i++) {
    pts.push({ out: fromOut + dOut * i, y: fromY + dY * i }) // piso do degrau
    pts.push({ out: fromOut + dOut * (i + 1), y: fromY + dY * i }) // espelho
  }
  pts.push({ out: toOut, y: toY })
  return pts
}

/** Bandeja inferior: do muro de frente até o corredor. */
const LOWER: ProfilePoint[] = [
  { out: 0.0, y: 1.9 }, // topo do muro de frente
  ...steppedTier(1.6, 2.4, 10.0, 8.6),
]
/**
 * Corredor: parapeito + piso de concreto. É o que SEPARA as duas bandejas —
 * varrendo a mesma torcida do muro ao topo a tigela lia como uma parede única.
 * Parapeito de 2.5 m e piso de 3.5 m porque a câmera é alta e rasante: com
 * 1.2/2.0 a faixa projetava 2-3 px e continuava fundida no ruído da torcida.
 */
const CONCOURSE: ProfilePoint[] = [
  { out: 10.0, y: 8.6 },
  { out: 10.0, y: 11.1 }, // parapeito da bandeja inferior
  { out: 13.5, y: 11.1 }, // piso do corredor
  { out: 14.3, y: 11.7 }, // arranque da bandeja superior
]
/** Bandeja superior. */
const UPPER: ProfilePoint[] = steppedTier(14.3, 11.7, 22.0, 18.6)

/** Estrutura: muro da frente + casca externa fechando a tigela por trás. */
const SHELL: ProfilePoint[] = [
  { out: 0, y: 0 },
  { out: 0, y: 1.9 },
]
/**
 * Fachada externa. Os ressaltos horizontais existem para a casca NÃO fundir
 * com o chão: cada patamar vira uma faixa clara sob a luz de chave e a
 * traseira do estádio deixa de ser uma mancha preta chapada no rodapé.
 */
const BACK: ProfilePoint[] = [
  { out: 22.0, y: 18.6 },
  { out: 23.8, y: 19.4 }, // coroamento
  { out: 23.8, y: 13.6 },
  { out: 22.9, y: 13.0 },
  { out: 22.9, y: 7.4 },
  { out: 23.8, y: 6.8 },
  { out: 23.8, y: 1.6 },
  { out: 22.6, y: 0 }, // base em talude, encosta no terreno
]
/** Beiral interno da cobertura — a aresta que a câmera vê contra o gramado. */
const ROOF_EDGE: ProfilePoint = { out: 8.0, y: 21.2 }
/**
 * Cobertura: avança do topo da bandeja superior para dentro, sobre a torcida.
 * Arranca do PRÓPRIO coroamento da fachada (23.8/19.4): flutuando em 23.5/21.5
 * sobravam 2.1 m de vão aberto entre fachada e teto, por onde o céu vazava
 * para dentro da tigela.
 */
const ROOF: ProfilePoint[] = [
  { out: 23.8, y: 19.4 },
  { out: 22.6, y: 22.6 }, // aresta externa alta: silhueta contra o céu
  { out: 18.0, y: 22.2 },
  ROOF_EDGE,
  { out: 8.5, y: 20.5 }, // testeira: dobra que marca o beiral com uma linha escura
]
/**
 * Fita luminosa na borda da cobertura. Fica na FACE DE CIMA do beiral porque a
 * câmera é alta (58°): uma faixa quase vertical não tem área projetada nenhuma
 * nas retas e só aparecia como um risco de 1 px nos cantos.
 */
const RIBBON: ProfilePoint[] = [
  { out: ROOF_EDGE.out, y: ROOF_EDGE.y + 0.06 },
  { out: ROOF_EDGE.out + 0.35, y: ROOF_EDGE.y + 0.1 },
]
/** Anel de LED: um pouco DENTRO do muro, acompanhando a planta da tigela. */
const LED: ProfilePoint[] = [
  { out: -1.2, y: 0.03 },
  { out: -1.2, y: 0.98 },
]

const bowlPath = () => roundedRectPath(FIELD.cx, FIELD.cy, HALF_X, HALF_Z, CORNER_R, 14)

/**
 * Um gol completo: postes + travessão + suportes traseiros e a rede em cinco
 * panos. `sign` = -1 no gol esquerdo (x=0), +1 no direito (x=FIELD.w).
 */
const buildGoal = (sign: -1 | 1, netMat: THREE.MeshStandardMaterial): THREE.Group => {
  const g = new THREE.Group()
  const lineX = sign === -1 ? 0 : FIELD.w
  const backX = lineX + sign * GOAL.depth
  const midX = (lineX + backX) / 2
  const halfW = GOAL.width / 2
  // 9.5 cm: um tubo de 6 cm dava ~2 px na tela, sem gradiente ao longo da
  // seção — a trave lia como um fio da própria rede.
  const R = 0.095

  const frameMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.18,
    metalness: 0.5, // o ambiente PBR do céu gera o realce que faz ler metal
  })
  /**
   * Só postes e travessão projetam. O shadow map dá ~8 cm por texel: as barras
   * traseiras (R*0.55 = 10.5 cm) não cabem em um texel e saíam dilatadas em
   * barras pretas 3-4x mais grossas que o tubo — sombra descolada do corpo.
   */
  const framePart = (geo: THREE.BufferGeometry, cast = false) => {
    const m = new THREE.Mesh(geo, frameMat)
    m.castShadow = cast
    return m
  }
  const post = (z: number) => {
    const m = framePart(new THREE.CylinderGeometry(R, R, GOAL.height, 16), true)
    m.position.set(lineX, GOAL.height / 2, z)
    return m
  }
  g.add(post(FIELD.cy - halfW), post(FIELD.cy + halfW))

  const bar = framePart(new THREE.CylinderGeometry(R, R, GOAL.width + R * 2, 16), true)
  bar.rotation.x = Math.PI / 2
  bar.position.set(lineX, GOAL.height, FIELD.cy)
  g.add(bar)

  // barras traseiras (pé e topo da rede) — o "esqueleto" do gol real
  for (const s of [-1, 1]) {
    const rail = framePart(new THREE.CylinderGeometry(R * 0.55, R * 0.55, GOAL.depth, 10))
    rail.rotation.z = Math.PI / 2
    rail.position.set(midX, 0.05, FIELD.cy + s * halfW)
    g.add(rail)
  }
  const backPostH = GOAL.height * 0.55
  for (const s of [-1, 1]) {
    const bp = framePart(new THREE.CylinderGeometry(R * 0.55, R * 0.55, backPostH, 10))
    bp.position.set(backX, backPostH / 2, FIELD.cy + s * halfW)
    g.add(bp)
  }

  /**
   * Rede: UM material por gol (é ele que index.ts pulsa na cor de quem marcou)
   * e o passo da malha vai na UV da GEOMETRIA — clonar material+alphaMap por
   * pano deixava o pulso preso num material sem mesh e vazava as texturas.
   * A alphaMap tem 8 losangos por tile.
   */
  const MESH = 0.16 // lado do losango da malha (m)
  const TILE = 1 / (MESH * 8) // tiles de alphaMap por metro
  /**
   * Nenhum pano projeta sombra: o shadow map dá ~8 cm por texel e a malha tem
   * 16 cm, então os 5 panos degeneravam num paralelogramo preto sólido no
   * gramado — lia como um buraco, não como sombra. Quem ancora o gol é o frame.
   */
  const netMesh = (geo: THREE.BufferGeometry) => new THREE.Mesh(geo, netMat)
  const netPlane = (w: number, h: number) => {
    const geo = new THREE.PlaneGeometry(w, h)
    const uv = geo.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * w * TILE, uv.getY(i) * h * TILE)
    return netMesh(geo)
  }

  const back = netPlane(GOAL.width, backPostH)
  back.position.set(backX, backPostH / 2, FIELD.cy)
  back.rotation.y = sign * (Math.PI / 2)
  g.add(back)

  // laterais TRAPEZOIDAIS: retângulos de altura cheia deixavam 1.1 m de rede
  // boiando acima do poste traseiro e a gaiola virava uma caixa retangular.
  const xf = -sign * (GOAL.depth / 2) // linha do gol
  const xb = sign * (GOAL.depth / 2) // fundo
  for (const s of [-1, 1]) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [xf, 0, 0, xb, 0, 0, xb, backPostH, 0, xf, GOAL.height, 0],
        3,
      ),
    )
    const u = GOAL.depth * TILE
    const v = GOAL.height * TILE
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute([0, 0, u, 0, u, (backPostH / GOAL.height) * v, 0, v], 2),
    )
    geo.setIndex([0, 1, 2, 0, 2, 3])
    geo.computeVertexNormals()
    const side = netMesh(geo)
    side.position.set(midX, 0, FIELD.cy + s * halfW)
    g.add(side)
  }

  // teto da rede: cai do travessão até o topo do poste traseiro. O sinal do
  // caimento estava invertido — o pano mergulhava 1.1 m abaixo do travessão
  // bem na boca do gol e subia acima do poste traseiro.
  const slopeLen = Math.hypot(GOAL.depth, GOAL.height - backPostH)
  const top = netPlane(slopeLen, GOAL.width)
  top.rotation.x = -Math.PI / 2
  top.rotation.y = sign * Math.atan2(GOAL.height - backPostH, GOAL.depth)
  top.position.set(midX, (GOAL.height + backPostH) / 2, FIELD.cy)
  g.add(top)

  return g
}

/** Bandeirinhas de escanteio (a flâmula treme no update). */
const buildCornerFlags = (): { group: THREE.Group; flags: THREE.Object3D[] } => {
  const group = new THREE.Group()
  const flags: THREE.Object3D[] = []
  const poleMat = new THREE.MeshStandardMaterial({ color: '#eef3f9', roughness: 0.35 })
  /**
   * A luz de chave é rasante e bate de raspão num pano vertical: o vermelho
   * saía em 11% do valor do material (uma cunha preta de 5 px). O emissive dá
   * ao pano luz própria e devolve a cor da flâmula independente da chave.
   */
  const clothMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.5,
    roughness: 0.8,
    side: THREE.DoubleSide,
  })
  for (const cx of [0, FIELD.w])
    for (const cz of [0, FIELD.h]) {
      // mastro e flâmula em escala VISUAL: a 5.6 cm o mastro era sub-pixel e
      // sumia. 9 cm de raio (mesma escala já aplicada à trave) dá ~2 texels de
      // shadow map, então a bandeirinha finalmente encosta no gramado.
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), poleMat)
      pole.position.set(cx, 0.75, cz)
      pole.castShadow = true
      group.add(pole)
      const pivot = new THREE.Group()
      pivot.position.set(cx, 1.3, cz)
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.45), clothMat)
      cloth.position.x = (cx === 0 ? 1 : -1) * 0.325
      // tira o pano da vertical: assim a normal aponta para cima e pega a
      // chave (que vem de y=54) em vez de ficar de raspão.
      cloth.rotation.x = -0.26
      cloth.castShadow = true
      pivot.add(cloth)
      group.add(pivot)
      flags.push(pivot)
    }
  return { group, flags }
}

/**
 * Iluminação embutida na borda da cobertura (padrão dos estádios modernos):
 * uma fileira de holofotes voltados para o gramado ao longo de todo o anel.
 * Fica DENTRO do enquadramento — torres de canto ficavam fora da tela, então
 * o estádio parecia iluminado por lugar nenhum.
 */
const buildRoofLights = (
  path: THREE.Vector2[],
  glow: THREE.Texture,
  strutMat: THREE.Material,
): { group: THREE.Group; sprites: THREE.Sprite[] } => {
  const g = new THREE.Group()
  const sprites: THREE.Sprite[] = []
  const housing = new THREE.MeshStandardMaterial({
    color: '#0b1119',
    roughness: 0.5,
    metalness: 0.6,
    // a caixa também acende: de perfil (nas retas) o halo do sprite some e sem
    // isso o estádio ficava iluminado por lugar nenhum justamente ali.
    emissive: '#fff3d4',
    emissiveIntensity: 0.35,
  })
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fffaec', toneMapped: false })
  const aim = new THREE.Vector3(FIELD.cx, 0, FIELD.cy)

  const every = 3 // um holofote a cada 3 pontos do caminho (~6 m)
  for (let i = 0; i < path.length; i += every) {
    const p = path[i]
    // recua para a borda interna da cobertura e sobe até ela
    const inward = new THREE.Vector3(FIELD.cx - p.x, 0, FIELD.cy - p.y).normalize()
    const pos = new THREE.Vector3(p.x, ROOF_EDGE.y - 0.9, p.y).addScaledVector(inward, -ROOF_EDGE.out)

    // a caixa recua no próprio eixo de mira: a lâmpada fica ENCOSTADA na face
    // da frente dela, em vez de a caixa flutuar deslocada do halo.
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.9), housing)
    box.position.copy(pos)
    box.lookAt(aim)
    box.translateZ(-0.46)
    g.add(box)

    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), lampMat)
    lamp.position.copy(pos)
    lamp.lookAt(aim)
    g.add(lamp)

    // mão-francesa: a marquise avança 15 m em balanço: sem nenhuma peça sob ela
    // a cobertura lê como uma placa flutuando sobre a arquibancada.
    const foot = new THREE.Vector3(p.x, BACK[0].y, p.y).addScaledVector(inward, -BACK[0].out)
    // encosta na face de baixo da cobertura: pendurada abaixo dela a peça
    // viraria um tirante flutuando, que é o defeito que ela veio corrigir.
    const head = new THREE.Vector3(p.x, ROOF_EDGE.y + 0.1, p.y).addScaledVector(
      inward,
      -(ROOF_EDGE.out + 2.5),
    )
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, foot.distanceTo(head)),
      strutMat,
    )
    strut.position.lerpVectors(foot, head, 0.5)
    strut.lookAt(head)
    g.add(strut)

    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: '#fff3d4',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.32,
      }),
    )
    s.position.copy(pos)
    // 4.2 m de halo mole viravam bolas de algodão empilhadas na borda do teto
    // (lia como dedada na lente); 1.8 m é da ordem da própria luminária.
    s.scale.setScalar(1.8)
    g.add(s)
    sprites.push(s)
  }
  return { group: g, sprites }
}

/** Monta o estádio inteiro e devolve os handles animáveis. */
export const buildStadium = (accentA: string, accentB: string): Stadium => {
  const root = new THREE.Group()
  const owned: { dispose: () => void }[] = []
  const keep = <T extends { dispose: () => void }>(x: T): T => (owned.push(x), x)

  // --- terreno em volta ---
  // sem isto, abaixo da linha do horizonte aparecia o céu (a esfera de fundo),
  // e o estádio ficava "flutuando" numa faixa cinza no rodapé do enquadramento.
  const ground = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(900, 900)),
    keep(new THREE.MeshStandardMaterial({ color: '#070b12', roughness: 1 })),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(FIELD.cx, -0.06, FIELD.cy)
  root.add(ground)

  // --- gramado + pista de escape ---
  const grassMat = keep(
    new THREE.MeshStandardMaterial({
      map: keep(grassAlbedo()),
      normalMap: keep(grassNormal()),
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.93,
      metalness: 0,
    }),
  )
  const pitch = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(FIELD.w + RUNOFF * 2, FIELD.h + RUNOFF * 2)),
    grassMat,
  )
  pitch.rotation.x = -Math.PI / 2
  pitch.position.set(FIELD.cx, 0, FIELD.cy)
  pitch.receiveShadow = true
  root.add(pitch)

  // --- gols e redes ---
  const alpha = keep(netAlpha())
  const mkNet = () =>
    keep(
      new THREE.MeshStandardMaterial({
        color: '#f2f6fc',
        emissive: '#000000',
        alphaMap: alpha,
        transparent: true,
        opacity: 0.9,
        alphaTest: 0.28,
        side: THREE.DoubleSide,
        roughness: 0.85,
      }),
    )
  const nets = { left: mkNet(), right: mkNet() }
  root.add(buildGoal(-1, nets.left), buildGoal(1, nets.right))

  const cf = buildCornerFlags()
  root.add(cf.group)

  const path = bowlPath()
  // o caminho é FECHADO: o tile precisa fechar um número inteiro de vezes no
  // perímetro, senão a emenda cai fora de fase e sobra uma costura vertical.
  const perimeter = pathLength(path)

  // --- anel de LED rente ao muro ---
  // um anel único acompanhando a planta da tigela: com 4 placas retas soltas as
  // pontas não se encontravam e sobrava um vão preto aberto em cada quina.
  const ledTex = keep(ledTexture(accentA, accentB))
  ledTex.repeat.set(fitTiles(perimeter, 14), 1 / profileLength(LED)) // UV em metros: ~14 m/tile
  const ledMat = keep(
    new THREE.MeshStandardMaterial({
      map: ledTex,
      emissiveMap: ledTex,
      emissive: '#ffffff',
      emissiveIntensity: 1.1,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  )
  const ledRing = new THREE.Mesh(keep(sweepRing(path, LED)), ledMat)
  ledRing.castShadow = true
  root.add(ledRing)
  const led: THREE.MeshStandardMaterial[] = [ledMat]

  // --- tigela de arquibancada ---
  const crowd = keep(crowdTexture())
  /**
   * Uma textura por bandeja: o v sai em metros e o tile precisa fechar um
   * número INTEIRO de vezes na altura DAQUELA bandeja, senão a faixa escura do
   * topo do tile aparece como listra no meio da torcida, sem quebra real atrás.
   */
  const crowdMat = (profile: ProfilePoint[]) => {
    const tex = keep(crowd.clone())
    tex.needsUpdate = true
    tex.repeat.set(fitTiles(perimeter, CROWD_TILE), fitTiles(profileLength(profile), CROWD_TILE))
    return keep(
      new THREE.MeshStandardMaterial({
        map: tex,
        // a torcida tem luz PRÓPRIA (a arquibancada real é iluminada por conta
        // dela): sem isto a rampa do fundo, cuja normal aponta para longe da
        // chave, ficava em preto puro e as duas laterais liam como materiais
        // diferentes — e o pano de fundo dos lances não segurava nada.
        emissiveMap: tex,
        emissive: '#ffffff',
        emissiveIntensity: 0.25,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    )
  }
  const tier = (profile: ProfilePoint[], cast: boolean) => {
    const m = new THREE.Mesh(keep(sweepRing(path, profile)), crowdMat(profile))
    m.receiveShadow = true
    m.castShadow = cast
    root.add(m)
  }
  tier(LOWER, false)
  tier(UPPER, true) // a bandeja de cima sombreia a de baixo: é o que dá volume

  const concrete = keep(
    new THREE.MeshStandardMaterial({ color: '#0c141f', roughness: 0.95, side: THREE.DoubleSide }),
  )
  const wall = new THREE.Mesh(keep(sweepRing(path, SHELL)), concrete)
  wall.receiveShadow = true
  root.add(wall)
  // concreto CLARO no corredor e na fachada: num valor próximo do terreno a
  // traseira da tigela e o chão viram a mesma mancha preta, e o corredor entre
  // as bandejas lê como um vão vazio em vez de uma peça de concreto.
  // #2c3a4e (e não #1a2432): a faixa do corredor precisa de contraste de VALOR
  // contra a torcida, não só de cor — no valor antigo ela empatava com a
  // multidão escura ao lado e não separava bandeja nenhuma.
  const facade = keep(
    new THREE.MeshStandardMaterial({ color: '#2c3a4e', roughness: 0.8, side: THREE.DoubleSide }),
  )
  const concourse = new THREE.Mesh(keep(sweepRing(path, CONCOURSE)), facade)
  concourse.receiveShadow = true
  root.add(concourse)

  const back = new THREE.Mesh(keep(sweepRing(path, BACK)), facade)
  back.receiveShadow = true
  root.add(back)

  const roofMat = keep(
    new THREE.MeshStandardMaterial({
      // clareado e SEM metal: em #080d15 metálico a cobertura só refletia o
      // céu noturno (preto) e desaparecia contra o chão preto.
      color: '#2a3444',
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  )
  // o teto NÃO projeta: a luz de chave é rasante (~30°), então a sombra do
  // beiral de 21 m cai 36 m adiante — dentro do GRAMADO, em lajes de borda
  // dura sobre um terço do campo. Quem vende a cobertura é o valor dela e a
  // aresta externa alta contra o céu.
  root.add(new THREE.Mesh(keep(sweepRing(path, ROOF)), roofMat))

  // --- refletores na borda da cobertura + fita de LED na mesma linha ---
  const glow = keep(glowTexture())
  const lights = buildRoofLights(path, glow, roofMat)
  root.add(lights.group)
  const floodGlow = lights.sprites

  // fita luminosa na quina da cobertura, nas cores da partida: dá uma linha de
  // luz contínua no alto do estádio e amarra o topo do enquadramento.
  // EMISSIVE, não Basic sem tone mapping: como barra chapada ela era o objeto
  // mais brilhante do quadro e parecia fita adesiva colada na tela. Emissivo
  // entra no tone mapping e no bloom — que é quem vende luz de verdade.
  const ribbon = new THREE.Mesh(
    keep(sweepRing(path, RIBBON)),
    keep(
      new THREE.MeshStandardMaterial({
        color: '#0b1119',
        emissive: accentA,
        emissiveIntensity: 2,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    ),
  )
  root.add(ribbon)

  return {
    root,
    led,
    floodGlow,
    flags: cf.flags,
    nets,
    dispose: () => {
      root.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose?.()
      })
      for (const o of owned) o.dispose()
    },
  }
}

/** Anima o ambiente: LED rolando e flâmulas ao vento. */
export const animateStadium = (s: Stadium, t: number): void => {
  for (const m of s.led) if (m.map) m.map.offset.x = (t * 0.05) % 1
  for (let i = 0; i < s.flags.length; i++) {
    const f = s.flags[i]
    // girar em Y é girar o pano em torno do próprio mastro: com 0.4 rad a
    // flâmula (8 px de largura) passava de perfil e SUMIA a cada ciclo — lia
    // como flicker. 0.12 só insinua a direção do vento; o balanço fica no Z.
    f.rotation.y = Math.sin(t * 2.2 + i) * 0.12
    f.rotation.z = Math.sin(t * 3.3 + i * 1.7) * 0.2
  }
}
