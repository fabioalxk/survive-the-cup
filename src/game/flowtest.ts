/**
 * Teste de fluxo da UI: exercita as MESMAS funções que os botões chamam, em
 * modo manual (sem o atalho autoPlay), incluindo aceitar oferta, gravar placar
 * assistido e rodar o motor animado com elenco real.
 */
import {
  newCareer,
  advanceRound,
  advanceRoundWithPlayerResult,
  openTransferWindow,
  closeTransferWindow,
  signPlayer,
  sellPlayer,
  acceptOffer,
  declineOffers,
  nextPlayerFixture,
} from './career'
import { ALL_CLUBS, CLUBS_BY_DIVISION } from './clubs'
import { lineupFor } from './lineup'
import { resolveKits, withKitDefaults } from './kits'
import { createMatch, step } from '../sim/engine'
import { PHYS } from '../sim/constants'

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('FALHA: ' + msg)
}

// 1) nova carreira
const state = newCareer('Testador', CLUBS_BY_DIVISION.D[3].id, 4242)
assert(state.status === 'season', 'deveria iniciar em temporada')
assert(Object.keys(state.clubs).length === 20, 'liga deve ter 20 clubes')
assert(nextPlayerFixture(state) !== null, 'deve haver próxima partida')

// 2) algumas rodadas, uma com placar "assistido"
advanceRound(state)
advanceRoundWithPlayerResult(state, 3, 0)
const startYear = state.year
let guard = 0
while (state.status === 'season' && guard++ < 100) advanceRound(state)
assert(state.status === 'season_end', 'temporada deveria encerrar')
assert(state.lastSeason !== null, 'deve ter resumo da temporada')

// 3) janela de transferências: contrata e vende
openTransferWindow(state)
assert(state.status === 'transfer', 'deveria abrir transferências')
const before = state.clubs[state.clubId].squad.length
const affordable = [...state.market].sort((a, b) => a.fee - b.fee)[0]
if (affordable && state.money >= affordable.fee) {
  const ok = signPlayer(state, affordable.id)
  assert(ok, 'contratação deveria suceder')
  assert(state.clubs[state.clubId].squad.length === before + 1, 'elenco deveria crescer')
}
const someone = state.clubs[state.clubId].squad[0]
sellPlayer(state, someone.id)

// 4) fecha janela: aceita oferta se houver, senão segue
const hadOffers = state.offers.length > 0
closeTransferWindow(state)
if (hadOffers) {
  assert(state.status === 'offers', 'deveria ir para ofertas')
  acceptOffer(state, state.offers[0]?.clubId ?? '')
} else {
  // closeTransferWindow já começou a próxima temporada
}
declineOffers(state)
assert(state.year > startYear, 'o ano deveria avançar')
assert(state.status === 'season', 'deveria estar em nova temporada')

// 5) motor ANIMADO com elenco real (valida lineupFor + createMatch custom)
const home = state.clubs[state.clubId]
const oppId = state.league.clubIds.find((id) => id !== state.clubId)!
const away = state.clubs[oppId]
const rosters = { home: lineupFor(home.squad), away: lineupFor(away.squad) }
assert(rosters.home.length === 11 && rosters.away.length === 11, 'escalação deve ter 11')
const match = createMatch(rosters)
assert(match.players.length === 22, 'partida deve ter 22 jogadores')
for (let i = 0; i < 200; i++) step(match, PHYS.dt)
assert(match.time > 0, 'o relógio da partida deve avançar')

// 6) conflito de uniforme: dois clubes vermelhos devem ficar com cores distintas
const fer = ALL_CLUBS['ferroviario']
const uni = ALL_CLUBS['uniao-rondonopolis']
assert(fer.shirt === uni.shirt, 'pré-condição: os dois clubes são da mesma cor')
const k = resolveKits(
  withKitDefaults({ shirt: fer.shirt, text: fer.text }),
  withKitDefaults({ shirt: uni.shirt, text: uni.text }),
)
assert(k.home.shirt !== k.away.shirt, 'mando e visitante devem ter cores diferentes')
// clube sem conflito mantém o uniforme principal
const noClash = resolveKits(
  withKitDefaults({ shirt: '#e11d2a', text: '#fff' }),
  withKitDefaults({ shirt: '#1e40af', text: '#fff' }),
)
assert(noClash.away.shirt === '#1e40af', 'sem conflito, o visitante mantém a cor')

console.log(`  uniforme reserva: ${fer.name} ${k.home.shirt} vs ${uni.name} ${k.away.shirt}`)
console.log('OK: fluxo manual completo + motor animado com elenco real funcionam.')
console.log(`  ano final ${state.year}, divisão ${state.league.division}, status ${state.status}`)
