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
  .pitchRow { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
  .pitchCell { background: #14301f; border-radius: 8px; padding: 12px; text-align: center; }
  .pitchCell canvas { image-rendering: pixelated; }
  .pitchCell span { display: block; font-size: 11px; color: #a7c8b3; margin-top: 6px; }
  code { background: #1f2c3a; padding: 1px 5px; border-radius: 4px; }
</style>

<h1>⚽ Sprites de jogador correndo — preview</h1>
<p class="sub">
  Uma única pose vista de cima cobre as 360° (o jogo gira o sprite com <code>ctx.rotate</code> pelo vetor de
  velocidade). A cor da camisa/shorts/meião é trocada em runtime por matiz preservando a luminosidade —
  um sprite serve para qualquer clube.
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
      <label>Velocidade da animação</label>
      <input type="range" id="speed" min="0" max="100" value="55" />
    </div>
    <div class="field">
      <label>Corpo (pele + cabelo) — pool de ${bodies.length}, escolhido hoje por <code>id % pool</code></label>
      <div class="bodyGrid" id="bodyGrid"></div>
    </div>
  </div>

  <div>
    <div class="stage"><canvas id="hero" width="360" height="360"></canvas></div>
    <div class="pitchRow" id="pitchRow"></div>
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
let state = { bodyName: BODIES[0].name, teamHex: TEAM_COLORS[0].hex, angle: 0, speed: 55, playing: true, frameIdx: 0, acc: 0 };

function frameCellFor(idx) {
  const frame = idx < MANIFEST.runFrames.length ? MANIFEST.runFrames[idx] : MANIFEST.idleFrame;
  return { col: frame % MANIFEST.grid.cols, row: Math.floor(frame / MANIFEST.grid.cols) };
}

function drawSprite(ctx, canvasSrc, cx, cy, size, angleDeg) {
  const cellW = canvasSrc.width / MANIFEST.grid.cols;
  const cellH = canvasSrc.height / MANIFEST.grid.rows;
  const { col, row } = frameCellFor(state.frameIdx);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.drawImage(canvasSrc, col * cellW, row * cellH, cellW, cellH, -size / 2, -size / 2, size, size);
  ctx.restore();
}

const heroCanvas = document.getElementById('hero');
const heroCtx = heroCanvas.getContext('2d');

async function renderHero() {
  const tinted = await getTintedCanvas(state.bodyName, state.teamHex);
  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
  drawSprite(heroCtx, tinted, heroCanvas.width / 2, heroCanvas.height / 2, 260, state.angle);
}

// mini campo com 6 jogadores (um por corpo do pool) correndo em direções diferentes
const pitchRow = document.getElementById('pitchRow');
const pitchCells = BODIES.map((b, i) => {
  const wrap = document.createElement('div'); wrap.className = 'pitchCell';
  const c = document.createElement('canvas'); c.width = 72; c.height = 72;
  const label = document.createElement('span'); label.textContent = b.name;
  wrap.append(c, label); pitchRow.append(wrap);
  return { canvas: c, ctx: c.getContext('2d'), body: b.name, angle: (360 / BODIES.length) * i };
});
async function renderPitchRow() {
  for (const cell of pitchCells) {
    const tinted = await getTintedCanvas(cell.body, state.teamHex);
    cell.ctx.clearRect(0, 0, 72, 72);
    drawSprite(cell.ctx, tinted, 36, 36, 58, cell.angle + state.angle);
  }
}

// ---- loop de animação (independente de FPS, como o jogo real) ---------
let last = performance.now();
function tick(now) {
  const dt = (now - last) / 1000; last = now;
  if (state.playing) {
    state.acc += dt * (0.5 + state.speed / 40); // velocidade mapeia p/ passadas/seg
    while (state.acc > 1 / 10) { state.acc -= 1 / 10; state.frameIdx = (state.frameIdx + 1) % (MANIFEST.runFrames.length + 1); }
  }
  renderHero();
  renderPitchRow();
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
