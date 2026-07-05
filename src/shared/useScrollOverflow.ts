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
    // conteúdo pode encolher sem rolar nem redimensionar a janela (ex.: compra
    // no mercado remove uma oferta da grade) — sem isto, a máscara de "tem
    // mais pra rolar" ficava presa ligada mesmo depois da lista caber inteira.
    const observer = new MutationObserver(check)
    observer.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      observer.disconnect()
    }
  }, [ref])

  return hasMore
}
