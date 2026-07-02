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
//   node tools/generate-art.mjs cards      # molduras de carta + ribbon
//   node tools/generate-art.mjs buttons    # placas de botão + badges redondos
//   node tools/generate-art.mjs nodes      # medalhões dos nós do mapa
//   node tools/generate-art.mjs orbs       # orbes de vidro das poções
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
// Molduras de carta (RewardCards + MarketPlayerCard) — estilo "deck-builder"
// pintado à mão (referência: Slay the Spire), uma variante por posição.
// O interior fica escuro e VAZIO: o conteúdo (retrato, atributos, botão) é
// HTML posicionado por cima via CSS (border-image), então a arte só precisa
// da borda ornamentada + painel interno limpo.
// =====================================================================

const CARD_FRAME_STYLE =
  'Ornate trading-card frame for a premium dark-themed football roguelike video game, ' +
  'hand-painted deck-builder card game style with rich painterly detail. ' +
  'A single portrait-orientation card frame filling the ENTIRE canvas exactly edge to edge (no margin around it). ' +
  'Sculpted metallic border with decorated corners, engraved filigree and subtle football (soccer) motifs ' +
  'worked into the ornaments (tiny laurel wreaths, a small ball emblem at the top center). ' +
  'The interior of the card is a plain very dark navy panel with a faint smoky texture and is completely EMPTY: ' +
  'no text, no portrait, no icons, no symbols inside the panel — it must stay clean for UI content. ' +
  'No text anywhere.'

// gpt-image-2 não suporta fundo transparente: as molduras são opacas ocupando o
// canvas inteiro (o CSS recorta os cantos); só o ribbon precisa de transparência
// (pontas em bandeira), então usa gpt-image-1.5.
const FRAME_OPTS = { model: 'gpt-image-2', background: null, size: '1024x1536' }

const CARDS = {
  card_frame_gk: {
    prompt: `${CARD_FRAME_STYLE} Border theme: polished gold and warm amber metal with a soft golden glow.`,
    opts: FRAME_OPTS,
  },
  card_frame_def: {
    prompt: `${CARD_FRAME_STYLE} Border theme: cool steel blue and sapphire metal with an icy blue glow.`,
    opts: FRAME_OPTS,
  },
  card_frame_mid: {
    prompt: `${CARD_FRAME_STYLE} Border theme: emerald green and jade metal with a soft green glow.`,
    opts: FRAME_OPTS,
  },
  card_frame_fwd: {
    prompt: `${CARD_FRAME_STYLE} Border theme: crimson red and dark ruby metal with a fiery red glow.`,
    opts: FRAME_OPTS,
  },
  ribbon_title: {
    prompt:
      'A wide horizontal parchment ribbon banner for a video game title, hand-painted deck-builder card game style. ' +
      'Aged tan paper gently curved like cloth, folded darker swallow-tail ends on both sides, thin golden trim, ' +
      'soft painterly shading. The center of the ribbon is completely empty for a title to be typed over it. ' +
      'Transparent background, no text anywhere.',
    opts: { model: 'gpt-image-1.5', size: '1536x1024' },
  },
}

// =====================================================================
// Placas de botão (9-slice) + badges redondos — substituem o gradiente CSS
// dos botões por uma superfície pintada. A placa é um quadrado pintado até a
// borda (mesmo truque das molduras de carta); o CSS fatia os cantos com
// border-image, então qualquer tamanho/largura de botão funciona sem distorcer
// (o degradê central só estica, não tem padrão repetitivo pra criar costura).
// =====================================================================

const BTN_PLATE_STYLE =
  'A single square UI button plate for a premium dark-themed football roguelike game, ' +
  'filling the ENTIRE canvas exactly edge to edge with no margin, no letterboxing, no visible background: ' +
  'the corner radius arcs must touch the canvas edges exactly at the tangent point so absolutely zero ' +
  'background color is ever visible in the four corners. ' +
  'Rounded-rectangle shape with corner radius about 15% of the canvas width. ' +
  'Smooth vertical glossy gradient surface, subtle bright specular highlight band near the top edge, ' +
  'soft darker shading near the bottom edge for depth, faint fine brushed-metal micro texture, ' +
  'no text, no icon, no pattern, no border outline, no drop shadow outside the shape.'

const BTN_ROUND_STYLE =
  'A single circular glossy 3D UI badge button for a premium dark-themed football roguelike game, ' +
  'filling most of the frame, metallic rim with a soft specular highlight near the top, ' +
  'transparent background, no square edges, no text.'

const PLATE_OPTS = { model: 'gpt-image-2', background: null, size: '1024x1024' }

