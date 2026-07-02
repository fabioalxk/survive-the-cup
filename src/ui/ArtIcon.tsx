/**
 * Ícone de arte gerada (ver tools/generate-art.mjs) — renderiza
 * /assets/icons/<name>.webp. Sem `size`, ocupa 1em e herda o tamanho do
 * font-size do container (mesmo encaixe que os emojis que substitui).
 */
export function ArtIcon({
  name,
  size,
  className = '',
  title,
}: {
  name: string
  size?: number
  className?: string
  title?: string
}) {
  const dim = size ? { width: size, height: size } : { width: '1em', height: '1em' }
  return (
    <img
      className={`cm-art-ico ${className}`}
      style={dim}
      src={`/assets/icons/${name}.webp`}
      alt=""
      title={title}
      loading="lazy"
      draggable={false}
    />
  )
}
