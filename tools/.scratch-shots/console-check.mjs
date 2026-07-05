import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const issues = []
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') issues.push(`[${msg.type()}] ${msg.text()}`)
})
page.on('pageerror', (err) => issues.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => issues.push(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`))
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
console.log(`--- ${stateName} ---`)
console.log(issues.length ? issues.join('\n') : '(no console errors/warnings/failed requests)')
await browser.close()
