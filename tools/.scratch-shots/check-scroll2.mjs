import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, w, h] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
await page.addInitScript((json) => { localStorage.setItem('cm-run-save-v1', json) }, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const backdrop = document.querySelector('.cm-backdrop')
  return {
    overflowY: backdrop ? getComputedStyle(backdrop).overflowY : null,
    scrollHeight: backdrop ? backdrop.scrollHeight : null,
    clientHeight: backdrop ? backdrop.clientHeight : null,
    canScroll: backdrop ? backdrop.scrollHeight > backdrop.clientHeight : null,
  }
})
console.log(JSON.stringify(info, null, 2))
// try scrolling it and see if the button becomes reachable
const before = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Recusar'))
  return btn ? btn.getBoundingClientRect() : null
})
await page.evaluate(() => document.querySelector('.cm-backdrop').scrollTo(0, 9999))
await page.waitForTimeout(300)
const after = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Recusar'))
  return btn ? btn.getBoundingClientRect() : null
})
console.log('before', JSON.stringify(before))
console.log('after scroll', JSON.stringify(after))
await browser.close()
