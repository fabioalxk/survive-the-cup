import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/map-potions.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const header = document.querySelector('.cm-header')
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) } }
  return [...header.children].map((c) => ({ cls: c.className, ...r(c) }))
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
