import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/boss.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate(() => {
  const el = document.querySelector('.rq-map-scroll')
  if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.5
})
await page.waitForTimeout(300)
await page.screenshot({ path: 'tools/.scratch-shots/zoom-peru.png', clip: { x: 800, y: 330, width: 100, height: 100 } })
await page.screenshot({ path: 'tools/.scratch-shots/zoom-holanda.png', clip: { x: 960, y: 180, width: 100, height: 100 } })
await browser.close()
console.log('saved')