const BUTTONS = {
  btn_plate: {
    prompt: `${BTN_PLATE_STYLE} Color theme: neutral dark slate steel (deep navy-grey), subtle cool tone.`,
    opts: PLATE_OPTS,
  },
  btn_plate_primary: {
    prompt: `${BTN_PLATE_STYLE} Color theme: vivid royal blue metal, rich and saturated.`,
    opts: PLATE_OPTS,
  },
  btn_plate_go: {
    prompt: `${BTN_PLATE_STYLE} Color theme: vivid emerald green metal, energetic and saturated, like a "go/confirm" call to action.`,
    opts: PLATE_OPTS,
  },
  btn_round_back: {
    prompt: `${BTN_ROUND_STYLE} Dark slate steel metal badge with a bold embossed thick white left-pointing chevron arrow centered on it.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
  btn_round_close: {
    prompt: `${BTN_ROUND_STYLE} Dark slate steel metal badge with a bold embossed thick white X (close) mark centered on it.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
}

// =====================================================================
// Medalhões dos nós do mapa (MapView) — substituem o círculo de
// radial-gradient plano atrás do escudo do clube por uma moldura metálica
// pintada. O interior fica vazio (mesmo truque das molduras de carta): o
// escudo do clube é HTML por cima; só o aro precisa de arte.
// =====================================================================

const NODE_MEDALLION_STYLE =
  'A single circular UI medallion badge for a premium dark-themed football roguelike game map node, ' +
  'filling most of the frame, glossy sculpted metal rim with a beveled edge and a soft specular highlight ' +
  'near the top, tiny engraved laurel details on the rim. ' +
  'The flat interior disc is a plain dark navy panel with a faint smoky texture and is completely EMPTY: ' +
  'no text, no crest, no icon, no symbol inside — it must stay clean for a club badge to sit on top. ' +
  'Transparent background outside the circle, no text anywhere.'

const NODES = {
  node_medallion: {
    prompt: `${NODE_MEDALLION_STYLE} Rim theme: brushed silver-steel metal, cool neutral tone.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
  node_medallion_boss: {
    prompt: `${NODE_MEDALLION_STYLE} Rim theme: polished gold and deep crimson red metal, dramatic and imposing, richer ornamentation.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
}

// =====================================================================
// Orbes de vidro das poções (PotionsHud) — substituem o círculo de
// gradiente CSS atrás do frasco (ver .rq-potion-chip/.rq-potion-head-ico em
// run.css) por uma esfera de vidro pintada; o frasco (ícone já gerado,
// potion_strength/pace.webp) continua por cima.
// =====================================================================

const POTION_ORB_STYLE =
  'A single circular glowing glass orb badge for a premium dark-themed football roguelike game HUD, ' +
  'filling most of the frame, translucent glass sphere with a bright specular highlight near the top-left, ' +
  'an inner magical glow radiating outward from the center, a thin polished metallic rim, ' +
  'transparent background, no text, no icon or symbol inside the orb.'

const ORBS = {
  potion_orb_strength: {
    prompt: `${POTION_ORB_STYLE} Color theme: fiery vivid red glow, like a strength/power potion.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
  potion_orb_pace: {
    prompt: `${POTION_ORB_STYLE} Color theme: electric cyan-blue glow, like a speed/pace potion.`,
    opts: { model: 'gpt-image-1', size: '1024x1024' },
  },
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
  if (what === 'all' || what === 'cards') {
    const outDir = join(ROOT, 'public', 'assets', 'cards')
    await mkdir(outDir, { recursive: true })
    for (const [name, { prompt, opts }] of Object.entries(CARDS)) {
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt, quality: 'high', opts })
    }
  }
  if (what === 'all' || what === 'buttons') {
    const outDir = join(ROOT, 'public', 'assets', 'ui')
    await mkdir(outDir, { recursive: true })
    for (const [name, { prompt, opts }] of Object.entries(BUTTONS)) {
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt, quality: 'high', opts })
    }
  }
  if (what === 'all' || what === 'nodes') {
    const outDir = join(ROOT, 'public', 'assets', 'ui')
    await mkdir(outDir, { recursive: true })
    for (const [name, { prompt, opts }] of Object.entries(NODES)) {
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt, quality: 'high', opts })
    }
  }
  if (what === 'all' || what === 'orbs') {
    const outDir = join(ROOT, 'public', 'assets', 'ui')
    await mkdir(outDir, { recursive: true })
    for (const [name, { prompt, opts }] of Object.entries(ORBS)) {
      if (names.length && !names.includes(name)) continue
      jobs.push({ name, dest: join(outDir, `${name}.webp`), prompt, quality: 'high', opts })
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
      const buf = await generateImage(key, job.prompt, { quality: job.quality, ...job.opts })
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
