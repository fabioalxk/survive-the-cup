import { useState } from 'react'
import { getPlayerPhotoUrl } from '../game/playerPhotos'
import { GeneratedFace } from './generatedFace'

/** Tamanho do pool de retratos gerados (tools/generate-art.mjs → public/assets/faces). */
const FACE_POOL_SIZE = 48

/** Retrato do pool escolhido pelo `id` — mesmo id, mesma cara a run inteira. */
const poolFaceUrl = (id: number) =>
  `/assets/faces/face_${String(Math.abs(id) % FACE_POOL_SIZE).padStart(2, '0')}.webp`

/**
 * Foto do jogador (`/players/<teamId>/<slug>.png`, baixada por
 * tools/download-player-photos.mjs) quando ele faz parte de um elenco real
 * com fotos baixadas (hoje só a seleção brasileira). Jogador fictício usa um
 * retrato do pool gerado (determinístico pelo `id`). Se a imagem falhar,
 * cai para o rosto cartoon SVG — nenhuma tela quebra por falta de arquivo.
 */
export function PlayerAvatar({
  teamId,
  name,
  id,
  size = 28,
  className = '',
}: {
  teamId: string | undefined
  name: string
  id: number
  size?: number
  className?: string
}) {
  const [failedAt, setFailedAt] = useState(0)
  const box = { width: size, height: size }
  // candidatos em ordem: foto real → retrato do pool → (SVG como último recurso)
  const sources = [getPlayerPhotoUrl(teamId, name), poolFaceUrl(id)].filter(
    (s): s is string => !!s,
  )
  const src = sources[failedAt]

  if (!src)
    return (
      <span className={`cm-player-avatar cm-player-avatar-fallback ${className}`} style={box}>
        <GeneratedFace seed={id} size={size} />
      </span>
    )

  return (
    <img
      className={`cm-player-avatar ${className}`}
      style={box}
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailedAt((i) => i + 1)}
    />
  )
}
