import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync(`tools/.scratch-shots/states/market.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.addInitScript((json) => localStorage.setItem('cm-run-save-v1', json), stateJson)
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.click('.ps-info')
await page.waitForTimeout(300)
await page.screenshot({ path: 'tools/.scratch-shots/loop-attrinfo.png' })
await browser.close()
console.log('saved')
