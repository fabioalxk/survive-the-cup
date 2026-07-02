/**
 * Efeitos sonoros sintetizados (sem arquivos de áudio): um "rugido de torcida"
 * para o gol e o APITO do árbitro, montados em WebAudio — ruído branco filtrado
 * para a torcida, tom agudo com trinado de "bolinha" para o apito.
 *
 * Política de autoplay: o AudioContext só toca após um gesto do usuário, por
 * isso `primeAudio()` deve ser chamado nos cliques (Jogar/Nova partida).
 */

let ctx: AudioContext | null = null

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

/** Destrava/retoma o áudio dentro de um gesto do usuário. */
export const primeAudio = (): void => {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

/** Toca um rugido de torcida ao sair o gol. */
export const goalRoar = (): void => {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  const dur = 1.9

  // ruído branco = base da "torcida"
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = c.createBufferSource()
  noise.buffer = buffer

  // dois band-pass dão um timbre mais "humano" de multidão do que ruído cru
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 650
  bp.Q.value = 0.5
  const peak = c.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 1100
  peak.gain.value = 6

  // envelope: sobe rápido (a explosão da torcida) e decai longo
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.18)
  gain.gain.setValueAtTime(0.25, now + 0.7)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  noise.connect(bp)
  bp.connect(peak)
  peak.connect(gain)
  gain.connect(c.destination)
  noise.start(now)
  noise.stop(now + dur)
}

/** Um "glug" de garrafa: tom curto que despenca de altura, como uma bolha de líquido. */
const glug = (c: AudioContext, at: number, pitch: number) => {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitch, at)
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, at + 0.1)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.16, at + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(at)
  osc.stop(at + 0.12)
}

/**
 * Som de POÇÃO (pegar/beber): três "glugs" de garrafa subindo de tom + um
 * "ping" mágico que sobe no fim, como o efeito fazendo efeito.
 */
export const potionSfx = (): void => {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  glug(c, now, 320)
  glug(c, now + 0.13, 380)
  glug(c, now + 0.26, 460)

  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(880, now + 0.36)
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.6)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, now + 0.36)
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.4)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(now + 0.36)
  osc.stop(now + 0.75)
}

/**
 * Um SOPRO de apito: tom agudo (~2.1kHz) com o TRINADO da "bolinha" (o volume
 * treme rápido) e um band-pass que arredonda a aspereza da onda quadrada.
 */
const whistleBlast = (c: AudioContext, at: number, dur: number) => {
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 2100
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2100
  bp.Q.value = 6

  // envelope do sopro: ataque imediato, corte rápido no fim
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.09, at + 0.02)
  gain.gain.setValueAtTime(0.09, at + Math.max(0.03, dur - 0.06))
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)

  // a "bolinha" do apito: um LFO que faz o volume tremer (trinado)
  const trill = c.createOscillator()
  trill.type = 'sine'
  trill.frequency.value = 44
  const trillGain = c.createGain()
  trillGain.gain.value = 0.05
  trill.connect(trillGain)
  trillGain.connect(gain.gain)

  osc.connect(bp)
  bp.connect(gain)
  gain.connect(c.destination)
  osc.start(at)
  osc.stop(at + dur)
  trill.start(at)
  trill.stop(at + dur)
}

let wonRewardAudio: HTMLAudioElement | null = null

/** Toca o efeito de recompensa conquistada (arquivo de áudio, ex.: cartas de reforço). */
export const wonRewardSfx = (): void => {
  if (typeof window === 'undefined') return
  if (!wonRewardAudio) wonRewardAudio = new Audio('/sounds/sfx-won-reward.mp3')
  wonRewardAudio.currentTime = 0
  void wonRewardAudio.play()
}

/**
 * Apito do árbitro nos fins de tempo:
 *  • 'stop' — um toque seco: os jogadores param, a bola ainda rola;
 *  • 'half' — um apito longo: intervalo;
 *  • 'full' — os três apitos clássicos (curto, curto, looongo): fim de jogo.
 */
export const refWhistle = (kind: 'stop' | 'half' | 'full'): void => {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  if (kind === 'stop') whistleBlast(c, now, 0.45)
  else if (kind === 'half') whistleBlast(c, now, 1.0)
  else {
    whistleBlast(c, now, 0.28)
    whistleBlast(c, now + 0.4, 0.28)
    whistleBlast(c, now + 0.8, 1.2)
  }
}
