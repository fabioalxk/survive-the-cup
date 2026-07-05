// Estilo visual e cores-chave compartilhados por TODOS os scripts de geração
// de sprite de jogador (corrida, chute, cabeceio, lateral, defesa do goleiro).
// Fonte única — mudar o visual ou a cor-chave aqui vale pra todo o pool.

// Precisam bater com src/render/sprites.ts (KIT_KEY_HUES) — 3 cores-chave bem
// separadas em matiz (verde/azul/magenta) pra recolorir cada peça do uniforme
// (camisa/short/meião) de forma independente em runtime, sem confundir uma
// com a outra nem com pele/cabelo/bota.
export const KIT_KEYS = {
  shirt: '#39FF14', // verde-sinalização
  shorts: '#0044FF', // azul puro
  socks: '#FF00AA', // magenta
}

// Mesmo registro de arte premium usado em ICON_STYLE/FACE_STYLE (generate-art.mjs)
// — é o que faz o conjunto parecer nível comercial, não clip-art chapado. Evita
// comparação com "retrato de menu" (puxa a composição pra 3/4 ou perfil).
export const PREMIUM_STYLE =
  'Premium stylized 3D game character render, rich saturated colors, soft realistic global illumination, ' +
  'subtle ambient occlusion in the fabric folds and between the limbs, smooth rounded proportions with ' +
  'a light, appealing cartoon stylization (not flat clip-art, not photoreal), soft specular highlights ' +
  'on the hair and skin, gentle rim light, subtle cloth texture and stitching detail on the kit, crisp ' +
  'clean silhouette edge, high production value, the quality of a modern mobile game asset.'

export const CAMERA_LOCK =
  'The camera is locked at a strict SIDE VIEW at the character\'s chest height for EVERY SINGLE cell, ' +
  'like a classic 2D side-scrolling video game sprite. This is NOT a top-down or bird\'s-eye reference ' +
  'sheet and the character is NEVER seen from above — the full standing body is always visible with the ' +
  'feet at the bottom of the cell and the head at the top, upright, obeying gravity. The character ' +
  'ALWAYS faces the RIGHT side of the frame in clean side profile in every cell, never facing the ' +
  'camera, never facing left, never tilted. When in doubt, show a cleaner right-facing side profile ' +
  'silhouette.'

/** Trecho de prompt que descreve as 3 cores-chave do uniforme (reusar em toda pose/ação). */
export const KIT_KEY_PROMPT =
  `The shirt is filled with pure flat solid chroma-key color ${KIT_KEYS.shirt}, the shorts with pure ` +
  `flat solid chroma-key color ${KIT_KEYS.shorts}, and the socks with pure flat solid chroma-key color ` +
  `${KIT_KEYS.socks} (exact colors, only subtle ambient-occlusion shading from the 3D render — no other ` +
  'hue, no pattern on any of the 3 pieces; they will be recolored programmatically later, each ' +
  'independently), football boots in plain black or white.'

/** Cabeçalho comum de toda sprite sheet: estilo + câmera + transparência + cores-chave. */
export const sheetPreamble = (extraFraming = '') =>
  `${PREMIUM_STYLE} Sprite sheet for a 2D football video game. ${CAMERA_LOCK} ${extraFraming} CRITICAL: ` +
  'everything outside the character silhouettes must be perfectly transparent (alpha = 0) — no vignette, ' +
  'no glow, no smoke, no radial gradient, no blurry halo, no drop shadow, no colored background of any ' +
  `kind, pure transparent PNG. ${KIT_KEY_PROMPT}`
