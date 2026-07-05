import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName = 'boss', outPath = 'tools/.scratch-shots/map-viewport-only.png'] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()
console.log('saved', outPath)
