import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/market.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.click('.rc-card-name')
await page.waitForTimeout(400)
await page.screenshot({ path: 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/c2578583-4228-40b3-9a93-3ee07ab8eb6e/scratchpad/ui-eval/viewport/market-armed.png' })
await browser.close()
