// Gera arte do jogo (ícones da UI e retratos de jogadores fictícios) com a
// API de imagens da OpenAI (gpt-image-1), usando a CHATPGPT_API_KEY do .env.
//
// Saída:
//   public/assets/icons/<nome>.webp   — ícones com fundo transparente
//   public/assets/faces/face_NN.webp  — pool de retratos (avatar por id % pool)
//
// Re-run só gera o que falta (apague o .webp para forçar regeneração).
//
// Uso:
//   node tools/generate-art.mjs            # tudo que falta
//   node tools/generate-art.mjs icons      # só ícones
//   node tools/generate-art.mjs faces      # só retratos
//   node tools/generate-art.mjs icons coin trophy   # ícones específicos
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, apiKey, generateImage, runPool } from './_openaiImage.mjs'
import { SKINS, HAIRS, BEARDS, AGES } from './_playerAppearance.mjs'

const CONCURRENCY = 1
const FACE_POOL_SIZE = 48

// =====================================================================
// Estilo único — é o que faz o conjunto parecer coeso/comercial.
// =====================================================================

const ICON_STYLE =
  'Stylized glossy 3D game icon for a premium dark-themed football roguelike UI. ' +
  'Vibrant saturated colors, soft top-down studio lighting, subtle warm rim light, ' +
  'smooth rounded shapes with slight cartoon proportions, gentle specular highlights. ' +
  'Single centered object filling most of the frame, transparent background, no text, no border, no frame.'

const FACE_STYLE =
  'Stylized 3D cartoon portrait bust of a fictional professional footballer, game avatar style. ' +
  'Head and shoulders, front facing, confident subtle smile, wearing a plain dark navy training top. ' +
  'Soft studio lighting, clean silhouette, slight cartoon proportions like a modern football game, ' +
  'transparent background, no text.'

// =====================================================================
// Catálogo de ícones — nome do arquivo → assunto (o estilo é comum).
// =====================================================================

const ICONS = {
  // Bênçãos da largada (BlessingView)
  bless_sponsor: 'an overflowing burlap money bag full of shiny golden coins, a few coins spilling',
  bless_potionkit: 'an open leather medic bag holding three small glowing potion flasks (red, blue, green)',
  bless_extralife: 'a radiant glossy red heart with a soft golden glow around it',
  bless_star: 'a brilliant golden five-pointed star with sparkles and light rays',
  bless_captain: "a bright yellow captain's armband with a small golden star emblem",
  bless_wonderkid: 'a brilliant sparkling cyan-blue diamond gem',
  bless_pact: 'a mischievous grinning purple devil head with small horns and glowing eyes',
  // Poções (PotionsHud / RewardCards)
  potion_strength: 'a round red glass potion flask with a small flexed-muscle arm emblem on the label, cork stopper',
  potion_pace: 'a slim blue glass potion flask with a yellow lightning bolt emblem on the label, cork stopper',
  // HUD / navegação
  coin: 'a single thick golden coin with an embossed soccer ball, slightly tilted',
  trophy: 'a majestic golden champions trophy with handles on a small dark base',
  ball: 'a classic black and white soccer ball',
  heart: 'a glossy vivid red heart',
  heart_broken: 'a glossy vivid red heart broken in two halves by a jagged crack down the middle',
  skull: 'a stylized ivory-white cartoon skull with dark hollow eye sockets',
  home: 'a cozy small house with a warm glowing window',
  plane: 'a stylized white and blue passenger airplane tilted upward as if taking off',
  jersey: 'a folded football jersey, blue with white trim, front view',
  cart: 'a chrome shopping cart with a soccer ball sitting inside',
  chart: 'a bar chart with three rising golden bars on a small dark panel',
  news: 'a folded newspaper with bold headline blocks',
  phone: 'a classic red telephone handset',
  gift: 'a gift box with golden ribbon and bow, lid slightly open with light spilling out',
  // Eventos da partida (EventBanner)
  card_red: 'a glossy bright red referee penalty card, slightly tilted',
  card_yellow: 'a glossy bright yellow referee penalty card, slightly tilted',
  whistle: 'a shiny silver referee whistle with a short lanyard',
  stopwatch: 'a classic silver stopwatch with a golden button, face showing 45 minutes',
  target: 'an archery target with an arrow in the bullseye',
  corner_flag: 'a football corner flag with a bright orange triangular flag on a white pole',
  finish_flag: 'a waving black and white checkered finish flag on a short pole',
  medic: 'a white first aid kit case with a red cross',
  fire: 'a stylized vivid orange flame with a yellow core',
  // Textura de fundo do retrato nas cartas de escolha de jogador (RewardCards)
  card_spotlight:
    'a dramatic warm white circular stadium spotlight beam bursting from the center, soft radial glow and light bloom, cinematic lens flare, no floor, no object, no text',
}

// =====================================================================
// Pool de retratos — combinações determinísticas (i fixo → mesma descrição),
// com diversidade típica do futebol brasileiro.
// =====================================================================

const facePrompt = (i) =>
  `${FACE_STYLE} The player is ${AGES[i % AGES.length]} man with ${SKINS[i % SKINS.length]} skin, ` +
  `${HAIRS[i % HAIRS.length]}, ${BEARDS[(i * 3 + Math.floor(i / 5)) % BEARDS.length]}.`

const run = async () => {
  const key = await apiKey()
  const [what = 'all', ...names] = process.argv.slice(2)

  const jobs = []
  if (what === 'all' || what === 'icons') {
    const outDir = join(ROOT, 'public', 'assets', 'icons')
    await mkdir(outDir, { recursive: true })
    for (const [name, subject] of Object.entries(ICONS)) {
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt: `${ICON_STYLE} Subject: ${subject}.`, quality: 'medium' })
    }
  }
  if (what === 'all' || what === 'faces') {
    const outDir = join(ROOT, 'public', 'assets', 'faces')
    await mkdir(outDir, { recursive: true })
    for (let i = 0; i < FACE_POOL_SIZE; i++) {
      const name = `face_${String(i).padStart(2, '0')}`
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt: facePrompt(i), quality: 'low' })
    }
  }

  // Re-run só gera o que falta.
  const pending = []
  for (const job of jobs) {
    if (await access(job.dest).then(() => true, () => false)) console.log(`⏭️  ${job.name} — já existe`)
    else pending.push(job)
  }
  console.log(`Gerando ${pending.length} imagens (concorrência ${CONCURRENCY})…\n`)

  const t0 = Date.now()
  const { done, fails } = await runPool(
    pending,
    async (job) => {
      const buf = await generateImage(key, job.prompt, { quality: job.quality })
      await writeFile(job.dest, buf)
      console.log(`✅ ${job.name} (${(buf.length / 1024).toFixed(0)}KB)`)
    },
    CONCURRENCY,
  )

  console.log(`\n${done}/${pending.length} ok em ${((Date.now() - t0) / 1000).toFixed(0)}s.`)
  if (fails.length) {
    console.log(`Falhas: ${fails.join(', ')}`)
    process.exitCode = 1
  }
}

run()
