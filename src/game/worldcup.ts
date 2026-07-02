/**
 * Seleções nacionais para o modo "Survive the Cup" — o técnico assume uma
 * seleção (Brasil sempre disponível) e enfrenta outras seleções pelo mapa.
 * Identidade só: nome + cores do uniforme + bandeira (SVG em `public/flags/wc/`,
 * baixado de flagcdn.com — usar arquivo em vez de emoji evita o problema de
 * bandeiras não renderizarem em algumas combinações de SO/navegador/fonte).
 * Os jogadores continuam fictícios/gerados.
 */
import type { BadgeClub } from '../ui/ClubBadge'

export interface NationalTeam extends BadgeClub {
  name: string
  shorts: string
  socks: string
  /** Força real da seleção (~2016, escala 0–99) — ordena quem aparece cedo ou tarde no mapa. */
  strength: number
}

type Row = [
  id: string,
  name: string,
  short: string,
  shirt: string,
  text: string,
  strength: number,
  shorts: string,
  socks: string,
]

/**
 * Brasil vem primeiro de propósito: é sempre a 1ª opção oferecida ao jogador.
 * shorts/socks são as cores reais do uniforme titular de cada seleção (não só
 * a camisa) — sem isso, o sprite do jogador saía "tudo de uma cor só".
 */
