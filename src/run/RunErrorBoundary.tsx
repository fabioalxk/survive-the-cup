import { Component, type ReactNode } from 'react'
import { clearRunSave } from '../game/runSave'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

/**
 * Rede de segurança da corrida: se qualquer tela quebrar com um erro de
 * runtime, o React desmontaria tudo e deixaria a página em branco, sem
 * nenhuma explicação. Aqui em vez disso o jogador vê uma saída clara.
 */
export class RunErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Erro na corrida:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="cm-backdrop">
        <div className="cm-modal" role="alertdialog" aria-label="Algo deu errado">
          <h2>Algo deu errado</h2>
          <p className="cm-modal-sub">
            A tela travou de forma inesperada. Recarregar costuma resolver — sua corrida continua
            salva.
          </p>
          <div className="rq-crash-actions">
            <button
              className="cm-btn cm-btn-primary cm-btn-lg cm-btn-block"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
            <button
              className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-block"
              onClick={() => {
                clearRunSave()
                window.location.reload()
              }}
            >
              Apagar progresso e recomeçar do zero
            </button>
          </div>
        </div>
      </div>
    )
  }
}
