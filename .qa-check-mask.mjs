import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } })
await page.goto('http://localhost:5189/', { waitUntil: 'networkidle' })
await page.locator('text=Um Jogador').click()
await page.waitForTimeout(300)
await page.locator('.rq-event-go').click()
await page.waitForTimeout(600)
if (await page.locator('.rq-bless-card').first().isVisible().catch(() => false)) {
  await page.locator('.rq-bless-card').first().click()
  await page.waitForTimeout(300)
}
// força uma checagem rápida sem navegar até o mercado: injeta a classe pra testar o CSS isoladamente
const style = await page.evaluate(() => {
  const div = document.createElement('div')
  div.className = 'rq-market-body'
  document.body.appendChild(div)
  const cs = getComputedStyle(div)
  const result = { webkitMask: cs.webkitMaskImage, mask: cs.maskImage }
  div.remove()
  return result
})
console.log(JSON.stringify(style))
await browser.close()
