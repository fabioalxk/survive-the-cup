/**
 * Efeitos sonoros sintetizados (sem arquivos de áudio): um "rugido de torcida"
 * para o gol e o APITO do árbitro, montados em WebAudio — ruído branco filtrado
 * para a torcida, tom agudo com trinado de "bolinha" para o apito.
 *
 * Política de autoplay: o AudioContext só toca após um gesto do usuário, por
 * isso `primeAudio()` deve ser chamado nos cliques (Jogar/Nova partida).
 */

let ctx: AudioContext | null = null
/** Nó único por onde passam TODOS os efeitos sintetizados — silencia tudo de uma vez. */
let master: GainNode | null = null

const MUTE_KEY = 'cm-audio-muted'
let muted = (() => {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)
  }
  return ctx
}

/** Saída de qualquer efeito sintetizado — usar no lugar de `c.destination` direto. */
const dest = (c: AudioContext): AudioNode => master ?? c.destination

/** Contexto já destravado (retoma se a política de autoplay o suspendeu) —
 *  todo efeito sintetizado abaixo começa chamando isto em vez de repetir
 *  "pega o contexto + retoma se suspenso" no próprio corpo. */
const activeCtx = (): AudioContext | null => {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
  return c
}

/** Destrava/retoma o áudio dentro de um gesto do usuário. */
export const primeAudio = (): void => void activeCtx()

/** Está mudo agora? (preferência persistida entre sessões) */
export const isMuted = (): boolean => muted

/** Muda/desmuta TODO o áudio do jogo — efeitos sintetizados e músicas em loop. */
export const setMuted = (v: boolean): void => {
  muted = v
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0')
  } catch {
    /* armazenamento indisponível — ignora silenciosamente */
  }
  if (master) master.gain.value = v ? 0 : 1
  for (const [src, audio] of loopingTracks) audio.volume = v ? 0 : (trackVolume.get(src) ?? 1)
}

/** Toca um rugido de torcida ao sair o gol. */
export const goalRoar = (): void => {
  const c = activeCtx()
  if (!c) return

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
  gain.connect(dest(c))
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
  gain.connect(dest(c))
  osc.start(at)
  osc.stop(at + 0.12)
}

/**
 * Som de POÇÃO (pegar/beber): três "glugs" de garrafa subindo de tom + um
 * "ping" mágico que sobe no fim, como o efeito fazendo efeito.
 */
export const potionSfx = (): void => {
  const c = activeCtx()
  if (!c) return

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
  gain.connect(dest(c))
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
  gain.connect(dest(c))
  osc.start(at)
  osc.stop(at + dur)
  trill.start(at)
  trill.stop(at + dur)
}

let wonRewardAudio: HTMLAudioElement | null = null

/** Toca o efeito de recompensa conquistada (arquivo de áudio, ex.: cartas de reforço). */
export const wonRewardSfx = (): void => {
  if (typeof window === 'undefined' || muted) return
  if (!wonRewardAudio) wonRewardAudio = new Audio('/sounds/sfx-won-reward.mp3')
  wonRewardAudio.currentTime = 0
  void wonRewardAudio.play()
}

const loopingTracks = new Map<string, HTMLAudioElement>()
/** Volume "de verdade" de cada faixa — usado para restaurar ao desmutar. */
const trackVolume = new Map<string, number>()

/** Inicia (ou retoma do início) uma trilha em loop, cacheando o elemento por src. */
const startLoop = (src: string, volume: number): void => {
  if (typeof window === 'undefined') return
  trackVolume.set(src, volume)
  let audio = loopingTracks.get(src)
  if (!audio) {
    audio = new Audio(src)
    audio.loop = true
    loopingTracks.set(src, audio)
  }
  audio.volume = muted ? 0 : volume
  audio.currentTime = 0
  void audio.play()
}

/** Pausa uma trilha em loop iniciada por `startLoop`. */
const stopLoop = (src: string): void => {
  loopingTracks.get(src)?.pause()
}

/** Retoma uma trilha pausada pela política de autoplay, sem reiniciar do início. */
const resumeLoop = (src: string): void => {
  const audio = loopingTracks.get(src)
  if (audio?.paused) void audio.play()
}

const MERCHANT_TRACK = '/sounds/song-merchant.mp3'
const MAIN_THEME_TRACK = '/sounds/slay-song-main.mp3'

/** Inicia a trilha do mercador em loop (tela de comprar/vender jogadores). */
export const startMerchantMusic = (): void => startLoop(MERCHANT_TRACK, 0.5)
/** Para a trilha do mercador (ao sair da tela de mercado). */
export const stopMerchantMusic = (): void => stopLoop(MERCHANT_TRACK)

/** Inicia o tema principal em loop (tela de título/menu do modo run). */
export const startMainTheme = (): void => startLoop(MAIN_THEME_TRACK, 0.4)
/** Para o tema principal (ao sair da tela de título). */
export const stopMainTheme = (): void => stopLoop(MAIN_THEME_TRACK)
/** Retoma o tema principal se o autoplay do navegador o bloqueou até o 1º clique. */
export const resumeMainTheme = (): void => resumeLoop(MAIN_THEME_TRACK)

