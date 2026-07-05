import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/prematch.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
const chip = await page.$('[data-slot="1"]')
const box = await chip.boundingBox()
await page.mouse.move(box.x - 100, box.y - 100)
// tab into the page repeatedly and check which element has focus
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const active = await page.evaluate(() => document.activeElement?.getAttribute('data-slot'))
  if (active === '1') { console.log('reached chip 1 after', i + 1, 'tabs'); break }
}
await page.waitForTimeout(300)
const clipBox = await chip.boundingBox()
await page.screenshot({
  path: 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/411264fd-83a0-4d25-bb8a-1030d3b58462/scratchpad/focus-check2.png',
  clip: { x: clipBox.x - 30, y: clipBox.y - 30, width: clipBox.width + 60, height: clipBox.height + 60 },
})
const info = await page.evaluate(() => {
  const el = document.activeElement
  const photo = el.querySelector('.tv-chip-photo')
  const cs = getComputedStyle(photo)
  return { tag: el.tagName, cls: el.className, boxShadow: cs.boxShadow, matchesFocusVisible: el.matches(':focus-visible') }
})
console.log(JSON.stringify(info))
await browser.close()
