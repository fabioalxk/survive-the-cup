import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const stateJson = readFileSync('tools/.scratch-shots/states/prematch.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => localStorage.setItem('cm-run-save-v1', json), stateJson)
await page.goto('http://localhost:5204/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.locator('.tv-chip').nth(0).click()
await page.waitForTimeout(500)
const info = await page.evaluate(() => {
  const pop = document.querySelector('.rq-detail-pop')
  const simple = document.querySelector('.rq-simple-detail')
  const cs = pop ? getComputedStyle(pop) : null
  const rect = simple?.getBoundingClientRect()
  // procura ancestrais com transform/filter/contain que criem containing block pra fixed
  let ancestor = pop?.parentElement
  const containers = []
  while (ancestor) {
    const acs = getComputedStyle(ancestor)
    if (acs.transform !== 'none' || acs.filter !== 'none' || acs.willChange !== 'auto' || acs.contain !== 'none' || acs.backdropFilter !== 'none') {
      containers.push({ tag: ancestor.tagName, cls: ancestor.className, transform: acs.transform, filter: acs.filter, willChange: acs.willChange, contain: acs.contain, backdropFilter: acs.backdropFilter })
    }
    ancestor = ancestor.parentElement
  }
  return {
    popDisplay: cs?.display, popPosition: cs?.position, popRight: cs?.right, popTop: cs?.top,
    simpleRect: rect ? { top: rect.top, right: rect.right, width: rect.width } : null,
    blockingAncestors: containers,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
