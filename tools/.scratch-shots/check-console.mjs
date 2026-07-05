import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/progress.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const messages = []
page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`))
page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`))
page.on('requestfailed', (req) => messages.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`))
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await browser.close()
console.log(messages.length ? messages.join('\n') : 'sem mensagens de console/erros/requests falhas')
