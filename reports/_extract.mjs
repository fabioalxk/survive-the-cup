/**
 * Extrai a lista de achados pendentes do resultado de um workflow de auditoria
 * visual (uso pontual: alimenta a rodada seguinte de correções).
 *
 *   node reports/_extract.mjs <arquivo-de-saida-do-workflow>
 */
import { readFileSync, writeFileSync } from 'node:fs'

const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const result = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result

const all = []
for (const s of result.pendentes ?? [])
  for (const f of s.restantes ?? []) all.push({ surface: s.surface.slice(0, 70), ...f })

const byTarget = {}
for (const f of all) (byTarget[f.target] = byTarget[f.target] || []).push(f)
for (const k of Object.keys(byTarget)) {
  const list = byTarget[k]
  const n = (sev) => list.filter((f) => f.severity === sev).length
  console.log(`${k}: ${list.length} (bloqueante ${n('bloqueante')}, grave ${n('grave')}, medio ${n('medio')})`)
}
writeFileSync('reports/pending.json', JSON.stringify(all, null, 1))
console.log('TOTAL', all.length)
