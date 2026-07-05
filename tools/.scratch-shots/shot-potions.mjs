import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const PORT = process.env.PORT || 5177
const stateJson = readFileSync('tools/.scratch-shots/states/map-potions.json', 'utf8')
const browser = await chromium.launch()

const shot = async (name, viewport, openModal) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
  await page.addInitScript((json) => {
    localStorage.setItem('cm-run-save-v1', json)
  }, stateJson)
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  if (openModal) {
    await page.click('.rq-potion-chip')
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: `tools/.scratch-shots/out/${name}.png` })
  await page.close()
  console.log('saved', name)
}

await shot('potions-idle-desktop', { width: 1280, height: 800 })
await shot('potions-idle-mobile', { width: 390, height: 844 })
await shot('potions-modal-desktop', { width: 1280, height: 800 }, true)
await shot('potions-modal-mobile', { width: 390, height: 844 }, true)

await browser.close()
console.log('done')
