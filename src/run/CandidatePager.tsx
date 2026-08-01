import { ChevronSideIcon } from '../ui/icons'

/**
 * Paginação de reforços (recompensa/mercado): no celular só cabe UMA carta
 * cheia (todos os atributos, sem esconder nada) por vez — isto navega entre
 * elas sem precisar rolar a tela. Ausente com 1 candidato só.
 */
export function CandidatePager({
  count,
  index,
  onSelect,
}: {
  count: number
  index: number
  onSelect: (i: number) => void
}) {
  if (count <= 1) return null
  return (
    <div className="rc-pager">
      <button
        className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico rc-pager-arrow"
        disabled={index === 0}
        onClick={() => onSelect(index - 1)}
        aria-label="Reforço anterior"
      >
        <ChevronSideIcon dir="left" size={17} />
      </button>
      <span className="rc-pager-dots" role="tablist" aria-label="Reforços disponíveis">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Reforço ${i + 1} de ${count}`}
            className={`rc-pager-dot ${i === index ? 'is-active' : ''}`}
            onClick={() => onSelect(i)}
          />
        ))}
      </span>
      <button
        className="cm-btn cm-btn-ghost cm-btn-sm cm-btn-ico rc-pager-arrow"
        disabled={index === count - 1}
        onClick={() => onSelect(index + 1)}
        aria-label="Próximo reforço"
      >
        <ChevronSideIcon dir="right" size={17} />
      </button>
    </div>
  )
}
