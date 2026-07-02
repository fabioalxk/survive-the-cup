import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)

await page.click('text=Um Jogador')

for (let step = 0; step < 20; step++) {
  await page.waitForTimeout(700)
  const hasCanvas = await page.locator('canvas.cm-pitch-canvas').count()
  if (hasCanvas > 0) {
    console.log(`Canvas encontrado no passo ${step}`)
    break
  }
  // tenta achar um botão "óbvio" de continuar/simular/jogar
  const candidates = [
    'Simular', 'Simular partida', 'Jogar', 'Iniciar', 'Continuar', 'Prosseguir', 'Confirmar',
    'Avançar', 'Próximo', 'Ir para o jogo', 'Entrar em campo', 'Começar', 'Aceitar',
  ]
  let clicked = false
  for (const label of candidates) {
    const btn = page.locator(`button:has-text("${label}")`).first()
    if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
      console.log(`passo ${step}: clicando "${label}"`)
      await btn.click().catch(() => {})
      clicked = true
      break
    }
  }
  if (!clicked) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 500))
    console.log(`passo ${step}: nada óbvio pra clicar. Texto atual:\n`, text)
    await page.screenshot({ path: `tools/out/step-${step}.png` })
    break
  }
}

await page.waitForTimeout(2000)
await page.screenshot({ path: 'tools/out/02-match.png' })
console.log('CONSOLE ERRORS:\n', errors.join('\n'))
await browser.close()
