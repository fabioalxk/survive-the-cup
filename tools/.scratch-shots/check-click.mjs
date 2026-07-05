import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const stateJson = readFileSync('tools/.scratch-shots/states/map.json', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

// clica no nó disponível "Arábia Saudita" (partida) — deve ir pro vestiário
// force:true pq o pulso de escala (transform infinito) nunca deixa o elemento
// "estável" pro actionability check do Playwright — não é bug do app, é só a
// animação; um clique humano de verdade funciona normalmente.
await page.click('button[title*="Arábia Saudita"]', { force: true })
await page.waitForTimeout(800)
const bodyClass = await page.evaluate(() => document.body.innerText.slice(0, 200))
await page.screenshot({ path: 'tools/.scratch-shots/click-result.png' })
console.log('depois do clique, texto visivel:', bodyClass)
await browser.close()
