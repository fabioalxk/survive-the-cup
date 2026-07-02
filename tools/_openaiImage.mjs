// Helpers compartilhados de geração de imagem via API da OpenAI (gpt-image-2).
// Usado por generate-art.mjs (ícones/retratos) e generate-sprites.mjs (corpo em
// grade de corrida). Único lugar que sabe ler a chave e chamar a API — qualquer
// mudança de endpoint/retry vale para os dois scripts.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API_URL = 'https://api.openai.com/v1/images/generations'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Lê a chave direto do .env (projeto não usa dotenv).
export const apiKey = async () => {
  const env = await readFile(join(ROOT, '.env'), 'utf8')
  const m = env.match(/^CHATPGPT_API_KEY=(.+)$/m)
  if (!m) throw new Error('CHATPGPT_API_KEY não encontrada no .env')
  return m[1].trim()
}

/** Gera uma imagem e retorna o Buffer decodificado, com retry em 429/5xx. */
export const generateImage = async (
  key,
  prompt,
  // background 'transparent' exige gpt-image-1/1.5; gpt-image-2 só gera opaco (background: null).
  { quality = 'medium', size = '1024x1024', format = 'webp', compression = 85, model = 'gpt-image-1', background = 'transparent' } = {},
) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        ...(background ? { background } : {}),
        output_format: format,
        ...(format !== 'png' ? { output_compression: compression } : {}),
        n: 1,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      return Buffer.from(data.data[0].b64_json, 'base64')
    }
    const body = await res.text()
    if (res.status === 429 || res.status >= 500) {
      console.log(`  retry ${attempt + 1} (HTTP ${res.status})…`)
      await sleep(5000 * 2 ** attempt)
      continue
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  throw new Error('429/5xx após retries')
}

/** Executa jobs com concorrência limitada, sem derrubar o lote por uma falha. */
export const runPool = async (jobs, worker, concurrency = 2) => {
  const queue = [...jobs]
  const fails = []
  let done = 0
  const lane = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        await worker(job)
        done++
      } catch (e) {
        fails.push(job.name)
        console.log(`❌ ${job.name} — ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane))
  return { done, fails }
}
