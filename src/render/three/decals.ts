import * as THREE from 'three'
import { shadowTexture } from './textures'

/**
 * Sombra de contato projetada no gramado.
 *
 * O shadow map do refletor existe e funciona, mas os botões são peças BAIXAS e
 * LARGAS: a sombra real cai quase toda embaixo da própria peça e some. Esta
 * mancha suave — o mesmo truque que todo jogo AAA usa para ancorar personagens —
 * é o que dá peso e altura à leitura do campo. Uma textura só, compartilhada
 * por todas as instâncias.
 */

/** Direção em que a sombra escorre no gramado (segue a luz-chave). */
export const SHADOW_DIR = new THREE.Vector2(0.62, 0.5)

/** Largura da mancha em raios do corpo. */
export const SPREAD = 2.5

const GEO = new THREE.PlaneGeometry(1, 1)
let tex: THREE.CanvasTexture | null = null
let refs = 0

/**
 * Cria a mancha para um corpo de raio `r`. O mesh fica no espaço do PAI, no
 * chão (y≈0), deslocado no sentido da luz. `dispose` devolve a textura
 * compartilhada quando o último usuário sai.
 */
export const createGroundShadow = (
  r: number,
  opacity: number,
): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } => {
  if (!tex) tex = shadowTexture()
  refs++
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    color: '#04170c',
  })
  const mesh = new THREE.Mesh(GEO, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.scale.set(r * SPREAD, r * SPREAD, 1)
  mesh.position.set(SHADOW_DIR.x * r * 0.7, 0.04, SHADOW_DIR.y * r * 0.7)
  mesh.renderOrder = -1
  return { mesh, mat }
}

export const releaseGroundShadow = (mat: THREE.MeshBasicMaterial): void => {
  mat.dispose()
  if (--refs === 0) {
    tex?.dispose()
    tex = null
  }
}
