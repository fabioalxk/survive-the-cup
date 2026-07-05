import { useEffect, useState, type RefObject } from 'react'

/** true enquanto o conteúdo do ref rolar para baixo passar da área visível. */
export function useScrollOverflow(ref: RefObject<HTMLElement | null>): boolean {
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [ref])

  return hasMore
}
