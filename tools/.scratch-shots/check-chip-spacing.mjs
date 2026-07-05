import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/market-empty.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const names = [...document.querySelectorAll('.tv-chip-name')]
  return names.map(n => {
    const r = n.getBoundingClientRect()
    return { text: n.textContent, left: r.left, right: r.right, width: r.width, top: r.top }
  })
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
