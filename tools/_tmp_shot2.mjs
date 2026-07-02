import { chromium } from 'playwright'

const outDir = 'C:/Users/fabio/AppData/Local/Temp/claude/C--Users-fabio-OneDrive-Documents-GitHub-cm/cd43c2a9-960c-4bdc-b691-338ca6b9b5f2/scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

await page.getByText('Um Jogador').click()
await page.waitForTimeout(500)
await page.getByText(/^Começar a jornada/).click()
await page.waitForTimeout(1200)
const firstBless = page.locator('.rq-bless-card').first()
if (await firstBless.count()) {
  await firstBless.click()
  await page.waitForTimeout(1200)
}
const node = page.locator('.rq-node-available').first()
await node.click()
await page.waitForTimeout(1000)

// acelera a partida (Turbo) e espera terminar
const turbo = page.getByText('Turbo')
if (await turbo.count()) await turbo.click()
await page.waitForTimeout(15000)
await page.screenshot({ path: `${outDir}/match-end.png` })
console.log('match-end screenshot done')

await browser.close()
