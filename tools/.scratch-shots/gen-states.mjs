// Bundla e roda gen-states.entry.ts com esbuild (mesmo padrão de tools/run-tests.mjs),
// gerando os JSONs de estado em tools/.scratch-shots/states/*.json
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const entry = 'tools/.scratch-shots/gen-states.entry.ts'
const outfile = resolve('.test-build-shots.mjs')

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
