import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const buf = readFileSync('tools/.scratch-shots/contrast-boss-src.png')
const b64 = buf.toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage()
const result = await page.evaluate(async (b64) => {
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  // "COSTA RICA" label ~ (288, 156) no screenshot original 1280x800 — pega uma
  // pequena janela e reporta os pixels mais claros (texto) e mais escuros (fundo)
  const sampleBox = (cx, cy, w, h) => {
    const data = ctx.getImageData(cx - w / 2, cy - h / 2, w, h).data
    let minLum = 255, maxLum = 0, minRGB, maxRGB
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (lum < minLum) { minLum = lum; minRGB = [r, g, b] }
      if (lum > maxLum) { maxLum = lum; maxRGB = [r, g, b] }
    }
    return { minLum, maxLum, minRGB, maxRGB }
  }
  return sampleBox(640, 194, 100, 14)
}, b64)

// contraste WCAG a partir de luminância relativa sRGB
const relLum = (r, g, b) => {
  const chan = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}
const L1 = relLum(...result.maxRGB)
const L2 = relLum(...result.minRGB)
const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
console.log('pixel mais claro (texto):', result.maxRGB, 'pixel mais escuro (fundo):', result.minRGB)
console.log('contraste WCAG estimado:', ratio.toFixed(2) + ':1', ratio >= 4.5 ? '(passa AA texto normal)' : '(abaixo de AA)')
await browser.close()
