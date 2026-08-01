import * as THREE from 'three'

/**
 * Varredura de um PERFIL ao longo de um CAMINHO fechado no plano XZ — a
 * ferramenta que constrói o estádio inteiro (arquibancada, muro, cobertura)
 * a partir de uma seção transversal desenhada uma vez só.
 *
 * O perfil é dado em (offset, altura): `offset` afasta do caminho para FORA
 * (normal externa), `altura` sobe em Y. As UVs saem em METROS (u = distância
 * percorrida no caminho, v = distância percorrida no perfil), então qualquer
 * textura tem escala física correta sem ajuste manual por peça.
 */
export interface ProfilePoint {
  /** afastamento do caminho, para fora do estádio (m) */
  out: number
  /** altura acima do gramado (m) */
  y: number
}

/**
 * Retângulo com cantos arredondados no plano XZ — a planta de um estádio real
 * (os cantos são preenchidos por arquibancada em curva, não por um vértice).
 */
export const roundedRectPath = (
  cx: number,
  cz: number,
  halfX: number,
  halfZ: number,
  radius: number,
  cornerSteps = 12,
): THREE.Vector2[] => {
  const r = Math.min(radius, halfX, halfZ)
  const ax = halfX - r
  const az = halfZ - r
  const pts: THREE.Vector2[] = []
  // 4 quinas, no sentido anti-horário visto de cima (normal = para fora)
  const corners: [number, number, number][] = [
    [cx + ax, cz + az, 0],
    [cx - ax, cz + az, Math.PI / 2],
    [cx - ax, cz - az, Math.PI],
    [cx + ax, cz - az, Math.PI * 1.5],
  ]
  for (const [qx, qz, a0] of corners) {
    for (let i = 0; i <= cornerSteps; i++) {
      const a = a0 + (i / cornerSteps) * (Math.PI / 2)
      pts.push(new THREE.Vector2(qx + Math.cos(a) * r, qz + Math.sin(a) * r))
    }
  }
  return pts
}

/** Distância acumulada ao longo do perfil (o v da varredura, em metros). */
const profileArc = (profile: ProfilePoint[]): number[] => {
  const v: number[] = [0]
  for (let j = 1; j < profile.length; j++) {
    const a = profile[j - 1]
    const b = profile[j]
    v.push(v[j - 1] + Math.hypot(b.out - a.out, b.y - a.y))
  }
  return v
}

/**
 * Extensão total do perfil (m). Serve para encaixar um número inteiro de tiles
 * de textura na peça varrida — sem isso o tile cai fora de fase e a emenda
 * aparece como uma listra que não corresponde a nada da arquitetura.
 */
export const profileLength = (profile: ProfilePoint[]): number => {
  const v = profileArc(profile)
  return v[v.length - 1]
}

/**
 * Constrói a casca gerada por `profile` varrido em `path` (fechado). A face
 * gerada aponta para DENTRO do estádio (é o que a câmera vê); use
 * `THREE.DoubleSide` no material quando a peça puder ser vista dos dois lados.
 */
export const sweepRing = (path: THREE.Vector2[], profile: ProfilePoint[]): THREE.BufferGeometry => {
  const n = path.length
  const m = profile.length
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []

  // normal externa de cada ponto do caminho (média das arestas vizinhas)
  const normals: THREE.Vector2[] = []
  const arc: number[] = [0]
  for (let i = 0; i < n; i++) {
    const prev = path[(i - 1 + n) % n]
    const next = path[(i + 1) % n]
    const t = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize()
    // rotaciona a tangente −90° → aponta para fora do polígono (anti-horário)
    normals.push(new THREE.Vector2(t.y, -t.x))
    if (i > 0) arc.push(arc[i - 1] + path[i].distanceTo(path[i - 1]))
  }

  const vArc = profileArc(profile)

  for (let i = 0; i <= n; i++) {
    const k = i % n
    const p = path[k]
    const nrm = normals[k]
    const u = i === n ? arc[n - 1] + path[0].distanceTo(path[n - 1]) : arc[k]
    for (let j = 0; j < m; j++) {
      const pr = profile[j]
      pos.push(p.x + nrm.x * pr.out, pr.y, p.y + nrm.y * pr.out)
      uv.push(u, vArc[j])
    }
  }

  for (let i = 0; i < n; i++)
    for (let j = 0; j < m - 1; j++) {
      const a = i * m + j
      const b = (i + 1) * m + j
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
