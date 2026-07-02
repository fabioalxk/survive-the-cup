// Gera as sprite sheets de AÇÕES (chute, cabeceio, cobrança de lateral, defesa
// do goleiro) — animações curtas de um só disparo, tocadas quando a simulação
// emite o evento correspondente (ver src/render/sprites.ts, triggerAction).
//
// Ao contrário do pool de corrida (6 variações de pele/cabelo), as ações usam
// UM único visual (o mesmo do body_00) — são flashes rápidos e pouco
// escrutinados; dá pra expandir pro pool inteiro depois se fizer diferença.
//
// Saída:
//   public/assets/sprites/action_kick.png
//   public/assets/sprites/action_header.png
//   public/assets/sprites/action_throwin.png
//   public/assets/sprites/action_save.png
//   public/assets/sprites/actions-manifest.json
//
// Uso:
//   node tools/generate-action-sprites.mjs             # tudo que falta
//   node tools/generate-action-sprites.mjs kick         # uma ação específica
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, apiKey, generateImage, runPool } from './_openaiImage.mjs'
import { SKINS, HAIRS } from './_playerAppearance.mjs'
import { sheetPreamble } from './_spriteStyle.mjs'

const CONCURRENCY = 2
// mesmo visual do body_00 (índice 0 do pool de corrida) — consistência entre o
// jogador correndo e o jogador executando a ação.
const APPEARANCE = `The player has ${SKINS[0]} skin and ${HAIRS[0]}.`

const grid = (cols, rows) => ({ cols, rows })

const ACTIONS = {
  kick: {
    dest: 'action_kick.png',
    grid: grid(3, 2),
    frames: 6,
    durationMs: 380,
    prompt:
      `${sheetPreamble('Exactly a 3x2 grid of 6 equal square cells separated by thin faint gray guide lines.')} ` +
      `${APPEARANCE} The player is facing straight up (north) and about to strike a stationary ball placed ` +
      'just in front of the right foot (the ball itself is NOT drawn, only the player). This is a shooting ' +
      'kick motion broken into 6 keyframes, reading left to right then top to bottom, camera strictly ' +
      'top-down in every cell:\n' +
      'Cell 1: standing balanced, right leg cocking back at the start of the backswing, arms starting to counter-balance.\n' +
      'Cell 2: right leg swung further back, knee bent, torso leaning back slightly, left arm forward for balance.\n' +
      'Cell 3: right leg at the peak of the backswing, fully cocked, torso coiled.\n' +
      'Cell 4: contact moment — right leg swinging forward fast, foot at the point of striking the ball, torso driving forward.\n' +
      'Cell 5: follow-through — right leg extended high and forward after the strike, arms out for balance.\n' +
      'Cell 6: recovery — right leg coming back down, returning toward a balanced standing pose.',
  },
  header: {
    dest: 'action_header.png',
    grid: grid(2, 2),
    frames: 4,
    durationMs: 480,
    prompt:
      `${sheetPreamble('Exactly a 2x2 grid of 4 equal square cells separated by thin faint gray guide lines.')} ` +
      `${APPEARANCE} The player is facing straight up (north) and jumping to head an incoming ball (the ball ` +
      'itself is NOT drawn, only the player). This is a jump-header motion broken into 4 keyframes, reading ' +
      'left to right then top to bottom, camera strictly top-down in every cell:\n' +
      'Cell 1: crouching down, knees bent, arms swinging back, about to jump.\n' +
      'Cell 2: mid-jump rising, legs tucked slightly, arms swinging up and out for lift, body slightly bigger/closer to camera to sell the jump.\n' +
      'Cell 3: peak of the jump, torso arched back and neck snapping forward as the head makes contact, arms out wide, body at its largest/closest to camera.\n' +
      'Cell 4: landing back down, knees bent to absorb impact, arms coming back down.',
  },
  throwin: {
    dest: 'action_throwin.png',
    grid: grid(2, 2),
    frames: 4,
    durationMs: 550,
    prompt:
      `${sheetPreamble('Exactly a 2x2 grid of 4 equal square cells separated by thin faint gray guide lines.')} ` +
      `${APPEARANCE} The player is facing straight up (north) and taking a two-handed soccer throw-in, holding ` +
      'a football overhead with both hands (the ball IS drawn here, held in the player\'s hands above/behind ' +
      'the head). This is a throw-in motion broken into 4 keyframes, reading left to right then top to ' +
      'bottom, camera strictly top-down in every cell:\n' +
      'Cell 1: starting stance, both arms raised holding the ball above the head, leaning back slightly to wind up.\n' +
      'Cell 2: arms fully arched back behind the head, back arched further, deep wind-up.\n' +
      'Cell 3: release moment — arms whipping forward over the top of the head, ball just leaving the hands in front of the player.\n' +
      'Cell 4: follow-through — arms extended forward and down after release, body leaning forward, ball no longer in hands (ball can be small and slightly ahead of the player or omitted in this frame).',
  },
  save: {
    dest: 'action_save.png',
    grid: grid(2, 2),
    frames: 4,
    durationMs: 480,
    mirrorable: true,
    prompt:
      `${sheetPreamble('Exactly a 2x2 grid of 4 equal square cells separated by thin faint gray guide lines.')} ` +
      'The player is a GOALKEEPER wearing goalkeeping gloves, facing straight up (north) at the start, diving ' +
      'to THEIR OWN RIGHT (to the right side of the frame) to save a shot. This is a diving-save motion broken ' +
      'into 4 keyframes, reading left to right then top to bottom, camera strictly top-down in every cell:\n' +
      'Cell 1: athletic ready crouch stance, weight balanced, gloved hands out front, facing up.\n' +
      'Cell 2: pushing off explosively to the right, body leaning hard to the right, legs driving off the ground.\n' +
      'Cell 3: fully stretched out horizontally in the air diving to the right, body almost horizontal, arms extended reaching to the right.\n' +
      'Cell 4: sprawled on the ground after landing the dive, still stretched out to the right side.',
  },
}

