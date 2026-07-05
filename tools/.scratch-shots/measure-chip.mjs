import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const [, , stateName, url, w, h] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const box = await page.$eval('.tv-chip-photo', (el) => {
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return { rectWidth: r.width, computedWidth: cs.width, inlineStyleWidth: el.style.width }
})
console.log(JSON.stringify(box, null, 2))
await browser.close()
