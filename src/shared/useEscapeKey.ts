import { useEffect, useRef } from 'react'

/** Chama `onEscape` enquanto `active`, sem recriar o listener a cada render. */
export function useEscapeKey(onEscape: () => void, active: boolean) {
  const callback = useRef(onEscape)
  callback.current = onEscape

  useEffect(() => {
    if (!active) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callback.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active])
}
