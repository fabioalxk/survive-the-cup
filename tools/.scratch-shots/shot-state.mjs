// Injeta um save (gerado por gen-states.mjs) no localStorage e tira screenshot direto
// da tela correspondente — evita depender de navegação aleatória pelo mapa.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [, , stateName, url, outPath] = process.argv
const stateJson = readFileSync(`tools/.scratch-shots/states/${stateName}.json`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript((json) => {
  localStorage.setItem('cm-run-save-v1', json)
}, stateJson)
await page.goto(url, { waitUntil: 'networkidle' })
// 1.5s: já vi captura "quase preta" (falso positivo) pegando o modal no meio da
// animação de entrada (scale/opacity) com um wait menor — não é bug do app.
await page.waitForTimeout(1500)
await page.screenshot({ path: outPath, fullPage: true })
await browser.close()
console.log('saved', outPath)
