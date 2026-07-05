import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const [, , inPath, outPath, x, y, w, h] = process.argv
const buf = readFileSync(inPath).toString('base64')
const browser = await chromium.launch()
const page = await browser.newPage()
const out = await page.evaluate(async ({ buf, x, y, w, h }) => {
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + buf })
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, -x, -y)
  return canvas.toDataURL('image/png').split(',')[1]
}, { buf, x: Number(x), y: Number(y), w: Number(w), h: Number(h) })
writeFileSync(outPath, Buffer.from(out, 'base64'))
await browser.close()
console.log('saved', outPath)
