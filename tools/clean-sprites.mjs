// Limpa as sprite sheets geradas por IA (rodar após generate-sprites.mjs /
// generate-action-sprites.mjs): em cada célula da grade, mantém apenas os
// pixels conectados ao personagem central e apaga o resto. Isso remove
// (a) pedaços do personagem da célula VIZINHA que vazam pra dentro da fatia
// (pernas esticadas das poses side view cruzam a borda da célula) e
// (b) o halo/glow residual que o modelo pinta ao redor da silhueta.
//
// Sem dependências: decodifica/re-encoda PNG RGBA 8-bit na mão (zlib nativo).
//
// Uso:
//   node tools/clean-sprites.mjs        # todas as sheets dos manifests
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'
import { ROOT } from './_openaiImage.mjs'

const DIR = join(ROOT, 'public', 'assets', 'sprites')
const SOLID_ALPHA = 64 // abaixo disso é glow/linha-guia, não corpo
const KEEP_MARGIN = 3 // px de folga ao redor do corpo (preserva anti-alias)

// ---------------------------------------------------------------- PNG codec

function decodePng(buf) {
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  if (buf[24] !== 8 || buf[25] !== 6) throw new Error('esperado PNG RGBA 8-bit')
  const idats = []
  for (let pos = 8; pos < buf.length; ) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len))
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idats))
  const stride = w * 4
  const px = Buffer.alloc(h * stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[y * stride + x - 4] : 0
      const b = y > 0 ? px[(y - 1) * stride + x] : 0
      const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) v += paeth(a, b, c)
      px[y * stride + x] = v & 0xff
    }
  }
  return { w, h, px }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng({ w, h, px }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = w * 4
  const raw = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride) // filtro 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------------ limpeza

/**
 * Numa célula [x0,y0)-(x1,y1): BFS a partir dos pixels sólidos do miolo
 * central (o tronco do personagem SEMPRE passa por ali), dilata com folga e
 * zera todo pixel com alpha fora dessa máscara — some o que não é o
 * personagem desta célula.
 */
function cleanCell(img, x0, y0, x1, y1) {
  const { w, px } = img
  const cw = x1 - x0
  const ch = y1 - y0
  const mask = new Uint8Array(cw * ch) // 1 = manter
  const queue = []
  const alphaAt = (cx, cy) => px[((y0 + cy) * w + (x0 + cx)) * 4 + 3]

  // sementes: pixels sólidos no miolo central (50% da célula)
  for (let cy = ch >> 2; cy < ch - (ch >> 2); cy++) {
    for (let cx = cw >> 2; cx < cw - (cw >> 2); cx++) {
      if (alphaAt(cx, cy) >= SOLID_ALPHA && !mask[cy * cw + cx]) {
        mask[cy * cw + cx] = 1
        queue.push(cy * cw + cx)
      }
    }
  }
  // BFS por pixels sólidos
  while (queue.length) {
    const i = queue.pop()
    const cx = i % cw
    const cy = (i / cw) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue
      const ni = ny * cw + nx
      if (!mask[ni] && alphaAt(nx, ny) >= SOLID_ALPHA) {
        mask[ni] = 1
        queue.push(ni)
      }
    }
  }
  // dilata KEEP_MARGIN px (preserva a borda anti-aliased do corpo)
  for (let pass = 0; pass < KEEP_MARGIN; pass++) {
    const grown = mask.slice()
    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        if (mask[cy * cw + cx]) continue
        if (
          (cx > 0 && mask[cy * cw + cx - 1]) ||
          (cx < cw - 1 && mask[cy * cw + cx + 1]) ||
          (cy > 0 && mask[(cy - 1) * cw + cx]) ||
          (cy < ch - 1 && mask[(cy + 1) * cw + cx])
        )
          grown[cy * cw + cx] = 1
      }
    }
    mask.set(grown)
  }
  // apaga o que ficou fora da máscara
  let cleared = 0
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      const o = ((y0 + cy) * w + (x0 + cx)) * 4
      if (px[o + 3] > 0 && !mask[cy * cw + cx]) {
        px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0
        cleared++
      }
    }
  }
  return cleared
}

async function cleanSheet(file, cols, rows) {
  const img = decodePng(await readFile(join(DIR, file)))
  const cellW = img.w / cols
  const cellH = img.h / rows
  let cleared = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cleared += cleanCell(img, Math.round(c * cellW), Math.round(r * cellH), Math.round((c + 1) * cellW), Math.round((r + 1) * cellH))
    }
  }
  await writeFile(join(DIR, file), encodePng(img))
  console.log(`🧹 ${file} — ${cleared} px limpos`)
}

const run = async () => {
  const manifest = JSON.parse(await readFile(join(DIR, 'manifest.json'), 'utf8'))
  const actions = JSON.parse(await readFile(join(DIR, 'actions-manifest.json'), 'utf8'))
  for (let i = 0; i < manifest.bodyPoolSize; i++) {
    await cleanSheet(`body_${String(i).padStart(2, '0')}.png`, manifest.grid.cols, manifest.grid.rows)
  }
  for (const def of Object.values(actions)) {
    await cleanSheet(def.src.split('/').pop(), def.grid.cols, def.grid.rows)
  }
}

run()
