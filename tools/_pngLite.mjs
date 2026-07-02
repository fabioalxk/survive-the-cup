// Decoder/encoder mínimo de PNG RGBA (sem dependências externas) — usado só
// por scripts de tooling para reamostrar os sprites gerados (ex.: reduzir
// resolução para embutir num preview HTML). Não é usado pelo jogo em si.
import zlib from 'node:zlib'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const paeth = (a, b, c) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/** Decodifica um PNG RGBA8 em { width, height, pixels: Buffer RGBA }. */
export const decodePng = (buf) => {
  let pos = 8
  let ihdr = null
  const idatChunks = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') ihdr = data
    if (type === 'IDAT') idatChunks.push(data)
    pos += 12 + len
  }
  const width = ihdr.readUInt32BE(0)
  const height = ihdr.readUInt32BE(4)
  const colorType = ihdr.readUInt8(9)
  if (colorType !== 6) throw new Error(`esperava PNG RGBA (colorType 6), veio ${colorType}`)
  const bpp = 4
  const stride = width * bpp
  const raw = zlib.inflateSync(Buffer.concat(idatChunks))
  const out = Buffer.alloc(height * stride)
  let rp = 0
  let op = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp]
    rp++
    for (let x = 0; x < stride; x++) {
      const rb = raw[rp + x]
      const a = x >= bpp ? out[op + x - bpp] : 0
      const b = y > 0 ? out[op + x - stride] : 0
      const c = x >= bpp && y > 0 ? out[op + x - bpp - stride] : 0
      let val
      if (filter === 0) val = rb
      else if (filter === 1) val = rb + a
      else if (filter === 2) val = rb + b
      else if (filter === 3) val = rb + Math.floor((a + b) / 2)
      else if (filter === 4) val = rb + paeth(a, b, c)
      else val = rb
      out[op + x] = val & 0xff
    }
    rp += stride
    op += stride
  }
  return { width, height, pixels: out }
}

/** Codifica { width, height, pixels: Buffer RGBA } num PNG (sem filtro, compressão máxima). */
export const encodePng = ({ width, height, pixels }) => {
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro "none"
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })

  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeAndData), 0)
    return Buffer.concat([len, typeAndData, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(6, 9) // color type RGBA
  ihdr.writeUInt8(0, 10)
  ihdr.writeUInt8(0, 11)
  ihdr.writeUInt8(0, 12)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/** Reamostra (nearest-neighbor) para outra resolução quadrada. */
export const resamplePng = ({ width, height, pixels }, targetSize) => {
  const out = Buffer.alloc(targetSize * targetSize * 4)
  for (let y = 0; y < targetSize; y++) {
    const sy = Math.min(height - 1, Math.floor((y * height) / targetSize))
    for (let x = 0; x < targetSize; x++) {
      const sx = Math.min(width - 1, Math.floor((x * width) / targetSize))
      const si = (sy * width + sx) * 4
      const di = (y * targetSize + x) * 4
      pixels.copy(out, di, si, si + 4)
    }
  }
  return { width: targetSize, height: targetSize, pixels: out }
}
