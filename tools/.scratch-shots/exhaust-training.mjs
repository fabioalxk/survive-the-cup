import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/gym.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

for (let i = 0; i < 6; i++) {
  try {
    await page.click('.tv-chip', { timeout: 2000 })
    await page.waitForTimeout(300)
    const trained = await page.click('button:has-text("Treinar")', { timeout: 2000 }).then(() => true).catch(() => false)
    await page.waitForTimeout(300)
    console.log(`iter ${i}: trained=${trained}`)
  } catch (e) {
    console.log(`iter ${i}: error`, e.message)
  }
}
await page.screenshot({ path: process.argv[2] })
await browser.close()
console.log('saved')
