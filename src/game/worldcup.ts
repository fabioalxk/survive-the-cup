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
  /** Força real da seleção (~2016, escala 0–99) — ordena quem aparece cedo ou tarde no mapa. */
  strength: number
}

type Row = [id: string, name: string, short: string, shirt: string, text: string, strength: number]

/** Brasil vem primeiro de propósito: é sempre a 1ª opção oferecida ao jogador. */
const ROWS: Row[] = [
  ['brasil', 'Brasil', 'BRA', '#fde047', '#16a34a', 90],
  ['argentina', 'Argentina', 'ARG', '#7dd3fc', '#1e3a8a', 92],
  ['franca', 'França', 'FRA', '#1e40af', '#f8fafc', 91],
  ['alemanha', 'Alemanha', 'ALE', '#f8fafc', '#111827', 93],
  ['espanha', 'Espanha', 'ESP', '#dc2626', '#fbbf24', 89],
  ['inglaterra', 'Inglaterra', 'ING', '#f8fafc', '#1e3a8a', 85],
  ['portugal', 'Portugal', 'POR', '#b91c1c', '#16a34a', 88],
  ['holanda', 'Holanda', 'HOL', '#f97316', '#1e3a8a', 82],
  ['italia', 'Itália', 'ITA', '#38bdf8', '#111827', 86],
  ['belgica', 'Bélgica', 'BEL', '#111827', '#dc2626', 89],
  ['uruguai', 'Uruguai', 'URU', '#60a5fa', '#111827', 85],
  ['croacia', 'Croácia', 'CRO', '#dc2626', '#f8fafc', 84],
  ['colombia', 'Colômbia', 'COL', '#fbbf24', '#1e3a8a', 86],
  ['chile', 'Chile', 'CHI', '#dc2626', '#f8fafc', 87],
  ['mexico', 'México', 'MEX', '#16a34a', '#f8fafc', 82],
  ['estados-unidos', 'Estados Unidos', 'EUA', '#1e3a8a', '#f8fafc', 77],
  ['canada', 'Canadá', 'CAN', '#dc2626', '#f8fafc', 60],
  ['japao', 'Japão', 'JAP', '#1e3a8a', '#f8fafc', 72],
  ['coreia-do-sul', 'Coreia do Sul', 'COR', '#f8fafc', '#dc2626', 71],
  ['marrocos', 'Marrocos', 'MAR', '#dc2626', '#16a34a', 72],
  ['senegal', 'Senegal', 'SEN', '#16a34a', '#fbbf24', 75],
  ['nigeria', 'Nigéria', 'NIG', '#16a34a', '#f8fafc', 72],
  ['gana', 'Gana', 'GAN', '#dc2626', '#fbbf24', 73],
  ['suica', 'Suíça', 'SUI', '#dc2626', '#f8fafc', 81],
  ['polonia', 'Polônia', 'POL', '#f8fafc', '#dc2626', 81],
  ['australia', 'Austrália', 'AUS', '#fbbf24', '#16a34a', 70],
  ['ira', 'Irã', 'IRA', '#111827', '#dc2626', 71],
  ['arabia-saudita', 'Arábia Saudita', 'KSA', '#16a34a', '#f8fafc', 64],
  ['catar', 'Catar', 'QAT', '#7f1d3a', '#f8fafc', 58],
  ['tunisia', 'Tunísia', 'TUN', '#dc2626', '#f8fafc', 71],
  ['equador', 'Equador', 'EQU', '#fbbf24', '#111827', 76],
  ['paraguai', 'Paraguai', 'PAR', '#dc2626', '#f8fafc', 73],
  ['peru', 'Peru', 'PER', '#dc2626', '#f8fafc', 74],
  ['venezuela', 'Venezuela', 'VEN', '#7f1d3a', '#111827', 66],
  ['costa-rica', 'Costa Rica', 'CRC', '#dc2626', '#f8fafc', 76],
  ['jamaica', 'Jamaica', 'JAM', '#111827', '#fbbf24', 65],
  ['panama', 'Panamá', 'PAN', '#dc2626', '#1e3a8a', 64],
  ['egito', 'Egito', 'EGI', '#dc2626', '#111827', 73],
  ['argelia', 'Argélia', 'ARL', '#16a34a', '#f8fafc', 76],
  ['camaroes', 'Camarões', 'CAM', '#16a34a', '#dc2626', 70],
  ['africa-do-sul', 'África do Sul', 'RSA', '#fbbf24', '#16a34a', 63],
  ['nova-zelandia', 'Nova Zelândia', 'NZL', '#111827', '#f8fafc', 59],
  ['suecia', 'Suécia', 'SUE', '#fde047', '#1e3a8a', 78],
  ['dinamarca', 'Dinamarca', 'DIN', '#dc2626', '#f8fafc', 77],
  ['ucrania', 'Ucrânia', 'UCR', '#fde047', '#1e3a8a', 78],
  ['turquia', 'Turquia', 'TUR', '#dc2626', '#f8fafc', 79],
  ['servia', 'Sérvia', 'SER', '#dc2626', '#111827', 74],
]

/** Lista ordenada (Brasil primeiro) — usada na tela de escolha da seleção. */
export const WC_TEAM_LIST: NationalTeam[] = ROWS.map(([id, name, short, shirt, text, strength]) => ({
  id,
  name,
  short,
  shirt,
  text,
  strength,
  flag: `/flags/wc/${id}.svg`,
}))

/** Mesma seleções indexadas por id — usada pelo motor da corrida (adversários, badges). */
export const ALL_CLUBS: Record<string, NationalTeam> = Object.fromEntries(
  WC_TEAM_LIST.map((t) => [t.id, t]),
)

export const BRAZIL_ID = 'brasil'
