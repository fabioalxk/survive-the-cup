import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const entry = 'tools/.scratch-shots/gen-boss-prematch.entry.ts'
const outfile = resolve('.test-build-boss-pm.mjs')

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile,
  logLevel: 'info',
})
await import(pathToFileURL(outfile).href)
