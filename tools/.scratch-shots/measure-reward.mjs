import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/reward.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const scene = document.querySelector('.rc-scene')
  const cards = [...document.querySelectorAll('.rc-card')]
  const skip = document.querySelector('.pb-skip')
  const sub = document.querySelector('.rc-sub')
  const ribbon = document.querySelector('.cm-ribbon')
  return {
    docScrollHeight: document.scrollingElement.scrollHeight,
    sceneHeight: scene ? scene.getBoundingClientRect().height : null,
    ribbonHeight: ribbon ? ribbon.getBoundingClientRect().height : null,
    subHeight: sub ? sub.getBoundingClientRect().height : null,
    cardHeights: cards.map((c) => c.getBoundingClientRect().height),
    skipTop: skip ? skip.getBoundingClientRect().top : null,
    skipBottom: skip ? skip.getBoundingClientRect().bottom : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
