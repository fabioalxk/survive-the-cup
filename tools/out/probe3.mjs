import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
await page.click('text=Um Jogador')
await page.waitForTimeout(700)
await page.click('button:has-text("Começar")')
await page.waitForTimeout(700)
// escolhe a primeira bênção
await page.click('button:has-text("ESCOLHER")')
await page.waitForTimeout(700)
await page.screenshot({ path: 'tools/out/03-map.png' })

// clica no primeiro nó de partida disponível (mapa é aleatório por sessão)
await page.click('button.rq-node-match.rq-node-available')
await page.waitForTimeout(700)
let text = await page.evaluate(() => document.body.innerText.slice(0, 800))
console.log('após clicar no nó:\n', text)
await page.screenshot({ path: 'tools/out/04-nodeclick.png' })

for (const label of ['Jogar partida', 'Jogar', 'Simular partida', 'Simular', 'Ir para partida', 'Entrar em campo', 'Iniciar partida', 'Confirmar']) {
  const btn = page.locator(`button:has-text("${label}")`).first()
  if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
    console.log('clicando', label)
    await btn.click()
    break
  }
}
await page.waitForTimeout(1500)
text = await page.evaluate(() => document.body.innerText.slice(0, 800))
console.log('depois:\n', text)
await page.screenshot({ path: 'tools/out/05-afterplay.png' })

const hasCanvas = await page.locator('canvas.cm-pitch-canvas').count()
console.log('canvas count:', hasCanvas)
if (hasCanvas > 0) {
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'tools/out/06-match-running.png' })
}
console.log('CONSOLE ERRORS:\n', errors.join('\n'))
await browser.close()
