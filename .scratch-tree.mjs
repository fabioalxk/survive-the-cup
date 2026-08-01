import { chromium } from 'playwright'
import { createServer } from 'vite'

const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1] }
const scene = argv.find((a) => !a.startsWith('--')) ?? 'prematch'
const portrait = argv.includes('--portrait')
const width = Number(arg('w', portrait ? 390 : 1600))
const height = Number(arg('h', portrait ? 844 : 1000))

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const url = `${base}/harness.html?scene=${scene}&seed=${arg('seed', '7')}&stage=${arg('stage', '0')}`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(2500)
const depth = Number(arg('depth', 5))

const data = await page.evaluate((depth) => {
  const box = (el) => { const r = el.getBoundingClientRect(); return `${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}` }
  const walk = (el, d = 0, out = []) => {
    if (d > depth) return out
    out.push('  '.repeat(d) + '<' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + '> ' + box(el))
    for (const c of el.children) walk(c, d + 1, out)
    return out
  }
  return walk(document.body).join('\n')
}, depth)
console.log(data)
await browser.close(); await server.close(); process.exit(0)
