import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const state = JSON.parse(readFileSync('tools/.scratch-shots/states/boss-prematch.json', 'utf-8'))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((s) => {
  localStorage.setItem('cm-run-save-v1', JSON.stringify(s))
}, state)
await page.goto('http://localhost:5183')
await page.waitForTimeout(1200)
await page.screenshot({ path: 'tools/.scratch-shots/boss-pm-check.png' })
await browser.close()
