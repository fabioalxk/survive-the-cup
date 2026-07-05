import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, apiKey, generateImage } from '../_openaiImage.mjs'

const prompt =
  'Top-down photorealistic soccer pitch grass texture, portrait image taller than wide. Natural stadium turf ' +
  'mowed in alternating light and dark green HORIZONTAL bands — each band is a wide horizontal stripe running ' +
  'left to right, and the bands are stacked from the top of the image to the bottom (like horizontal rows), ' +
  'NOT vertical stripes. Soft even stadium floodlight from above, rich vibrant green, subtle blade detail, no ' +
  'white pitch lines, no logos, no players, no watermark — pure grass texture only, seamless and tileable.'

const key = await apiKey()
const buf = await generateImage(key, prompt, {
  model: 'gpt-image-2',
  size: '1024x1536',
  quality: 'medium',
  format: 'webp',
  compression: 78,
  background: null,
})
const out = join(ROOT, 'public/assets/bg/turf_pitch.webp')
await writeFile(out, buf)
console.log('saved', out)
