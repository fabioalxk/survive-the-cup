import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
page.on('pageerror', (e) => console.log('pageerror:', e.message))

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
await page.click('text=Um Jogador')
await page.waitForTimeout(700)
await page.click('button:has-text("Começar")')
await page.waitForTimeout(700)
await page.click('button:has-text("ESCOLHER")')
await page.waitForTimeout(1000)

// dump clickable-ish elements containing "Partida"
const info = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')].filter((el) => el.textContent?.trim() === 'Partida')
  return all.map((el) => ({ tag: el.tagName, cls: el.className, disabled: el.disabled, outer: el.outerHTML.slice(0, 300) }))
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
