import type { RunState } from './runTypes'
import { clampAscension } from './ascension'
import { defaultFormation } from '../sim/formation'
import { ensureIdAbove } from './generate'
import { lineupFor } from './lineup'
import { refreshSquadRatings, START_LIVES } from './run'

const KEY = 'cm-run-save-v1'
const ASCENSION_KEY = 'cm-ascension-unlocked-v1'

/** Há uma corrida salva no navegador? */
export const hasRunSave = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

/** Persiste a corrida no localStorage. */
export const saveRun = (state: RunState): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* armazenamento indisponível — ignora silenciosamente */
  }
}

/** Carrega a corrida salva (ou null). Reajusta o contador de ids gerados. */
export const loadRun = (): RunState | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as RunState
    // migração v1 → v2: saves antigos não tinham o sistema de vidas
    if (typeof state.lives !== 'number') state.lives = START_LIVES
    // migração: saves antigos não tinham formação editável (era 4-3-3 fixo)
    if (!state.formationSlots) state.formationSlots = defaultFormation()
    // migração v3 → v4: saves antigos não tinham nível de ascension (= 0, dificuldade normal)
    if (typeof state.ascension !== 'number') state.ascension = 0
    // migração v2 → v3: saves antigos não tinham o sistema de poções
    if (!state.potions) state.potions = []
    if (!state.activePotions) state.activePotions = []
    if (state.pendingPotion === undefined) state.pendingPotion = null
    // migração v4 → v5: saves antigos não tinham a bênção da largada (já em jornada: nada a oferecer)
    if (state.pendingBlessings === undefined) state.pendingBlessings = null
    // migração: saves antigos não tinham o histórico de decisões (toast de confirmação)
    if (!state.log) state.log = []
    // migração v5 → v6: o banco acabou — o elenco vira exatamente os 11 titulares,
    // na ordem dos slots da formação (índice = slot; quem estava no banco sai).
    const legacy = state as RunState & { startingIds?: number[] }
    if (legacy.startingIds) {
      const starters = state.squad.filter((p) => legacy.startingIds!.includes(p.id))
      const ordered = lineupFor(starters, state.formationSlots)
      state.squad = ordered.map((sp) => starters.find((p) => p.id === sp.id)!)
      delete legacy.startingIds
      refreshSquadRatings(state)
      state.version = 6
    }
    let maxId = 0
    for (const p of state.squad) maxId = Math.max(maxId, p.id)
    for (const n of state.nodes) for (const p of n.opponent?.squad ?? []) maxId = Math.max(maxId, p.id)
    for (const p of state.pendingReward ?? []) maxId = Math.max(maxId, p.id)
    ensureIdAbove(maxId)
    return state
  } catch {
    // save corrompido (json inválido, storage falhando no meio da leitura...):
    // apaga na hora. Sem isto, `hasRunSave()` continuava vendo a chave e a
    // tela inicial oferecia "Continuar corrida" pra sempre — um loop morto,
    // já que recarregar cai no mesmo catch de novo.
    clearRunSave()
    return null
  }
}

/** Apaga a corrida salva (game over / vitória / nova corrida). */
export const clearRunSave = (): void => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignora */
  }
}

/** Maior ascension já liberada (0 = só a dificuldade normal, ainda ninguém venceu o chefão). */
export const getUnlockedAscension = (): number => {
  try {
    const raw = localStorage.getItem(ASCENSION_KEY)
    return raw ? clampAscension(Number(raw)) : 0
  } catch {
    return 0
  }
}

/** Vencer o chefão na ascension `n` libera a `n+1` — uma de cada vez, em ordem. */
export const unlockNextAscension = (ascension: number): void => {
  const next = clampAscension(ascension + 1)
  if (next <= getUnlockedAscension()) return
  try {
    localStorage.setItem(ASCENSION_KEY, String(next))
  } catch {
    /* armazenamento indisponível — ignora silenciosamente */
  }
}
