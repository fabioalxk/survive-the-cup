import { useEffect, useRef, useState } from 'react'

const SHOW_MS = 3200

/**
 * Confirmação em texto simples da última decisão (compra, troca, treino,
 * bênção…): o motor já loga tudo em `state.log`, só que ninguém mostrava —
 * essa faixa pega a linha mais nova e some sozinha, reforçando o que acabou
 * de acontecer sem precisar abrir nada.
 */
export default function RunToast({ log }: { log: string[] }) {
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  // compara o CONTEÚDO da mensagem mais nova, não o tamanho do array: `state.log`
  // é mutado NO LUGAR (unshift/pop) e trava em 30 itens — usar `log.length` como
  // gatilho faria o toast parar de aparecer pro resto da corrida assim que o
  // histórico enche, já que o comprimento nunca mais muda depois disso.
  const latest = log[0]
  const seen = useRef(latest)
  // id sempre crescente: garante uma `key` nova a cada toast (mesmo repetindo o
  // mesmo texto duas vezes seguidas), reiniciando a animação de entrada sempre.
  const nextId = useRef(0)

  useEffect(() => {
    if (latest === undefined || latest === seen.current) return
    seen.current = latest
    nextId.current += 1
    setToast({ text: latest, id: nextId.current })
    const t = window.setTimeout(() => setToast(null), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [latest])

  if (!toast) return null
  return (
    <div className="rq-toast" role="status" key={toast.id}>
      {toast.text}
    </div>
  )
}
