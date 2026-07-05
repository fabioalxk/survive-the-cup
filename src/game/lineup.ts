import type { Role, Vec2 } from '../sim/types'
import { FORMATION_433, type SeedPlayer } from '../sim/teams'
import { roleForSlot, rolesFor } from '../sim/formation'
import type { GenPlayer } from './types'

/**
 * Monta a escalação (11 SeedPlayer para o motor animado) a partir do elenco e
 * das âncoras da formação (padrão 4-3-3): melhor goleiro + melhores jogadores
 * por função, encaixados nos slots. A função de cada slot vem da POSIÇÃO da
 * âncora (`rolesFor`), então um esquema arrastado pelo usuário escala sozinho.
 * Faltando jogadores de uma função, completa com os melhores restantes
 * (qualquer um) — o motor sempre recebe 11 botões.
 */
export const lineupFor = (squad: GenPlayer[], slots: Vec2[] = FORMATION_433): SeedPlayer[] => {
  const byRole: Record<Role, GenPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const p of squad) byRole[p.role].push(p)
  for (const r of Object.keys(byRole) as Role[]) byRole[r].sort((a, b) => b.overall - a.overall)

  const used = new Set<number>()
  const pickFor = (role: Role): GenPlayer => {
    const fromRole = byRole[role].find((p) => !used.has(p.id))
    const chosen =
      fromRole ?? [...squad].sort((a, b) => b.overall - a.overall).find((p) => !used.has(p.id))!
    used.add(chosen.id)
    return chosen
  }

  return rolesFor(slots).map((role, i) => {
    const p = pickFor(role)
    return {
      id: p.id,
      number: p.number,
      name: p.name,
      role,
      attrs: p.attrs,
      formationPos: { ...slots[i] },
    }
  })
}

/**
 * Escalação POR SLOT (modo run): `squad[i]` joga na âncora `slots[i]`, sem
 * re-agrupar por função — a função de cada um é derivada da posição da âncora.
 * É o que garante que o time montado no campinho entre em campo exatamente igual.
 */
export const lineupFromSlots = (squad: GenPlayer[], slots: Vec2[]): SeedPlayer[] =>
  slots.map((slot, i) => ({
    id: squad[i].id,
    number: squad[i].number,
    name: squad[i].name,
    role: roleForSlot(i, slot),
    attrs: squad[i].attrs,
    formationPos: { ...slot },
  }))
