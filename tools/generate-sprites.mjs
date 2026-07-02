// Gera sprites de jogador correndo (visto de cima) para substituir o botão do
// futebol de botão, com a API de imagens da OpenAI (gpt-image-1).
//
// Ideia central: como a câmera do jogo é ortogonal de cima, UMA única pose
// (sempre "de frente para cima") cobre as 360° de direção — o jogo gira o
// sprite em runtime com base no vetor de velocidade (ctx.rotate), não precisa
// de sprite por direção. O que muda por combinação é a aparência do jogador
// (pele/cabelo), reaproveitando as mesmas paletas do pool de retratos.
//
// Cada imagem é uma grade 3x3 (9 quadros): os 8 primeiros são um ciclo de
// corrida completo, o 9º é o jogador parado (idle).
//
// O uniforme sai pintado numa cor-chave sólida (ver KIT_KEY_COLOR) que o jogo
// substitui em runtime pela cor real do time/clube — um único sprite por
// combinação de pele/cabelo serve para qualquer clube.
//
// Saída:
//   public/assets/sprites/body_NN.png      — pool de corpos (avatar por id % pool)
//   public/assets/sprites/manifest.json    — geometria da grade + metadados
//
// Re-run só gera o que falta (apague o .png para forçar regeneração).
//
// Uso:
//   node tools/generate-sprites.mjs             # tudo que falta
//   node tools/generate-sprites.mjs body_00      # um corpo específico
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, apiKey, generateImage, runPool } from './_openaiImage.mjs'
import { SKINS, HAIRS } from './_playerAppearance.mjs'

const CONCURRENCY = 2
const BODY_POOL_SIZE = 6

// Precisa bater com KIT_KEY_COLOR em src/render/spriteKit.ts — cor-chave para
// o replace de uniforme em runtime (verde-sinalização, não ocorre em pele,
// cabelo nem em kits reais).
export const KIT_KEY_COLOR = '#39FF14'

export const GRID = { cols: 3, rows: 3 }
export const RUN_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7]
export const IDLE_FRAME = 8

const RUN_POSES = [
  'right knee driving up high and bent toward the chest, left leg fully extended straight behind, left arm swung forward and right arm swung back',
  'right leg passing directly under the hips (recoil, both knees close together), arms passing near the body center',
  'right leg reaching forward straight and about to plant down, left leg trailing bent behind, arms near neutral crossing',
  'right foot just planted on the ground below the hips, left knee beginning to drive up bent, weight fully on the right leg',
  'left knee driving up high and bent toward the chest, left leg fully extended straight behind, right arm swung forward and left arm swung back',
  'left leg passing directly under the hips (recoil, both knees close together), arms passing near the body center',
  'left leg reaching forward straight and about to plant down, right leg trailing bent behind, arms near neutral crossing',
  'left foot just planted on the ground below the hips, right knee beginning to drive up bent, weight fully on the left leg',
]

// Mesmo registro de arte premium usado em ICON_STYLE/FACE_STYLE (generate-art.mjs)
// — é o que faz o conjunto parecer nível comercial, não clip-art chapado. Evita
// comparação com "retrato de menu" (puxa a composição pra 3/4 ou perfil).
const PREMIUM_STYLE =
  'Premium stylized 3D game character render, rich saturated colors, soft realistic global illumination, ' +
  'subtle ambient occlusion in the fabric folds and between the limbs, smooth rounded proportions with ' +
  'a light, appealing cartoon stylization (not flat clip-art, not photoreal), soft specular highlights ' +
  'on the hair and skin, gentle rim light, subtle cloth texture and stitching detail on the kit, crisp ' +
  'clean silhouette edge, high production value, the quality of a modern mobile game asset.'

const CAMERA_LOCK =
  'The camera is a static drone/satellite view locked at a strict 90° top-down angle for EVERY SINGLE ' +
  'cell, including the running poses. This is NOT a side-view running-animation reference sheet and the ' +
  'character is NEVER shown in profile or 3/4 view — you must always be looking straight down at the ' +
  'top of the head and the top of the shoulders, like looking down at someone from a drone directly ' +
  'above them. Never show the side of the face, never show the character\'s side silhouette. When in ' +
  'doubt, show MORE of the top of the head/shoulders and LESS of the front of the face.'

