import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/match.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const match = document.querySelector('.cm-match')
  const cs = getComputedStyle(match)
  return {
    bg: cs.backgroundImage,
    w: match.offsetWidth,
    h: match.offsetHeight,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
