import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName = 'boss', scrollFrac = '0.5', outPath = 'tools/.scratch-shots/map-viewport.png'] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate((frac) => {
  const el = document.querySelector('.rq-map-scroll')
  if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * frac
}, Number(scrollFrac))
await page.waitForTimeout(300)
await page.screenshot({ path: outPath })
await browser.close()
console.log('saved', outPath)
