import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => localStorage.clear())
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.click('text=Um Jogador')
await page.waitForTimeout(1000)
await page.screenshot({ path: 'tools/.scratch-shots/newrun2.png' })
await browser.close()
console.log('saved')
