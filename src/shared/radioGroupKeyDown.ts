import type { KeyboardEvent } from 'react'

/**
 * Navegação por setas dentro de um `role="radiogroup"`: as setas movem o foco
 * E a escolha entre as opções (como um `<input type=radio">` nativo), com
 * roda nas pontas. Preserva o Tab como UMA parada só se cada opção tiver
 * `tabIndex={checked ? 0 : -1}` (foco cai sempre na escolhida no momento).
 */
export function handleRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>) {
  const { key } = e
  if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'),
  )
  const idx = items.indexOf(document.activeElement as HTMLButtonElement)
  if (idx === -1) return
  e.preventDefault()
  const dir = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1
  const next = items[(idx + dir + items.length) % items.length]
  next.focus()
  next.click()
}
