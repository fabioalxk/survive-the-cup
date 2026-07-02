import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
await page.click('text=Um Jogador')
await page.waitForTimeout(700)
await page.click('button:has-text("Começar")')
await page.waitForTimeout(700)
await page.click('button:has-text("ESCOLHER")')
await page.waitForTimeout(1000)

const nodes = await page.evaluate(() =>
  [...document.querySelectorAll('[class*="rq-node"]')].map((el) => ({
    tag: el.tagName, cls: el.className, text: el.textContent?.trim().slice(0, 40),
  })),
)
console.log(JSON.stringify(nodes, null, 2))
await browser.close()
