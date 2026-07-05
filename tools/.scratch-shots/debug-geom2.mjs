import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, w, h] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w) || 844, height: Number(h) || 390 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return 'MISSING'
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { top: r.top, bottom: r.bottom, height: r.height, position: cs.position, overflowY: cs.overflowY, flex: cs.flex, order: cs.order }
  }
  return {
    backdrop: rect('.cm-backdrop'),
    modal: rect('.cm-modal.rq-prematch'),
    head: rect('.rq-prematch-head'),
    board: rect('.rq-prematch-board'),
    pitch: rect('.tv-pitch'),
    foot: rect('.rq-prematch-foot'),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
