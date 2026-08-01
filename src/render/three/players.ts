import * as THREE from 'three'
import type { Player } from '../../sim/types'
import { PHYS } from '../../sim/constants'
import { createGroundShadow, releaseGroundShadow } from './decals'
import { nameTexture, numberTexture } from './textures'

/**
 * Os botões em 3D. Cada jogador é uma peça torneada (LatheGeometry): pedestal
 * metálico + parede colorida + domo de acrílico com clearcoat — a leitura do
 * futebol de botão do jogo 2D, agora com volume, reflexo e sombra reais.
 */

/** Raio da peça (m). Um tico maior que o raio físico p/ o botão "ocupar" o campo. */
const R = PHYS.playerRadius * 1.5
/** Altura do topo do domo (m). Alta o bastante p/ a silhueta ler como CALOTA —
 *  achatada demais o botão vira ficha de pôquer. */
const H = 0.88
/** Altura em que a parede colorida encontra o domo. */
const WALL_TOP = 0.36
/** Altura do rótulo de nome, em metros de mundo. */
const LABEL_H = 2.2

export interface KitColors {
  shirt: string
  shorts: string
  socks: string
  text: string
}

/** Perfil torneado do pedestal metálico (base larga com chanfro). O lábio é
 *  ESTREITO (1.08R): mais largo que isso ele tapava, nesta câmera alta, toda a
 *  faixa de cor secundária da parede. */
const baseProfile = (): THREE.Vector2[] => [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(R * 1.06, 0),
  new THREE.Vector2(R * 1.08, 0.045),
  new THREE.Vector2(R * 1.05, 0.095),
  new THREE.Vector2(R * 1.02, 0.125),
  new THREE.Vector2(R * 1.0, 0.15),
]

/** Altura da calota no raio `r`. FONTE ÚNICA da curvatura do domo: o torno e o
 *  decalque do número leem daqui — foi a divergência entre os dois que fazia o
 *  número flutuar 18 cm acima da superfície. */
const capY = (r: number): number =>
  WALL_TOP + (H - WALL_TOP) * Math.sqrt(Math.max(0, 1 - (r / R) ** 2))

/** Parede reta da peça (cor secundária do uniforme) + tampa inferior. */
const wallProfile = (): THREE.Vector2[] => [
  new THREE.Vector2(0, 0.15),
  new THREE.Vector2(R, 0.15),
  new THREE.Vector2(R, WALL_TOP),
]

/** Calota de acrílico que fecha a peça por cima da parede. */
const capProfile = (): THREE.Vector2[] => {
  const pts: THREE.Vector2[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const r = R * Math.cos((i / steps) * (Math.PI / 2))
    pts.push(new THREE.Vector2(r, capY(r)))
  }
  return pts
}

/**
 * Disco do número ASSENTADO na calota: cada vértice recebe a altura do próprio
 * domo (+4 mm), então o algarismo acompanha a curvatura em vez de pairar como
 * uma tampa chata. Fica no plano XY (z = altura) porque o mesh é deitado com
 * rotation.x = -90° e girado em Z p/ ficar de frente para a câmera.
 */
const numberGeo = (): THREE.BufferGeometry => {
  const geo = new THREE.RingGeometry(0, R * 0.78, 40, 8)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, capY(Math.hypot(pos.getX(i), pos.getY(i))) + 0.004)
  }
  geo.computeVertexNormals()
  return geo
}

const BASE_GEO = new THREE.LatheGeometry(baseProfile(), 48)
const WALL_GEO = new THREE.LatheGeometry(wallProfile(), 48)
const CAP_GEO = new THREE.LatheGeometry(capProfile(), 48)
// halo largo e AFASTADO do lábio cromado: o aro antigo (1.3R, tubo 0.055)
// encostava no metal e sumia no campo aberto.
const RING_GEO = new THREE.TorusGeometry(R * 1.45, 0.1, 10, 48)
const NUMBER_GEO = numberGeo()

const BASE_MAT = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  metalness: 0.95,
  roughness: 0.22,
})

/** Uma peça montada + os handles que mudam a cada frame. */
export interface PlayerPiece {
  group: THREE.Group
  /** mancha de contato no gramado (encolhe quando a peça salta) */
  shadow: THREE.Mesh
  shadowMat: THREE.MeshBasicMaterial
  dome: THREE.MeshPhysicalMaterial
  wallMat: THREE.MeshStandardMaterial
  ring: THREE.Mesh
  ringMat: THREE.MeshBasicMaterial
  numberMesh: THREE.Mesh
  label: THREE.Sprite
  labelMat: THREE.SpriteMaterial
  tilt: THREE.Group
}