const GRID_STYLE =
  `${PREMIUM_STYLE} Sprite sheet for a 2D football video game. ${CAMERA_LOCK} Exactly a 3x3 grid of 9 ` +
  'equal square cells separated by thin faint gray guide lines. CRITICAL: everything outside the ' +
  'character silhouettes must be perfectly transparent (alpha = 0) — no vignette, no glow, no smoke, no ' +
  'radial gradient, no blurry halo, no drop shadow, no colored background of any kind, pure transparent ' +
  'PNG. ' +
  'The SAME male football player appears in every cell, always the exact same size and the exact same ' +
  'scale, hips always at the same height in the cell, centered horizontally, always facing straight up ' +
  '(north), camera angle never changes. Even lighting from directly above, no directional cast shadow ' +
  'on the character. ' +
  `The shirt, shorts and socks are all filled with pure flat solid chroma-key color ${KIT_KEY_COLOR} ` +
  '(exact single flat color with only subtle ambient-occlusion shading from the 3D render — no other ' +
  'hue, no pattern on the kit; it will be recolored programmatically later), football boots. This is a ' +
  'proper running gait cycle broken into 8 biomechanically distinct keyframes, reading left to right ' +
  'then top to bottom, each cell CLEARLY different from the others in leg and arm position (camera ' +
  'strictly top-down in every cell, never side-view):\n' +
  RUN_POSES.map((pose, i) => `Cell ${i + 1} (top-down view): ${pose}.`).join('\n') +
  '\nCell 9 (bottom-right): the player standing fully still in a relaxed idle pose, both feet flat on ' +
  'the ground shoulder-width apart, arms relaxed at the sides, facing up.\n' +
  'No text, no numbers, no watermark, no outer border, only the thin cell divider guide lines.'

const bodyPrompt = (i) =>
  `${GRID_STYLE} The player has ${SKINS[i % SKINS.length]} skin and ${HAIRS[i % HAIRS.length]}.`

const run = async () => {
  const key = await apiKey()
  const names = process.argv.slice(2)

  const outDir = join(ROOT, 'public', 'assets', 'sprites')
  await mkdir(outDir, { recursive: true })

  const jobs = []
  for (let i = 0; i < BODY_POOL_SIZE; i++) {
    const name = `body_${String(i).padStart(2, '0')}`
    if (names.length && !names.includes(name)) continue
    jobs.push({ name, dest: join(outDir, `${name}.png`), prompt: bodyPrompt(i) })
  }

  const pending = []
  for (const job of jobs) {
    if (await access(job.dest).then(() => true, () => false)) console.log(`⏭️  ${job.name} — já existe`)
    else pending.push(job)
  }
  console.log(`Gerando ${pending.length} sprite sheets (concorrência ${CONCURRENCY})…\n`)

  const t0 = Date.now()
  const { done, fails } = await runPool(
    pending,
    async (job) => {
      // png (não webp) — precisão exata da cor-chave importa para o replace em runtime.
      // quality 'high': o pool inteiro é só 6 imagens, vale pagar mais por acabamento comercial.
      const buf = await generateImage(key, job.prompt, { quality: 'high', format: 'png' })
      await writeFile(job.dest, buf)
      console.log(`✅ ${job.name} (${(buf.length / 1024).toFixed(0)}KB)`)
    },
    CONCURRENCY,
  )

  const manifest = {
    bodyPoolSize: BODY_POOL_SIZE,
    grid: GRID,
    runFrames: RUN_FRAMES,
    idleFrame: IDLE_FRAME,
    kitKeyColor: KIT_KEY_COLOR,
  }
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`\n${done}/${pending.length} ok em ${((Date.now() - t0) / 1000).toFixed(0)}s.`)
  if (fails.length) {
    console.log(`Falhas: ${fails.join(', ')}`)
    process.exitCode = 1
  }
}

run()
