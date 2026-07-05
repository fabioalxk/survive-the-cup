import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// crop just the left black-bar strip, full height, zoomed via clip
await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 200, height: 1080 } })
await browser.close()
console.log('saved', outPath)
