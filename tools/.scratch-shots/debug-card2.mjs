import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/market.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const attrs = document.querySelector('.pb-card .mk-attrs')
  const chain = []
  let el = attrs
  for (let i = 0; i < 6 && el; i++) {
    const cs = getComputedStyle(el)
    chain.push({
      tag: el.tagName, cls: el.className, w: el.offsetWidth,
      display: cs.display, width: cs.width, flex: cs.flex,
    })
    el = el.parentElement
  }
  return chain
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
