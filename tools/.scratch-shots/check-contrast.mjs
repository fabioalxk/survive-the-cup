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

// pega cor computada do texto e a cor de fundo renderizada (via getComputedStyle
// + amostra de pixel real do canvas da página, já que o fundo é um gradiente
// translúcido sobre a imagem do campo)
const result = await page.evaluate(() => {
  const cap = document.querySelector('.rq-node-cap')
  const rect = cap.getBoundingClientRect()
  const style = getComputedStyle(cap)
  return {
    color: style.color,
    background: style.backgroundImage || style.backgroundColor,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  }
})
console.log('estilo computado do rótulo:', JSON.stringify(result, null, 2))

// amostra de pixel real (canvas) pra pegar a cor de fundo composta de verdade
const bgSample = await page.evaluate(async () => {
  const cap = document.querySelector('.rq-node-cap')
  const rect = cap.getBoundingClientRect()
  // pega um ponto perto da borda esquerda do pill (fundo, sem letra) e outro
  // no meio de uma letra (ex.: o "C" de "COSTA RICA")
  return { edgeX: rect.x + 4, edgeY: rect.y + rect.height / 2 }
})
console.log('ponto de amostra (borda do pill):', bgSample)
await browser.close()
