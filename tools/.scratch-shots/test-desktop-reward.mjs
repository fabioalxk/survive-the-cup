import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/reward.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const count = await page.locator('.rc-card').count()
const pagerVisible = await page.locator('.rc-pager').count()
console.log(JSON.stringify({ cardCount: count, pagerCount: pagerVisible }))
await page.screenshot({ path: 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/c2578583-4228-40b3-9a93-3ee07ab8eb6e/scratchpad/ui-eval/reward-desktop.png' })
await browser.close()
