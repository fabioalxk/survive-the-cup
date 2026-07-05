import { chromium } from 'playwright'

const OUT = 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/76db2553-5819-434c-bb9d-82f579afcbd9/scratchpad/shots'

async function settle(page) {
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(350)
    if (await page.locator('.rq-bless-card').first().isVisible().catch(() => false)) {
      await page.locator('.rq-bless-card').first().click()
      continue
    }
    if (await page.locator('button:has-text("Recusar reforço")').first().isVisible().catch(() => false)) {
      await page.locator('button:has-text("Recusar reforço")').first().click()
      continue
    }
    if (await page.locator('button:has-text("Continuar a corrida")').first().isVisible().catch(() => false)) {
      await page.locator('button:has-text("Continuar a corrida")').first().click()
      continue
    }
    if (await page.locator('button:has-text("Pegar")').first().isVisible().catch(() => false)) {
      // poção oferecida antes do reforço — recusar reforço já cobre, mas por via das dúvidas
      break
    }
    if (await page.locator('h2:has-text("ELIMINADO")').first().isVisible().catch(() => false)) return 'over'
    if (await page.locator('h2:has-text("VENCEU")').first().isVisible().catch(() => false)) return 'won'
    break
  }
  return 'ok'
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } })
await page.goto('http://localhost:5189/', { waitUntil: 'networkidle' })
await page.locator('text=Um Jogador').click()
await page.waitForTimeout(300)
await page.locator('.rq-event-go').click()
await settle(page)

let found = { market: false }
for (let round = 0; round < 6 && !found.market; round++) {
  if (await page.locator('.rq-node-market.rq-node-available').first().isVisible().catch(() => false)) {
    await page.locator('.rq-node-market.rq-node-available').first().click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/market-screen.png` })
    found.market = true
    break
  }

  const matchNode = page.locator('.rq-node-match.rq-node-available').first()
  if (!(await matchNode.isVisible().catch(() => false))) {
    console.log(`round ${round}: no available match node — stuck. found=`, found)
    break
  }
  await matchNode.click()
  await page.waitForTimeout(500)
  const pular = page.locator('button:has-text("Pular")').first()
  if (await pular.isVisible().catch(() => false)) await pular.click()
  const status = await settle(page)
  if (status !== 'ok') {
    console.log(`round ${round}: run ended (${status}). found=`, found)
    break
  }
}
console.log('final found:', JSON.stringify(found))

await browser.close()