/**
 * Monta a peça de um jogador. `numberUp` é a rotação em Y que deixa o número
 * legível pela câmera (a câmera é fixa, então é constante por partida).
 */
export const buildPiece = (p: Player, kit: KitColors, numberUp: number): PlayerPiece => {
  const group = new THREE.Group()
  const { mesh: shadow, mat: shadowMat } = createGroundShadow(R, 0.5)
  group.add(shadow)
  // subgrupo que tomba: o jogador caído gira em torno da base, não do centro
  const tilt = new THREE.Group()
  group.add(tilt)

  const base = new THREE.Mesh(BASE_GEO, BASE_MAT)
  base.castShadow = true
  base.receiveShadow = true
  tilt.add(base)

  // parede: a SEGUNDA cor do uniforme (o azul do Brasil, o preto da Argentina).
  // É o que separa dois times de camisa parecida numa peça monocromática.
  const wallMat = new THREE.MeshStandardMaterial({
    color: kit.shorts,
    roughness: 0.5,
    metalness: 0.05,
  })
  const wallMesh = new THREE.Mesh(WALL_GEO, wallMat)
  wallMesh.castShadow = true
  wallMesh.receiveShadow = true
  tilt.add(wallMesh)

  // acrílico: sem `sheen` (é BRDF de TECIDO, só lavava a borda) e com verniz
  // bem liso — o realce tem que ser pequeno e nítido, não uma mancha mole.
  const dome = new THREE.MeshPhysicalMaterial({
    color: kit.shirt,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  })
  const domeMesh = new THREE.Mesh(CAP_GEO, dome)
  domeMesh.castShadow = true
  domeMesh.receiveShadow = true
  tilt.add(domeMesh)

  // número estampado no topo do domo, orientado p/ ler de frente na câmera.
  // Material que RECEBE luz: com MeshBasic o algarismo brilhava igual mesmo na
  // peça em sombra — o adesivo chapado.
  const numberMat = new THREE.MeshStandardMaterial({
    map: numberTexture(p.number, kit.text),
    transparent: true,
    depthWrite: false,
    roughness: 0.32,
    metalness: 0,
  })
  const numberMesh = new THREE.Mesh(NUMBER_GEO, numberMat)
  numberMesh.rotation.x = -Math.PI / 2
  numberMesh.rotation.z = numberUp
  numberMesh.renderOrder = 2
  tilt.add(numberMesh)

  // aro do dono da bola / cartão amarelo — some por opacidade, sem piscar
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#fde047',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  })
  const ring = new THREE.Mesh(RING_GEO, ringMat)
  ring.rotation.x = -Math.PI / 2
  // acima do chanfro da base: rente ao chão a saia do pedestal comia o aro
  ring.position.y = 0.2
  group.add(ring)

  const labelMat = new THREE.SpriteMaterial({
    map: nameTexture(p.name),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const label = new THREE.Sprite(labelMat)
  const tex = labelMat.map!
  const aspect = tex.image.width / tex.image.height
  label.scale.set(LABEL_H * aspect, LABEL_H, 1)
  // âncora acima do sprite (center.y > 1) => o nome é desenhado ABAIXO da peça
  // na tela. A folga sai do raio projetado do botão, senão o texto cai dentro
  // da própria silhueta (1.15 dava 33 cm: em cima do domo).
  label.center.set(0.5, 1 + (R * 0.95) / LABEL_H)
  label.renderOrder = 10
  label.visible = false
  group.add(label)

  return { group, shadow, shadowMat, dome, wallMat, ring, ringMat, numberMesh, label, labelMat, tilt }
}

/** Descarta geometrias/texturas próprias da peça (as compartilhadas ficam). */
export const disposePiece = (piece: PlayerPiece): void => {
  releaseGroundShadow(piece.shadowMat)
  piece.dome.dispose()
  piece.wallMat.dispose()
  ;(piece.numberMesh.material as THREE.MeshStandardMaterial).map?.dispose()
  ;(piece.numberMesh.material as THREE.Material).dispose()
  piece.ringMat.dispose()
  piece.labelMat.map?.dispose()
  piece.labelMat.dispose()
}