/** Blip curto e discreto para qualquer clique de botão (usado pelo listener global). */
export const uiClick = (): void => {
  const c = activeCtx()
  if (!c) return

  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.04)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
  osc.connect(gain)
  gain.connect(dest(c))
  osc.start(now)
  osc.stop(now + 0.06)
}

/** Chime de confirmação ao escolher algo (carta de reforço, bênção): duas notas subindo. */
export const chooseSfx = (): void => {
  const c = activeCtx()
  if (!c) return

  const now = c.currentTime
  ;([[660, 0], [990, 0.09]] as const).forEach(([freq, at]) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, now + at)
    gain.gain.exponentialRampToValueAtTime(0.13, now + at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16)
    osc.connect(gain)
    gain.connect(dest(c))
    osc.start(now + at)
    osc.stop(now + at + 0.18)
  })
}

/** Jingle de "subiu de nível" ao treinar um atributo: arpejo ascendente + brilho no topo. */
export const upgradeSfx = (): void => {
  const c = activeCtx()
  if (!c) return

  const now = c.currentTime
  const arpeggio = [523, 659, 784, 1047] // C5 E5 G5 C6
  arpeggio.forEach((freq, i) => {
    const at = now + i * 0.07
    const osc = c.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.08, at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
    osc.connect(gain)
    gain.connect(dest(c))
    osc.start(at)
    osc.stop(at + 0.18)
  })

  // brilho final: um tom agudo subindo por cima da última nota do arpejo
  const sparkle = c.createOscillator()
  sparkle.type = 'sine'
  sparkle.frequency.setValueAtTime(1568, now + 0.21)
  sparkle.frequency.exponentialRampToValueAtTime(2093, now + 0.4)
  const sGain = c.createGain()
  sGain.gain.setValueAtTime(0.0001, now + 0.21)
  sGain.gain.exponentialRampToValueAtTime(0.06, now + 0.24)
  sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
  sparkle.connect(sGain)
  sGain.connect(dest(c))
  sparkle.start(now + 0.21)
  sparkle.stop(now + 0.46)
}

/** Um "cling" metálico curto de moeda, usado pela compra e pela venda no mercado. */
const coinClink = (c: AudioContext, at: number, pitch: number, gainPeak: number) => {
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(pitch, at)
  osc.frequency.exponentialRampToValueAtTime(pitch * 1.4, at + 0.05)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = pitch * 2
  bp.Q.value = 4
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(gainPeak, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
  osc.connect(bp)
  bp.connect(gain)
  gain.connect(dest(c))
  osc.start(at)
  osc.stop(at + 0.2)
}

/** Compra no mercado: dois "clings" de moeda subindo, tipo caixa registradora. */
export const buySfx = (): void => {
  const c = activeCtx()
  if (!c) return
  const now = c.currentTime
  coinClink(c, now, 900, 0.1)
  coinClink(c, now + 0.09, 1200, 0.12)
}

/** Venda no mercado: dois "clings" descendo — moeda entrando no bolso, tom mais grave. */
export const sellSfx = (): void => {
  const c = activeCtx()
  if (!c) return
  const now = c.currentTime
  coinClink(c, now, 700, 0.11)
  coinClink(c, now + 0.08, 550, 0.09)
}

/** Fanfarra de vitória (chefão derrotado): arpejo maior triunfante e mais longo. */
export const victorySfx = (): void => {
  const c = activeCtx()
  if (!c) return
  const now = c.currentTime
  const notes = [523, 659, 784, 1047, 784, 1047, 1319] // C E G C G C E(oitava)
  notes.forEach((freq, i) => {
    const at = now + i * 0.11
    const osc = c.createOscillator()
    osc.type = i % 2 === 0 ? 'triangle' : 'square'
    osc.frequency.value = freq
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.1, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
    osc.connect(gain)
    gain.connect(dest(c))
    osc.start(at)
    osc.stop(at + 0.3)
  })
}

/** Tom de derrota: três notas descendo e abafadas — vida perdida ou eliminação. */
export const defeatSfx = (): void => {
  const c = activeCtx()
  if (!c) return
  const now = c.currentTime
  const notes = [440, 349, 261]
  notes.forEach((freq, i) => {
    const at = now + i * 0.16
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.09, at + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
    osc.connect(lp)
    lp.connect(gain)
    gain.connect(dest(c))
    osc.start(at)
    osc.stop(at + 0.38)
  })
}

/**
 * Apito do árbitro nos fins de tempo:
 *  • 'stop' — um toque seco: os jogadores param, a bola ainda rola;
 *  • 'half' — um apito longo: intervalo;
 *  • 'full' — os três apitos clássicos (curto, curto, looongo): fim de jogo.
 */
export const refWhistle = (kind: 'stop' | 'half' | 'full'): void => {
  const c = activeCtx()
  if (!c) return

  const now = c.currentTime
  if (kind === 'stop') whistleBlast(c, now, 0.45)
  else if (kind === 'half') whistleBlast(c, now, 1.0)
  else {
    whistleBlast(c, now, 0.28)
    whistleBlast(c, now + 0.4, 0.28)
    whistleBlast(c, now + 0.8, 1.2)
  }
}
