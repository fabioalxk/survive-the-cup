import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const browser = await chromium.launch()
const check = async (state, w, h, click) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const stateJson = readFileSync(`tools/.scratch-shots/states/${state}.json`, 'utf8')
  await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
  await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  if (click) { await page.click(click); await page.waitForTimeout(400) }
  const width = await page.$eval('.tv-pitch', (el) => el.getBoundingClientRect().width)
  console.log(`${state} @ ${w}x${h}${click ? ' +' + click : ''}: ${width}px`)
  await page.close()
}
await check('prematch', 1280, 800)
await check('prematch', 390, 844)
await check('gym', 1280, 800)
await check('market', 1280, 800)
await check('match', 1280, 800, "button:has-text('Tática')")
await check('match', 390, 844, "button:has-text('Tática')")
await browser.close()
