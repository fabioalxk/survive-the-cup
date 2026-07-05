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
// Canadá (disponível, stage1) vs Costa Rica (far, stage4) lado a lado
await page.screenshot({ path: 'tools/.scratch-shots/cmp-canada.png', clip: { x: 195, y: 545, width: 100, height: 100 } })
await page.screenshot({ path: 'tools/.scratch-shots/cmp-costarica.png', clip: { x: 240, y: 95, width: 100, height: 100 } })
await browser.close()
console.log('saved')
