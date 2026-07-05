import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const result = await page.evaluate(() => new Promise((resolve) => {
  const frames = []
  let last = performance.now()
  function tick(t) {
    frames.push(t - last)
    last = t
    if (frames.length < 180) requestAnimationFrame(tick)
    else resolve(frames)
  }
  requestAnimationFrame(tick)
}))

const avg = result.reduce((a, b) => a + b, 0) / result.length
const max = Math.max(...result)
const jankFrames = result.filter((f) => f > 20).length // >20ms ~ abaixo de 50fps
console.log(`frames: ${result.length}, media: ${avg.toFixed(2)}ms (${(1000 / avg).toFixed(1)}fps), pior frame: ${max.toFixed(2)}ms, frames com jank (>20ms): ${jankFrames}`)
await browser.close()
