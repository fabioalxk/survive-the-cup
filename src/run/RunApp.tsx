import { useEffect } from 'react'
import { useRun } from './useRun'
import { hasRunSave } from '../game/runSave'
import { uiClick } from '../sfx/crowd'
import NewRun from './NewRun'
import RunShell from './RunShell'
import '../career/career.css'
import './run.css'

/** Raiz do modo "Survive the Cup": menu inicial quando não há corrida, senão a corrida. */
export default function RunApp() {
  const api = useRun()

  // clique global: um "tick" discreto em QUALQUER botão do app, sem precisar
  // instrumentar cada tela — dá feedback sonoro consistente de ponta a ponta.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) uiClick()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (!api.state) {
    return <NewRun onStart={api.start} hasSave={hasRunSave()} onContinue={() => window.location.reload()} />
  }
  return <RunShell api={api} />
}
