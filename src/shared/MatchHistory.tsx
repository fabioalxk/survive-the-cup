import type { MatchEvent } from '../sim/types'

/**
 * Histórico de lances da partida: quem marcou, em qual minuto, faltas, cartões
 * etc. Reaproveita o mesmo `MatchState.events` que alimenta a faixa efêmera
 * (`EventBanner`), aqui como lista persistente para o jogador conferir o que
 * já aconteceu no jogo — inclusive depois do apito final. `events` já chega
 * mais-recente-primeiro (o hook da partida inverte): estilo ticker ao vivo,
 * mesmo com pouca altura visível a primeira linha é sempre a última novidade.
 */
export function MatchHistory({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) return null
  return (
    <div className="cm-history">
      <h3 className="cm-history-title">Histórico da partida</h3>
      <ul className="cm-history-list" role="log" aria-live="polite">
        {events.map((e, i) => (
          <li key={i} className={`cm-history-ev cm-ev-${e.type}`}>
            <span className="cm-history-min">{e.minute}&apos;</span>
            <span className="cm-history-text">{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
