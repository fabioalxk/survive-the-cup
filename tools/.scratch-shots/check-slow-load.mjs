import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
// atrasa só a imagem de fundo do mapa (o resto carrega normal, incluindo fontes)
await page.route('**/bg_map.webp', async (route) => {
  await new Promise((r) => setTimeout(r, 2000))
  await route.continue()
})
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
page.goto('http://localhost:5173', { waitUntil: 'load' }).catch(() => {})
await page.waitForTimeout(900)
await page.screenshot({ path: 'tools/.scratch-shots/slow-load-early.png', timeout: 60000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: 'tools/.scratch-shots/slow-load-late.png', timeout: 60000 })
await browser.close()
console.log('saved')
