import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/reward.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const card = document.querySelector('.pb-card')
  const attr = document.querySelector('.pb-card .ps-attr')
  const val = document.querySelector('.pb-card .ps-attr .ps-attr-val')
  const rect = (el) => el ? { w: el.offsetWidth, h: el.offsetHeight, cs: (()=>{ const c = getComputedStyle(el); return { padding: c.padding, gridTemplateColumns: c.gridTemplateColumns, flexDirection: c.flexDirection } })() } : null
  return { card: rect(card), attr: rect(attr), val: rect(val) }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
