import { chromium } from 'playwright'
const [, , url, outPath] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript(() => localStorage.clear())
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()
console.log('saved', outPath)
