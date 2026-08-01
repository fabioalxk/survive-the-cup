import * as THREE from 'three'
import { FIELD } from '../../sim/constants'
import { glowTexture } from './textures'

/**
 * Efeitos da comemoração de gol: chuva de confete nas cores do time, flashes de
 * câmera na arquibancada e o clarão de impacto na rede. Tudo em GPU (Points /
 * sprites aditivos) e alimentado só pelo tempo `t` da comemoração — sem estado
 * próprio, então rebobinar/reiniciar é de graça.
 */

const COUNT = 900

export interface Fx {
  root: THREE.Group
  confetti: THREE.Points
  flash: THREE.Sprite
  flashMat: THREE.SpriteMaterial
  flashbulbs: THREE.Points
  setColors: (a: string, b: string) => void
  update: (t: number | null, ballPos: THREE.Vector3) => void
  dispose: () => void
}

/** Fita de confete: quad girando — o "achatamento" no tempo simula o rodopio. */
const CONFETTI_VS = /* glsl */ `
  attribute float seed;
  attribute vec3 tint;
  uniform float uTime;
  uniform float uSize;
  varying vec3 vTint;
  varying float vSpin;
  void main() {
    vTint = tint;
    float fall = mod(uTime * (7.0 + seed * 9.0) + seed * 40.0, 46.0);
    vec3 p = position;
    p.y = 42.0 - fall;
    p.x += sin(uTime * 1.6 + seed * 6.283) * 2.4;
    p.z += cos(uTime * 1.3 + seed * 6.283) * 2.0;
    vSpin = abs(cos(uTime * (3.0 + seed * 5.0) + seed * 10.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + vSpin) * (60.0 / -mv.z);
  }
`

const CONFETTI_FS = /* glsl */ `
  varying vec3 vTint;
  varying float vSpin;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    // fita retangular achatada pelo giro
    if (abs(uv.x) > 0.22 || abs(uv.y) > 0.12 + 0.3 * vSpin) discard;
    gl_FragColor = vec4(vTint, 0.95);
  }
`

export const buildFx = (): Fx => {
  const root = new THREE.Group()

  // --- confete ---
  const pos = new Float32Array(COUNT * 3)
  const seed = new Float32Array(COUNT)
  const tint = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = Math.random() * (FIELD.w + 30) - 15
    pos[i * 3 + 1] = 0
    pos[i * 3 + 2] = Math.random() * (FIELD.h + 30) - 15
    seed[i] = Math.random()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3))
  geo.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(FIELD.cx, 20, FIELD.cy),
    140,
  )

  const confettiMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: 26 } },
    vertexShader: CONFETTI_VS,
    fragmentShader: CONFETTI_FS,
    transparent: true,
    depthWrite: false,
  })
  const confetti = new THREE.Points(geo, confettiMat)
  confetti.visible = false
  confetti.frustumCulled = false
  root.add(confetti)

  const setColors = (a: string, b: string) => {
    const ca = new THREE.Color(a)
    const cb = new THREE.Color(b)
    const cw = new THREE.Color('#ffffff')
    for (let i = 0; i < COUNT; i++) {
      const c = i % 3 === 0 ? ca : i % 3 === 1 ? cw : cb
      tint[i * 3] = c.r
      tint[i * 3 + 1] = c.g
      tint[i * 3 + 2] = c.b
    }
    geo.getAttribute('tint').needsUpdate = true
  }
  setColors('#ffffff', '#ffffff')

  // --- clarão na rede ---
  const glow = glowTexture()
  const flashMat = new THREE.SpriteMaterial({
    map: glow,
    color: '#ffffff',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    opacity: 0,
  })
  const flash = new THREE.Sprite(flashMat)
  root.add(flash)

  // --- flashes de câmera na arquibancada ---
  const bulbN = 260
  const bpos = new Float32Array(bulbN * 3)
  const bseed = new Float32Array(bulbN)
  for (let i = 0; i < bulbN; i++) {
    const side = i % 4
    const along = Math.random()
    const up = 4 + Math.random() * 15
    const out = 7 + Math.random() * 12
    const x = side < 2 ? along * (FIELD.w + 20) - 10 : side === 2 ? -out : FIELD.w + out
    const z = side === 0 ? -out : side === 1 ? FIELD.h + out : along * (FIELD.h + 20) - 10
    bpos[i * 3] = x
    bpos[i * 3 + 1] = up
    bpos[i * 3 + 2] = z
    bseed[i] = Math.random()
  }
  const bgeo = new THREE.BufferGeometry()
  bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3))
  bgeo.setAttribute('seed', new THREE.BufferAttribute(bseed, 1))
  const bulbMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      varying float vOn;
      void main() {
        float tick = floor(uTime * 11.0);
        vOn = step(0.86, fract(sin(seed * 91.7 + tick * 13.1) * 43758.5453));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 26.0 * vOn * (60.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vOn;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vOn;
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.92), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const flashbulbs = new THREE.Points(bgeo, bulbMat)
  flashbulbs.visible = false
  flashbulbs.frustumCulled = false
  root.add(flashbulbs)

  return {
    root,
    confetti,
    flash,
    flashMat,
    flashbulbs,
    setColors,
    update: (t, ballPos) => {
      const on = t !== null
      confetti.visible = on
      flashbulbs.visible = on
      if (!on) {
        flashMat.opacity = 0
        return
      }
      confettiMat.uniforms.uTime.value = t
      bulbMat.uniforms.uTime.value = t
      // clarão estoura na bola dentro da rede e se abre em ~0.6 s
      const k = Math.max(0, 1 - t / 0.6)
      flash.position.copy(ballPos)
      flash.scale.setScalar(3 + 26 * (1 - k))
      flashMat.opacity = k * 0.85
    },
    dispose: () => {
      geo.dispose()
      confettiMat.dispose()
      bgeo.dispose()
      bulbMat.dispose()
      flashMat.dispose()
      glow.dispose()
    },
  }
}
