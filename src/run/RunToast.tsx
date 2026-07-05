import { useEffect, useRef, useState } from 'react'

const SHOW_MS = 3200

/**
 * Confirmação em texto simples da última decisão (compra, troca, treino,
 * bênção…): o motor já loga tudo em `state.log`, só que ninguém mostrava —
 * essa faixa pega a linha mais nova e some sozinha, reforçando o que acabou
 * de acontecer sem precisar abrir nada.
 */
export default function RunToast({ log }: { log: string[] }) {
  const [msg, setMsg] = useState<string | null>(null)
  const seen = useRef(log.length)

  useEffect(() => {
    if (log.length <= seen.current) {
      seen.current = log.length
      return
    }
    seen.current = log.length
    setMsg(log[log.length - 1])
    const t = window.setTimeout(() => setMsg(null), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [log.length])

  if (!msg) return null
  return (
    <div className="rq-toast" role="status" key={log.length}>
      {msg}
    </div>
  )
}
