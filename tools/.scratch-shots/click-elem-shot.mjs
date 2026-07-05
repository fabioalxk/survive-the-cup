import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath, clickSel, elemSel] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
if (clickSel) {
  await page.click(clickSel, { timeout: 3000 })
  await page.waitForTimeout(500)
}
const el = await page.$(elemSel)
await el.screenshot({ path: outPath })
await browser.close()
console.log('saved', outPath)
