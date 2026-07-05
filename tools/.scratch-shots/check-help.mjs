import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.click('button[title], button:has-text("?")').catch(() => {})
// tenta achar o botão de ajuda por aria/title
const helpBtn = await page.$('button[aria-label*="juda"], button[title*="juda"], button[title*="Como"]')
if (helpBtn) await helpBtn.click()
else await page.locator('.rq-topbar-help, header button').last().click().catch(() => {})
await page.waitForTimeout(600)
await page.screenshot({ path: 'tools/.scratch-shots/help-modal.png' })
await browser.close()
console.log('saved')
