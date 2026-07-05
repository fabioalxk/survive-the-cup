import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/reward.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const card = document.querySelector('.pb-card')
  const attr = document.querySelector('.pb-card .ps-attr')
  const rect = (el) => el ? { w: el.offsetWidth, cs: (()=>{ const c = getComputedStyle(el); return { gridTemplateColumns: c.gridTemplateColumns, padding: c.padding } })() } : null
  return { card: rect(card), attr: rect(attr) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
