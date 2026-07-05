import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
// área de grama "limpa" (sem nó/linha em cima), no meio do campo
await page.screenshot({ path: 'tools/.scratch-shots/zoom-grass-2x.png', clip: { x: 700, y: 250, width: 250, height: 200 } })
await browser.close()
console.log('saved')
