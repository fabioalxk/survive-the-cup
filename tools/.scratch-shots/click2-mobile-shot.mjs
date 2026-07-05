import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const [, , stateName, url, outPath, w, h, click1, click2] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
if (click1) { await page.click(click1); await page.waitForTimeout(400) }
if (click2) { await page.click(click2); await page.waitForTimeout(400) }
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()
console.log('saved', outPath)
