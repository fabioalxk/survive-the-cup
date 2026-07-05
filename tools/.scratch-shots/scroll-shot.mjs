import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath, w, h, scrollY] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w) || 390, height: Number(h) || 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate((y) => window.scrollTo(0, y), Number(scrollY) || 0)
await page.waitForTimeout(300)
await page.screenshot({ path: outPath })
await browser.close()
console.log('saved', outPath)
