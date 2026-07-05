import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/market.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const btn = document.querySelector('.pb-skip, .rq-market-skip, .cm-btn-primary')
  const cards = [...document.querySelectorAll('.rc-card')]
  return {
    cardHeights: cards.map(c => c.getBoundingClientRect().height),
    lastCardBottom: cards.length ? cards[cards.length-1].getBoundingClientRect().bottom : null,
    scrollHeight: document.querySelector('.cm-backdrop')?.scrollHeight,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
