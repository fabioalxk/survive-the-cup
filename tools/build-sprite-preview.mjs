// Gera um HTML autocontido (data URIs embutidos) para pré-visualizar os
// sprites de corpo correndo antes de integrá-los no jogo de verdade.
// Reamostra os PNGs de 1024px para um tamanho menor só para caber no preview.
//
// Uso: node tools/build-sprite-preview.mjs
// Saída: tools/out/sprite-preview.html
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT } from './_openaiImage.mjs'
import { decodePng, encodePng, resamplePng } from './_pngLite.mjs'

const PREVIEW_SIZE = 320

const run = async () => {
  const spritesDir = join(ROOT, 'public', 'assets', 'sprites')
  const manifest = JSON.parse(await readFile(join(spritesDir, 'manifest.json'), 'utf8'))
  const files = (await readdir(spritesDir)).filter((f) => f.startsWith('body_') && f.endsWith('.png')).sort()

  const bodies = []
  for (const file of files) {
    const buf = await readFile(join(spritesDir, file))
    const small = resamplePng(decodePng(buf), PREVIEW_SIZE)
    const dataUri = `data:image/png;base64,${encodePng(small).toString('base64')}`
    bodies.push({ name: file.replace('.png', ''), dataUri })
  }

  const html = buildHtml(manifest, bodies)
  const outDir = join(ROOT, 'tools', 'out')
  await mkdir(outDir, { recursive: true })
  const outPath = join(outDir, 'sprite-preview.html')
  await writeFile(outPath, html)
  console.log(`✅ ${outPath} (${(html.length / 1024).toFixed(0)}KB, ${bodies.length} corpos)`)
}

