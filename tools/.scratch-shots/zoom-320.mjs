import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/boss.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 320, height: 700 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'tools/.scratch-shots/zoom-320-row.png', clip: { x: 0, y: 300, width: 320, height: 180 } })
await browser.close()
console.log('saved')
