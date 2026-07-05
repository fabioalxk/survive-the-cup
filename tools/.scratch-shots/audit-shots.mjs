// Screenshot de todos os estados salvos (states/*.json), desktop + mobile, para auditoria de UI.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'

const url = process.argv[2] || 'http://localhost:5174'
const outDir = process.argv[3] || 'tools/.scratch-shots/audit'
mkdirSync(outDir, { recursive: true })

const states = [
  'map', 'map-potions', 'gym', 'market', 'market-empty',
  'prematch', 'match', 'reward', 'blessing',
  'lifelost', 'gameover', 'victory', 'boss', 'boss-prematch', 'progress', 'longprogress',
]

const viewports = {
  desktop: { width: 1366, height: 800 },
  mobile: { width: 390, height: 844 },
}

const browser = await chromium.launch()
for (const [vpName, viewport] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport })
  for (const name of states) {
    let json
    try {
      json = readFileSync(`tools/.scratch-shots/states/${name}.json`, 'utf8')
    } catch {
      console.log('skip (no state file)', name)
      continue
    }
    await page.addInitScript((j) => {
      localStorage.setItem('cm-run-save-v1', j)
    }, json)
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const out = `${outDir}/${name}-${vpName}.png`
    await page.screenshot({ path: out, fullPage: false })
    console.log('saved', out)
    await page.evaluate(() => localStorage.clear())
  }
  await page.close()
}

// título/menu (sem save)
for (const [vpName, viewport] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${outDir}/title-menu-${vpName}.png` })
  await page.click('.rq-menu-item:has-text("Um Jogador")')
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${outDir}/title-setup-${vpName}.png` })
  await page.close()
}

await browser.close()
console.log('done')
