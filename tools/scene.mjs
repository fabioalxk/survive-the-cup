/**
 * Print de QUALQUER tela do jogo, para revisão visual.
 *
 * Usa a bancada `/harness.html?scene=…` (ver `src/harness/main.tsx`), que monta
 * a tela pedida num estado determinístico — sem depender de clicar o fluxo
 * inteiro nem de save no navegador. Mesma seed ⇒ mesma imagem.
 *
 *   node tools/scene.mjs --list
 *   node tools/scene.mjs map      --out reports/shots/map.png
 *   node tools/scene.mjs match    --wait 8000
 *   node tools/scene.mjs market   --portrait            (390×844, celular)
 *   node tools/scene.mjs gym      --clip 100,100,800,600
 *
 * Opções: --w --h --dpr --wait --portrait --clip x,y,w,h --seed --stage --query
 * Sai com código 1 se o console do navegador registrar erro.
 */
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const flag = (n) => argv.includes(`--${n}`)

const SCENES = [
  'menu',
  'map',
  'blessing',
  'prematch',
  'match',
  'fx',
  'reward',
  'market',
  'gym',
  'victory',
  'gameover',
  'lifelost',
]

if (flag('list')) {
  console.log(SCENES.join('\n'))
  process.exit(0)
}

const scene = argv.find((a) => !a.startsWith('--') && SCENES.includes(a)) ?? 'map'
const out = resolve(arg('out', `reports/shots/${scene}.png`))
const portrait = flag('portrait')
const width = Number(arg('w', portrait ? 390 : 1600))
const height = Number(arg('h', portrait ? 844 : 1000))
// a partida precisa de uns segundos rolando p/ o campo sair do saque inicial
const wait = Number(arg('wait', scene === 'match' ? 6000 : 2500))

mkdirSync(dirname(out), { recursive: true })

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const params = new URLSearchParams({ scene, seed: arg('seed', '7'), stage: arg('stage', '0') })
const extra = arg('query', '')
const url = `${base}/harness.html?${params}${extra ? `&${extra}` : ''}`

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: Number(arg('dpr', 2)),
})
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(wait)

const clipArg = arg('clip', '')
const clip = clipArg
  ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(clipArg.split(',').map(Number))
  : undefined
await page.screenshot({ path: out, clip })

// erro de autoplay de áudio é do ambiente headless, não do jogo — não conta
const real = errors.filter((e) => !/play\(\) failed|NotAllowedError/.test(e))
console.log(JSON.stringify({ scene, out, url, errors: real }, null, 2))

await browser.close()
await server.close()
process.exit(real.length ? 1 : 0)
