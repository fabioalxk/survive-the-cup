import { useEffect, type RefObject } from 'react'

/**
 * Aplica o atributo nativo `inert` (remove foco/interação da subárvore) via
 * DOM direto. Necessário porque o React 18 ainda não repassa essa prop para
 * o elemento em JSX (`<div inert={x}>` vira um no-op silencioso — suporte só
 * chegou no React 19), então setar a propriedade do DOM manualmente é o único
 * jeito confiável de usá-la aqui.
 */
export function useInert(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.inert = active
    return () => {
      el.inert = false
    }
  }, [ref, active])
}
