import { useRun } from './useRun'
import { hasRunSave } from '../game/runSave'
import NewRun from './NewRun'
import RunShell from './RunShell'
import '../career/career.css'
import './run.css'

/** Raiz do modo "Survive the Cup": menu inicial quando não há corrida, senão a corrida. */
export default function RunApp() {
  const api = useRun()
  if (!api.state) {
    return <NewRun onStart={api.start} hasSave={hasRunSave()} onContinue={() => window.location.reload()} />
  }
  return <RunShell api={api} />
}
