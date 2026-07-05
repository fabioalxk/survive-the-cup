import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const [, , inPath, outPath, targetW] = process.argv
const buf = readFileSync(inPath)
const b64 = buf.toString('base64')
const ext = inPath.split('.').pop()

const browser = await chromium.launch()
const page = await browser.newPage()
const dataUrl = `data:image/${ext === 'png' ? 'png' : 'webp'};base64,${b64}`
const outBuf = await page.evaluate(async ({ dataUrl, targetW }) => {
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = rej
    img.src = dataUrl
  })
  const scale = targetW / img.width
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/jpeg', 0.82)
  return url.split(',')[1]
}, { dataUrl, targetW: Number(targetW) })
writeFileSync(outPath, Buffer.from(outBuf, 'base64'))
await browser.close()
console.log('saved', outPath)