const buildHtml = (manifest, bodies) => `<title>Preview — sprites de jogador correndo</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #0f1720; color: #e8edf3;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { color: #93a3b5; margin: 0 0 24px; font-size: 14px; }
  .layout { display: grid; grid-template-columns: 360px 1fr; gap: 32px; align-items: start; }
  .panel {
    background: #17212c; border: 1px solid #29394a; border-radius: 12px; padding: 16px;
  }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; color: #93a3b5; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
  .swatches { display: flex; gap: 8px; flex-wrap: wrap; }
  .swatch {
    width: 32px; height: 32px; border-radius: 8px; border: 2px solid transparent; cursor: pointer;
  }
  .swatch.active { border-color: #fff; }
  input[type=range] { width: 100%; }
  .bodyGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .bodyGrid button {
    background: #1f2c3a; border: 2px solid transparent; border-radius: 8px; padding: 6px; cursor: pointer;
  }
  .bodyGrid button.active { border-color: #4ade80; }
  .bodyGrid canvas { display: block; width: 100%; image-rendering: pixelated; }
  .stage {
    background:
      linear-gradient(45deg, #1a2530 25%, transparent 25%) -10px 0/20px 20px,
      linear-gradient(-45deg, #1a2530 25%, transparent 25%) -10px 0/20px 20px,
      linear-gradient(45deg, transparent 75%, #1a2530 75%) -10px 0/20px 20px,
      linear-gradient(-45deg, transparent 75%, #1a2530 75%) -10px 0/20px 20px,
      #101820;
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    min-height: 420px;
  }
  .stage canvas { image-rendering: pixelated; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  code { background: #1f2c3a; padding: 1px 5px; border-radius: 4px; }
  .fieldPanel { margin-top: 20px; }
  .fieldPanel .row { margin-bottom: 10px; }
  .fieldPanel h2 { font-size: 14px; margin: 0; }
  .fieldPanel p { color: #93a3b5; font-size: 12px; margin: 2px 0 0; }
  .zoomToggle { display: flex; gap: 6px; }
  .zoomToggle button {
    background: #1f2c3a; color: #e8edf3; border: 2px solid transparent; border-radius: 6px;
    padding: 4px 10px; font-size: 12px; cursor: pointer;
  }
  .zoomToggle button.active { border-color: #4ade80; }
  .idleToggle { background: #1f2c3a; color: #e8edf3; border: 2px solid transparent; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
  .idleToggle.active { border-color: #f7d117; }
  #fieldStage {
    background-image: repeating-linear-gradient(90deg, #3a7a48 0 40px, #458a55 40px 80px);
    border-radius: 12px; overflow: hidden;
  }
  #realField { display: block; width: 100%; height: auto; }
</style>

<h1>⚽ Sprites de jogador correndo — preview</h1>
<p class="sub">
  Uma única pose vista de cima cobre as 360° (o jogo gira o sprite com <code>ctx.rotate</code> pelo vetor de
  velocidade). A cor da camisa/shorts/meião é trocada em runtime por matiz preservando a luminosidade —
  um sprite serve para qualquer clube. O quadro de corrida faz <em>crossfade</em> com o próximo (mistura por
  alfa) em vez de trocar seco — é o que dá a sensação de movimento contínuo com só 8 poses.
</p>

<div class="layout">
  <div class="panel">
    <div class="field">
      <label>Cor do time</label>
      <div class="swatches" id="swatches"></div>
    </div>
    <div class="field">
      <label>Ângulo (arraste ou use o slider) — <span id="angleLabel">0°</span></label>
      <input type="range" id="angle" min="0" max="359" value="0" />
    </div>
    <div class="field">
      <div class="row"><label style="margin:0">Velocidade da corrida</label><button class="idleToggle" id="idleToggle">Parado (idle)</button></div>
      <input type="range" id="speed" min="0" max="100" value="55" />
    </div>
    <div class="field">
      <label>Corpo (pele + cabelo) — pool de ${bodies.length}, escolhido hoje por <code>id % pool</code></label>
      <div class="bodyGrid" id="bodyGrid"></div>
    </div>
  </div>

  <div>
    <div class="stage"><canvas id="hero" width="360" height="360"></canvas></div>

    <div class="fieldPanel">
      <div class="row">
        <div>
          <h2>Tamanho real em campo (34px de diâmetro — igual ao botão hoje)</h2>
          <p>O jogador em destaque (anel amarelo) espelha exatamente o ângulo/animação de cima.</p>
        </div>
        <div class="zoomToggle" id="zoomToggle"></div>
      </div>
      <div id="fieldStage"><canvas id="realField" width="900" height="260"></canvas></div>
    </div>
  </div>
</div>

<script>
const MANIFEST = ${JSON.stringify(manifest)};
const BODIES = ${JSON.stringify(bodies)};
const TEAM_COLORS = [
  { name: 'Brasil (amarelo)', hex: '#f7d117' },
  { name: 'Argentina (azul)', hex: '#5aa9e6' },
  { name: 'Vermelho clássico', hex: '#dc2626' },
  { name: 'Preto/branco', hex: '#e5e7eb' },
  { name: 'Verde', hex: '#16a34a' },
  { name: 'Roxo', hex: '#7c3aed' },
];

// ---- utilidades de cor -----------------------------------------------
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function hueDist(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

// Cor-chave do uniforme nos sprites gerados (verde) — ver KIT_KEY_COLOR em
// tools/generate-sprites.mjs. A tolerância cobre o sombreado que a IA aplicou
// mesmo pedindo cor chapada.
const KEY_HUE = hexToHsl(MANIFEST.kitKeyColor)[0];

/** Recolore o uniforme (matiz próximo do verde-chave) preservando luminosidade. */
function recolorKit(imageData, targetHex) {
  const [targetHue, targetSat] = hexToHsl(targetHex);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (s < 0.2) continue; // preto/pele têm baixa saturação — não é o uniforme
    const dist = hueDist(h, KEY_HUE);
    if (dist > 55) continue; // fora da faixa do verde-chave — pele/contorno
    const weight = 1 - Math.min(1, dist / 55);
    const [nr, ng, nb] = hslToRgb(targetHue, targetSat, l);
    d[i] = d[i] + (nr - d[i]) * weight;
    d[i + 1] = d[i + 1] + (ng - d[i + 1]) * weight;
    d[i + 2] = d[i + 2] + (nb - d[i + 2]) * weight;
  }
  return imageData;
}

// ---- carregamento dos sprites + cache de recolorização ----------------
const loadedImgs = {};
function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

const tintCache = new Map(); // \`\${bodyName}|\${teamHex}\` -> canvas já recolorido
async function getTintedCanvas(bodyName, teamHex) {
  const key = bodyName + '|' + teamHex;
  if (tintCache.has(key)) return tintCache.get(key);
  const body = BODIES.find((b) => b.name === bodyName);
  if (!loadedImgs[bodyName]) loadedImgs[bodyName] = await loadImg(body.dataUri);
  const img = loadedImgs[bodyName];
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorKit(imageData, teamHex);
  ctx.putImageData(imageData, 0, 0);
  tintCache.set(key, canvas);
  return canvas;
}

// ---- estado + render ---------------------------------------------------
const REAL_PX = 34; // diâmetro real hoje: PHYS.playerRadius(0.9m) * 1.55 * SCALE(12px/m) ≈ 33.5px
let state = { bodyName: BODIES[0].name, teamHex: TEAM_COLORS[0].hex, angle: 0, speed: 55, idle: false, frameFloat: 0, zoom: 1 };

function gridCellOf(frame) {
  return { col: frame % MANIFEST.grid.cols, row: Math.floor(frame / MANIFEST.grid.cols) };
}

/**
 * Desenha o sprite girado, com crossfade entre o quadro atual e o próximo
 * (mistura por alfa) — some com o "pulo" de ter só 8 poses de corrida.
 */
function drawSprite(ctx, canvasSrc, cx, cy, size, angleDeg, frameFloat, idle) {
  const cellW = canvasSrc.width / MANIFEST.grid.cols;
  const cellH = canvasSrc.height / MANIFEST.grid.rows;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  const draw = (frame, alpha) => {
    const { col, row } = gridCellOf(frame);
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvasSrc, col * cellW, row * cellH, cellW, cellH, -size / 2, -size / 2, size, size);
  };
  if (idle) {
    draw(MANIFEST.idleFrame, 1);
  } else {
    const n = MANIFEST.runFrames.length;
    const f = ((frameFloat % n) + n) % n;
    const i0 = Math.floor(f);
    const t = f - i0;
    draw(MANIFEST.runFrames[i0], 1);
    if (t > 0.001) draw(MANIFEST.runFrames[(i0 + 1) % n], t);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

const heroCanvas = document.getElementById('hero');
const heroCtx = heroCanvas.getContext('2d');

async function renderHero() {
  const tinted = await getTintedCanvas(state.bodyName, state.teamHex);
  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
  drawSprite(heroCtx, tinted, heroCanvas.width / 2, heroCanvas.height / 2, 260, state.angle, state.frameFloat, state.idle);
}

// ---- campo em tamanho real: N jogadores decorativos + 1 sincronizado com o herói ----
const realCanvas = document.getElementById('realField');
const realCtx = realCanvas.getContext('2d');
const DECOR_COUNT = 9;
const decorPlayers = Array.from({ length: DECOR_COUNT }, (_, i) => ({
  body: BODIES[i % BODIES.length].name,
  x: (i + 0.5) / DECOR_COUNT,
  y: 0.28 + 0.44 * ((i * 0.61803) % 1), // espalhado, determinístico (proporção áurea)
  angle: (360 / DECOR_COUNT) * i * 1.3,
  phase: i * 1.7,
}));

async function renderRealField() {
  const w = realCanvas.width, h = realCanvas.height;
  realCtx.clearRect(0, 0, w, h);
  const size = REAL_PX * state.zoom;
  for (const p of decorPlayers) {
    const tinted = await getTintedCanvas(p.body, state.teamHex);
    drawSprite(realCtx, tinted, p.x * w, p.y * h, size, p.angle, state.frameFloat + p.phase, state.idle);
  }
  // jogador em destaque — mesmo ângulo/corpo/frame do herói acima
  const highlighted = await getTintedCanvas(state.bodyName, state.teamHex);
  const hx = w / 2, hy = h * 0.72;
  realCtx.beginPath();
  realCtx.arc(hx, hy, size / 2 + 5, 0, Math.PI * 2);
  realCtx.strokeStyle = '#fde047';
  realCtx.lineWidth = 2;
  realCtx.stroke();
  drawSprite(realCtx, highlighted, hx, hy, size, state.angle, state.frameFloat, state.idle);
}

// ---- loop de animação (independente de FPS, como o jogo real) ---------
let last = performance.now();
function tick(now) {
  const dt = (now - last) / 1000; last = now;
  if (!state.idle) {
    const stepsPerSec = 2 + (state.speed / 100) * 10; // cadência da passada
    state.frameFloat += dt * stepsPerSec;
  }
  renderHero();
  renderRealField();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---- UI -----------------------------------------------------------------
const swatchesEl = document.getElementById('swatches');
TEAM_COLORS.forEach((t, i) => {
  const el = document.createElement('div');
  el.className = 'swatch' + (i === 0 ? ' active' : '');
  el.style.background = t.hex; el.title = t.name;
  el.onclick = () => { state.teamHex = t.hex; [...swatchesEl.children].forEach((c) => c.classList.remove('active')); el.classList.add('active'); };
  swatchesEl.append(el);
});
const customPicker = document.createElement('input');
customPicker.type = 'color'; customPicker.value = '#ffffff';
customPicker.className = 'swatch'; customPicker.style.padding = '0'; customPicker.style.background = 'none';
customPicker.oninput = () => { state.teamHex = customPicker.value; [...swatchesEl.children].forEach((c) => c.classList.remove('active')); };
swatchesEl.append(customPicker);

const angleInput = document.getElementById('angle');
const angleLabel = document.getElementById('angleLabel');
angleInput.oninput = () => { state.angle = +angleInput.value; angleLabel.textContent = state.angle + '°'; };

const speedInput = document.getElementById('speed');
speedInput.oninput = () => { state.speed = +speedInput.value; };

const idleToggle = document.getElementById('idleToggle');
idleToggle.onclick = () => { state.idle = !state.idle; idleToggle.classList.toggle('active', state.idle); };

const zoomToggleEl = document.getElementById('zoomToggle');
[1, 2, 3].forEach((z) => {
  const btn = document.createElement('button');
  btn.textContent = z + 'x';
  btn.className = z === 1 ? 'active' : '';
  btn.onclick = () => { state.zoom = z; [...zoomToggleEl.children].forEach((c) => c.classList.remove('active')); btn.classList.add('active'); };
  zoomToggleEl.append(btn);
});

// arrastar direto no canvas herói também gira o ângulo (mais intuitivo)
let dragging = false;
heroCanvas.addEventListener('pointerdown', () => (dragging = true));
window.addEventListener('pointerup', () => (dragging = false));
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = heroCanvas.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top + rect.height / 2);
  state.angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360);
  angleInput.value = state.angle; angleLabel.textContent = state.angle + '°';
});

const bodyGrid = document.getElementById('bodyGrid');
BODIES.forEach((b, i) => {
  const btn = document.createElement('button');
  btn.className = i === 0 ? 'active' : '';
  const c = document.createElement('canvas'); c.width = 96; c.height = 96;
  btn.append(c);
  btn.onclick = async () => {
    state.bodyName = b.name;
    [...bodyGrid.children].forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
  };
  bodyGrid.append(btn);
  loadImg(b.dataUri).then((img) => {
    const ctx = c.getContext('2d');
    const cellW = img.width / MANIFEST.grid.cols, cellH = img.height / MANIFEST.grid.rows;
    ctx.drawImage(img, 0, 0, cellW, cellH, 0, 0, 96, 96);
  });
});
</script>
`

run()
