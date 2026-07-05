import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const baseline = readFileSync('tools/.scratch-shots/map-boss.png').toString('base64')
const current = readFileSync('tools/.scratch-shots/regression-current.png').toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage()
const result = await page.evaluate(async ({ baseline, current }) => {
  const load = (b64) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = 'data:image/png;base64,' + b64
  })
  const [imgA, imgB] = await Promise.all([load(baseline), load(current)])
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    return { sizeMismatch: true, a: [imgA.width, imgA.height], b: [imgB.width, imgB.height] }
  }
  const c1 = document.createElement('canvas')
  c1.width = imgA.width; c1.height = imgA.height
  const ctx1 = c1.getContext('2d'); ctx1.drawImage(imgA, 0, 0)
  const c2 = document.createElement('canvas')
  c2.width = imgB.width; c2.height = imgB.height
  const ctx2 = c2.getContext('2d'); ctx2.drawImage(imgB, 0, 0)
  const dA = ctx1.getImageData(0, 0, c1.width, c1.height).data
  const dB = ctx2.getImageData(0, 0, c2.width, c2.height).data
  let diffPixels = 0
  let maxDiff = 0
  for (let i = 0; i < dA.length; i += 4) {
    const diff = Math.abs(dA[i] - dB[i]) + Math.abs(dA[i + 1] - dB[i + 1]) + Math.abs(dA[i + 2] - dB[i + 2])
    if (diff > 30) diffPixels++
    if (diff > maxDiff) maxDiff = diff
  }
  const totalPixels = dA.length / 4
  return { diffPixels, totalPixels, pct: (diffPixels / totalPixels) * 100, maxDiff }
}, { baseline, current })

console.log(JSON.stringify(result, null, 2))
await browser.close()