const ROWS: Row[] = [
  ['brasil', 'Brasil', 'BRA', '#fde047', '#16a34a', 90, '#1d4ed8', '#f8fafc'],
  ['argentina', 'Argentina', 'ARG', '#7dd3fc', '#1e3a8a', 92, '#111827', '#f8fafc'],
  ['franca', 'França', 'FRA', '#1e40af', '#f8fafc', 91, '#f8fafc', '#dc2626'],
  ['alemanha', 'Alemanha', 'ALE', '#f8fafc', '#111827', 93, '#111827', '#f8fafc'],
  ['espanha', 'Espanha', 'ESP', '#dc2626', '#fbbf24', 89, '#1e3a8a', '#1e3a8a'],
  ['inglaterra', 'Inglaterra', 'ING', '#f8fafc', '#1e3a8a', 85, '#1e3a8a', '#f8fafc'],
  ['portugal', 'Portugal', 'POR', '#b91c1c', '#16a34a', 88, '#16a34a', '#dc2626'],
  ['holanda', 'Holanda', 'HOL', '#f97316', '#1e3a8a', 82, '#f8fafc', '#f97316'],
  ['italia', 'Itália', 'ITA', '#38bdf8', '#111827', 86, '#f8fafc', '#38bdf8'],
  ['belgica', 'Bélgica', 'BEL', '#111827', '#dc2626', 89, '#111827', '#111827'],
  ['uruguai', 'Uruguai', 'URU', '#60a5fa', '#111827', 85, '#111827', '#111827'],
  ['croacia', 'Croácia', 'CRO', '#dc2626', '#f8fafc', 84, '#f8fafc', '#1e3a8a'],
  ['colombia', 'Colômbia', 'COL', '#fbbf24', '#1e3a8a', 86, '#1e3a8a', '#dc2626'],
  ['chile', 'Chile', 'CHI', '#dc2626', '#f8fafc', 87, '#111827', '#f8fafc'],
  ['mexico', 'México', 'MEX', '#16a34a', '#f8fafc', 82, '#f8fafc', '#f8fafc'],
  ['estados-unidos', 'Estados Unidos', 'EUA', '#1e3a8a', '#f8fafc', 77, '#f8fafc', '#dc2626'],
  ['canada', 'Canadá', 'CAN', '#dc2626', '#f8fafc', 60, '#f8fafc', '#f8fafc'],
  ['japao', 'Japão', 'JAP', '#1e3a8a', '#f8fafc', 72, '#f8fafc', '#f8fafc'],
  ['coreia-do-sul', 'Coreia do Sul', 'COR', '#f8fafc', '#dc2626', 71, '#dc2626', '#f8fafc'],
  ['marrocos', 'Marrocos', 'MAR', '#dc2626', '#16a34a', 72, '#16a34a', '#16a34a'],
  ['senegal', 'Senegal', 'SEN', '#16a34a', '#fbbf24', 75, '#f8fafc', '#16a34a'],
  ['nigeria', 'Nigéria', 'NIG', '#16a34a', '#f8fafc', 72, '#f8fafc', '#f8fafc'],
  ['gana', 'Gana', 'GAN', '#dc2626', '#fbbf24', 73, '#f8fafc', '#fbbf24'],
  ['suica', 'Suíça', 'SUI', '#dc2626', '#f8fafc', 81, '#f8fafc', '#f8fafc'],
  ['polonia', 'Polônia', 'POL', '#f8fafc', '#dc2626', 81, '#dc2626', '#f8fafc'],
  ['australia', 'Austrália', 'AUS', '#fbbf24', '#16a34a', 70, '#16a34a', '#16a34a'],
  ['ira', 'Irã', 'IRA', '#111827', '#dc2626', 71, '#f8fafc', '#dc2626'],
  ['arabia-saudita', 'Arábia Saudita', 'KSA', '#16a34a', '#f8fafc', 64, '#f8fafc', '#f8fafc'],
  ['catar', 'Catar', 'QAT', '#7f1d3a', '#f8fafc', 58, '#f8fafc', '#7f1d3a'],
  ['tunisia', 'Tunísia', 'TUN', '#dc2626', '#f8fafc', 71, '#f8fafc', '#dc2626'],
  ['equador', 'Equador', 'EQU', '#fbbf24', '#111827', 76, '#1e3a8a', '#dc2626'],
  ['paraguai', 'Paraguai', 'PAR', '#dc2626', '#f8fafc', 73, '#111827', '#dc2626'],
  ['peru', 'Peru', 'PER', '#dc2626', '#f8fafc', 74, '#f8fafc', '#f8fafc'],
  ['venezuela', 'Venezuela', 'VEN', '#7f1d3a', '#111827', 66, '#111827', '#7f1d3a'],
  ['costa-rica', 'Costa Rica', 'CRC', '#dc2626', '#f8fafc', 76, '#111827', '#111827'],
  ['jamaica', 'Jamaica', 'JAM', '#111827', '#fbbf24', 65, '#fbbf24', '#16a34a'],
  ['panama', 'Panamá', 'PAN', '#dc2626', '#1e3a8a', 64, '#1e3a8a', '#1e3a8a'],
  ['egito', 'Egito', 'EGI', '#dc2626', '#111827', 73, '#111827', '#f8fafc'],
  ['argelia', 'Argélia', 'ARL', '#16a34a', '#f8fafc', 76, '#f8fafc', '#f8fafc'],
  ['camaroes', 'Camarões', 'CAM', '#16a34a', '#dc2626', 70, '#dc2626', '#fbbf24'],
  ['africa-do-sul', 'África do Sul', 'RSA', '#fbbf24', '#16a34a', 63, '#16a34a', '#fbbf24'],
  ['nova-zelandia', 'Nova Zelândia', 'NZL', '#111827', '#f8fafc', 59, '#f8fafc', '#111827'],
  ['suecia', 'Suécia', 'SUE', '#fde047', '#1e3a8a', 78, '#1e3a8a', '#fde047'],
  ['dinamarca', 'Dinamarca', 'DIN', '#dc2626', '#f8fafc', 77, '#f8fafc', '#f8fafc'],
  ['ucrania', 'Ucrânia', 'UCR', '#fde047', '#1e3a8a', 78, '#1e3a8a', '#1e3a8a'],
  ['turquia', 'Turquia', 'TUR', '#dc2626', '#f8fafc', 79, '#f8fafc', '#f8fafc'],
  ['servia', 'Sérvia', 'SER', '#dc2626', '#111827', 74, '#111827', '#111827'],
]

/** Lista ordenada (Brasil primeiro) — usada na tela de escolha da seleção. */
export const WC_TEAM_LIST: NationalTeam[] = ROWS.map(
  ([id, name, short, shirt, text, strength, shorts, socks]) => ({
    id,
    name,
    short,
    shirt,
    text,
    strength,
    shorts,
    socks,
    flag: `/flags/wc/${id}.svg`,
  }),
)

/** Mesma seleções indexadas por id — usada pelo motor da corrida (adversários, badges). */
export const ALL_CLUBS: Record<string, NationalTeam> = Object.fromEntries(
  WC_TEAM_LIST.map((t) => [t.id, t]),
)

export const BRAZIL_ID = 'brasil'
