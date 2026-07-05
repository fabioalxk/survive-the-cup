import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ROOT, apiKey, generateImage } from '../_openaiImage.mjs'

const prompt =
  'Aerial top-down view of an empty outdoor football pitch at night, painted in a moody, ' +
  'atmospheric oil-painting style for a premium dark-themed football roguelike video game ' +
  '(same painterly, foggy, night-training-ground visual language as the rest of the game). ' +
  'Worn patchy dark green turf texture with faint chalk pitch lines barely visible: a goal box ' +
  'at the very top edge and another at the very bottom edge, a center circle roughly in the middle. ' +
  'Warm golden glow spilling in from stadium floodlights just outside the frame on both left and right ' +
  'sides, soft atmospheric haze and vignette darkening the corners and edges. Blurred dark stadium stands ' +
  'with tiny indistinct silhouetted crowd shapes fading into shadow along the far left and right edges only, ' +
  'no cartoon illustration, no flags, no clip-art. Tall portrait orientation, seamless top-to-bottom for a ' +
  'vertically scrolling game map background. No text, no logos, no players, no ball, no UI elements.'

const key = await apiKey()
console.log('gerando bg_map...')
const buf = await generateImage(key, prompt, { model: 'gpt-image-2', size: '1024x1536', quality: 'high', background: null })
const dest = join(ROOT, 'public', 'assets', 'bg', 'bg_map.webp')
await writeFile(dest, buf)
console.log('salvo', dest, `${(buf.length / 1024).toFixed(0)}KB`)
