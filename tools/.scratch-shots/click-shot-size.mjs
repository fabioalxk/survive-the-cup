import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath, w, h, ...selectors] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w) || 390, height: Number(h) || 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
for (const sel of selectors) {
  try {
    await page.click(sel, { timeout: 3000 })
    await page.waitForTimeout(500)
  } catch (e) {
    console.error('click failed for', sel, e.message)
  }
}
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()
console.log('saved', outPath)
