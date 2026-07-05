import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/match.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.click("button:has-text('Tática')")
await page.waitForTimeout(400)
const w = await page.$eval('.tv-pitch', (el) => el.getBoundingClientRect().width)
console.log('cm-tactics-panel .tv-pitch width:', w)
await browser.close()