const run = async () => {
  const key = await apiKey()
  const names = process.argv.slice(2)
  const outDir = join(ROOT, 'public', 'assets', 'sprites')
  await mkdir(outDir, { recursive: true })

  const jobs = Object.entries(ACTIONS)
    .filter(([name]) => !names.length || names.includes(name))
    .map(([name, def]) => ({ name, dest: join(outDir, def.dest), prompt: def.prompt }))

  const pending = []
  for (const job of jobs) {
    if (await access(job.dest).then(() => true, () => false)) console.log(`⏭️  ${job.name} — já existe`)
    else pending.push(job)
  }
  console.log(`Gerando ${pending.length} sprite sheets de ação (concorrência ${CONCURRENCY})…\n`)

  const t0 = Date.now()
  const { done, fails } = await runPool(
    pending,
    async (job) => {
      const buf = await generateImage(key, job.prompt, { quality: 'high', format: 'png' })
      await writeFile(job.dest, buf)
      console.log(`✅ ${job.name} (${(buf.length / 1024).toFixed(0)}KB)`)
    },
    CONCURRENCY,
  )

  const manifest = Object.fromEntries(
    Object.entries(ACTIONS).map(([name, def]) => [
      name,
      { src: `/assets/sprites/${def.dest}`, grid: def.grid, frames: def.frames, durationMs: def.durationMs, mirrorable: !!def.mirrorable },
    ]),
  )
  await writeFile(join(outDir, 'actions-manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`\n${done}/${pending.length} ok em ${((Date.now() - t0) / 1000).toFixed(0)}s.`)
  if (fails.length) {
    console.log(`Falhas: ${fails.join(', ')}`)
    process.exitCode = 1
  }
}

run()
