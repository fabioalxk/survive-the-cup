/** Botão "voltar" com badge redondo pintado (ver .rq-back em run.css). */
export function BackButton({ onClick, label = 'Voltar' }: { onClick: () => void; label?: string }) {
  return (
    <button className="rq-back" onClick={onClick}>
      {label}
    </button>
  )
}
