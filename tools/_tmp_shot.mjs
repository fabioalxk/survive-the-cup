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
await page.screenshot({ path: `${outDir}/map1.png` })

// clica no primeiro nó disponível (uma partida)
const node = page.locator('.rq-node-available').first()
console.log('available nodes:', await page.locator('.rq-node-available').count())
if (await node.count()) {
  await node.click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/after-node-click.png` })
  console.log('clicked node, url state captured')
}

await browser.close()
