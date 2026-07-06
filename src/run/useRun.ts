import { useCallback, useRef, useState } from 'react'
import type { RunState } from '../game/runTypes'
import { newRun } from '../game/run'
import { clearRunSave, loadRun, saveRun, unlockNextAscension } from '../game/runSave'

/** Estado da corrida. Mesmo padrão do `useCareer`: mutação in-place + versão p/ re-render. */
export interface RunApi {
  state: RunState | null
  act: (fn: (s: RunState) => void) => void
  start: (managerName: string, clubId: string, ascension: number) => void
  reset: () => void
}

export const useRun = (): RunApi => {
  const ref = useRef<RunState | null>(null)
  if (ref.current === null) ref.current = loadRun()
  const [, setVersion] = useState(0)
  const render = useCallback(() => setVersion((v) => v + 1), [])

  const act = useCallback(
    (fn: (s: RunState) => void) => {
      if (!ref.current) return
      fn(ref.current)
      if (ref.current.status === 'victory') unlockNextAscension(ref.current.ascension)
      saveRun(ref.current)
      render()
    },
    [render],
  )

  const start = useCallback(
    (managerName: string, clubId: string, ascension: number) => {
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
      ref.current = newRun(managerName, clubId, seed, ascension)
      saveRun(ref.current)
      render()
    },
    [render],
  )

  const reset = useCallback(() => {
    clearRunSave()
    ref.current = null
    render()
  }, [render])

  return { state: ref.current, act, start, reset }
}
