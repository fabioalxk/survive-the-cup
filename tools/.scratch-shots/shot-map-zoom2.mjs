import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// linha entre Coreia do Sul e Arábia Saudita + área do início/flag
await page.screenshot({ path: 'tools/.scratch-shots/zoom-line.png', clip: { x: 480, y: 470, width: 260, height: 200 } })
await page.screenshot({ path: 'tools/.scratch-shots/zoom-start.png', clip: { x: 560, y: 660, width: 160, height: 120 } })
await page.screenshot({ path: 'tools/.scratch-shots/zoom-top.png', clip: { x: 0, y: 60, width: 1280, height: 80 } })
await browser.close()
console.log('saved')
