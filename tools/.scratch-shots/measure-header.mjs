import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map-potions.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const stats = document.querySelector('.cm-header-stats')
  const cs = getComputedStyle(stats)
  const kids = [...stats.children].map((c) => {
    const r = c.getBoundingClientRect()
    return { cls: c.className, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }
  })
  return {
    statsFlexWrap: cs.flexWrap,
    statsWidth: stats.getBoundingClientRect().width,
    kids,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
