import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, w, h] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w) || 844, height: Number(h) || 390 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const board = document.querySelector('.rq-prematch-board')
  const pitch = document.querySelector('.tv-pitch')
  const presets = document.querySelector('.tv-presets-wrap') || document.querySelector('.tv-presets')
  const rect = (el) => el ? el.getBoundingClientRect() : null
  return {
    boardRect: rect(board),
    pitchRect: rect(pitch),
    presetsRect: rect(presets),
    boardScrollHeight: board?.scrollHeight,
    boardClientHeight: board?.clientHeight,
    boardOverflowY: board ? getComputedStyle(board).overflowY : null,
    pitchFlex: pitch ? getComputedStyle(pitch).flex : null,
    pitchMinWidth: pitch ? getComputedStyle(pitch).minWidth : null,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    innerW: window.innerWidth,
    innerH: window.innerHeight,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
