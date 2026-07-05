import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath, w, h, waitMs] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w) || 390, height: Number(h) || 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(waitMs) || 2500)
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()
console.log('saved', outPath)
