import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const OUT = 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/76db2553-5819-434c-bb9d-82f579afcbd9/scratchpad/shots'
const stateJson = readFileSync('tools/.scratch-shots/states/prematch.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => localStorage.setItem('cm-run-save-v1', json), stateJson)
await page.goto('http://localhost:5204/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
// toca em 2 jogadores do campinho pra trocar
const chips = page.locator('.tv-chip')
await chips.nth(0).click()
await page.waitForTimeout(300)
await chips.nth(1).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/undo-1-after-swap.png` })
// clica em Desfazer
const undo = page.locator('button:has-text("Desfazer")')
const hasUndo = await undo.isVisible().catch(() => false)
console.log('undo button visible:', hasUndo)
if (hasUndo) {
  await undo.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/undo-2-after-undo.png` })
}
await browser.close()
