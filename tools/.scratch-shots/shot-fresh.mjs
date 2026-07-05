import { chromium } from 'playwright'

const [, , url, outPath, ...selectors] = process.argv

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => localStorage.clear())
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
for (const sel of selectors) {
  try {
    await page.click(sel, { timeout: 3000 })
    await page.waitForTimeout(500)
  } catch (e) {
    console.error('click failed for', sel, e.message)
  }
}
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()
console.log('saved', outPath)
