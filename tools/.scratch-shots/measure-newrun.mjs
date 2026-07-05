import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript(() => localStorage.clear())
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const info = await page.evaluate(() => {
  const title = document.querySelector('.rq-title')
  const menu = document.querySelector('.rq-menu')
  const csTitle = getComputedStyle(title)
  const csMenu = getComputedStyle(menu)
  return {
    version: navigator.userAgent,
    titlePaddingTop: csTitle.paddingTop,
    titleJustifyContent: csTitle.justifyContent,
    menuMargin: csMenu.margin,
    menuRect: menu.getBoundingClientRect(),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
