import * as THREE from 'three'
import { PHYS } from '../../sim/constants'
import { createGroundShadow, releaseGroundShadow } from './decals'
import { ballAlbedo, glowTexture } from './textures'

/**
 * A bola: esfera PBR com o padrão de gomos gerado, rolamento físico (gira em
 * torno do eixo perpendicular ao deslocamento) e um rastro aditivo que só
 * aparece em chutes fortes — a pista visual de potência do lance.
 */
export interface BallView {
  group: THREE.Group
  /** mancha no gramado: fica no chão enquanto a bola voa (vende a altura) */
  shadow: THREE.Mesh
  shadowMat: THREE.MeshBasicMaterial
  mesh: THREE.Mesh
  trail: THREE.Sprite
  trailMat: THREE.SpriteMaterial
  dispose: () => void
}

const R = PHYS.ballRadius

export const buildBall = (): BallView => {
  const group = new THREE.Group()

  const map = ballAlbedo()
  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: 0.012,
    roughness: 0.38,
    metalness: 0.02,
    // emissivo pequeno com o PRÓPRIO albedo como máscara: os gomos claros
    // cruzam o limiar do bloom (0.92) e ganham miolo brilhante — é o que faz o
    // olho travar na bola no plano aberto — e os gomos escuros ficam intactos.
    emissive: '#ffffff',
    emissiveMap: map,
    emissiveIntensity: 0.5,
  })
  // bola desenhada MAIOR que o raio físico: no enquadramento de cima uma
  // esfera de 45 cm vira um pixel — todo jogo de futebol exagera a bola.
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.55, 48, 32), mat)
  mesh.castShadow = true
  group.add(mesh)

  const glow = glowTexture()
  const trailMat = new THREE.SpriteMaterial({
    map: glow,
    color: '#eaf2ff',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  })
  const trail = new THREE.Sprite(trailMat)
  trail.center.set(0.5, 0.5)
  group.add(trail)

  const { mesh: shadow, mat: shadowMat } = createGroundShadow(R * 1.6, 0.55)

  return {
    group,
    mesh,
    shadow,
    shadowMat,
    trail,
    trailMat,
    dispose: () => {
      releaseGroundShadow(shadowMat)
      mesh.geometry.dispose()
      mat.dispose()
      map.dispose()
      trailMat.dispose()
      glow.dispose()
    },
  }
}

const axis = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const q = new THREE.Quaternion()

/**
 * Aplica o rolamento REAL da bola: o eixo de giro é perpendicular ao
 * deslocamento no plano e o ângulo é `distância / raio`. É o que faz os gomos
 * girarem no sentido certo em vez de patinar.
 */
export const rollBall = (view: BallView, dx: number, dz: number): void => {
  const d = Math.hypot(dx, dz)
  if (d < 1e-5) return
  axis.set(dz / d, 0, -dx / d)
  q.setFromAxisAngle(axis, d / R)
  view.mesh.quaternion.premultiply(q)
  void up
}
