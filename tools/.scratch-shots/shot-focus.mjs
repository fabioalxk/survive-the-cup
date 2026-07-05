import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/progress.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
// tab até o primeiro rq-node focável (nó disponível)
for (let i = 0; i < 15; i++) {
  await page.keyboard.press('Tab')
  const isNode = await page.evaluate(() => document.activeElement?.classList.contains('rq-node'))
  if (isNode) break
}
await page.waitForTimeout(200)
await page.screenshot({ path: 'tools/.scratch-shots/focus-node.png' })
await browser.close()
console.log('saved')
