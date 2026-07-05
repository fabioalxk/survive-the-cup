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
  const scene = document.querySelector('.rc-scene') || document.querySelector('.pb-layout')?.parentElement
  const layout = document.querySelector('.pb-layout')
  return {
    bodyScrollHeight: document.body.scrollHeight,
    bodyClientHeight: document.body.clientHeight,
    sceneOverflowY: scene ? getComputedStyle(scene).overflowY : null,
    sceneScrollHeight: scene ? scene.scrollHeight : null,
    sceneClientHeight: scene ? scene.clientHeight : null,
    layoutBottom: layout ? layout.getBoundingClientRect().bottom : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
