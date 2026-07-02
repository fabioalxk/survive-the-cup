import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'tools/out/01-landing.png' })

const text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
console.log('BODY TEXT:\n', text)
console.log('CONSOLE ERRORS:\n', errors.join('\n'))

await browser.close()
