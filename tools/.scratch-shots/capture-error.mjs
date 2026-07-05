import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/match.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (err) => errors.push({ message: err.message, stack: err.stack }))
page.on('console', (msg) => { if (msg.type() === 'error') errors.push({ console: msg.text() }) })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5183', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
console.log(JSON.stringify(errors, null, 2))
await browser.close()
