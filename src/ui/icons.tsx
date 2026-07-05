/**
 * Ícones da interface (HUD, navegação, modais).
 *
 * Dois idiomas visuais convivem aqui de propósito:
 * - Ícones de OBJETO do jogo (coração, moeda, poção, presente…): arte gerada
 *   por tools/generate-art.mjs, via <ArtIcon> — visual 3D/comercial.
 * - Ícones de NAVEGAÇÃO/controle (mapa, prancheta, play, X…): SVG de traço
 *   24×24 que herda `currentColor`, então a cor vem do CSS.
 *
 * Gradientes usam ids fixos: instâncias repetidas declaram defs idênticos,
 * então o url(#id) resolve sempre para o mesmo visual (padrão de MapIcons).
 */
import { ArtIcon } from './ArtIcon'

export type IconProps = { size?: number; className?: string }

const svgProps = ({ size = 18, className }: IconProps) => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  className,
  'aria-hidden': true as const,
})

/** Coração cheio — vida disponível (vida perdida fica cinza via CSS filter). */
export function HeartIcon(p: IconProps) {
  return <ArtIcon name="heart" size={p.size ?? 18} className={p.className} />
}

/** Coração partido — a vida perdida (rachadura no meio). */
export function HeartbreakIcon(p: IconProps) {
  return <ArtIcon name="heart_broken" size={p.size ?? 18} className={p.className} />
}

/** Moeda de ouro — usada no chip de moedas e nos preços. */
export function CoinIcon(p: IconProps) {
  return <ArtIcon name="coin" size={p.size ?? 18} className={p.className} />
}

/** Mapa dobrado em 3 painéis com rota pontilhada — aba "Mapa". */
export function MapIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M3 6.2 8.5 4l7 2.2L21 4v13.8L15.5 20l-7-2.2L3 20Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M3 6.2 8.5 4l7 2.2L21 4v13.8L15.5 20l-7-2.2L3 20Z M8.5 4v13.8 M15.5 6.2V20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6 13.5c2-2.4 4.6 1 6.2-1.2 1.2-1.7 3.3-1.4 4.8-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.2 2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Camisa de jogo — aba "Meu Time". */
export function ShirtIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M8.4 3.4 5 5.2 2.4 9.4l3.2 2 .8-1.2V20.4h11.2V10.2l.8 1.2 3.2-2L19 5.2l-3.4-1.8A3.6 3.6 0 0 1 12 5.6a3.6 3.6 0 0 1-3.6-2.2Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M8.4 3.4 5 5.2 2.4 9.4l3.2 2 .8-1.2V20.4h11.2V10.2l.8 1.2 3.2-2L19 5.2l-3.4-1.8A3.6 3.6 0 0 1 12 5.6a3.6 3.6 0 0 1-3.6-2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Seta circular — recomeçar corrida / nova partida. */
export function RestartIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M17.8 2.6v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Caveira — eliminação (game over). */
export function SkullIcon(p: IconProps) {
  return <ArtIcon name="skull" size={p.size ?? 18} className={p.className} />
}

/** Presente — recompensa pós-vitória. */
export function GiftIcon(p: IconProps) {
  return <ArtIcon name="gift" size={p.size ?? 18} className={p.className} />
}

/** Bola de futebol — marca do jogo (tela de título). */
export function BallIcon(p: IconProps) {
  return <ArtIcon name="ball" size={p.size ?? 18} className={p.className} />
}

/** Play — retomar a partida. */
export function PlayIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M7.4 4.8a1.2 1.2 0 0 1 1.83-1.02l11 7.2a1.2 1.2 0 0 1 0 2.04l-11 7.2A1.2 1.2 0 0 1 7.4 19.2Z" fill="currentColor" />
    </svg>
  )
}

/** Pause — pausar a partida. */
export function PauseIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="6" y="4.4" width="4.2" height="15.2" rx="1.3" fill="currentColor" />
      <rect x="13.8" y="4.4" width="4.2" height="15.2" rx="1.3" fill="currentColor" />
    </svg>
  )
}

/** Avançar até o fim — pular a partida. */
export function SkipIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 5.5a1 1 0 0 1 1.55-.84l8.1 5.5a1 1 0 0 1 0 1.68l-8.1 5.5A1 1 0 0 1 5 16.5Z" fill="currentColor" />
      <rect x="16.4" y="4.4" width="2.8" height="15.2" rx="1.2" fill="currentColor" />
    </svg>
  )
}

/** Faísca de 4 pontas — organização automática/"num só toque" (distinto do ícone de trocar). */
export function AutoIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)} fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
      <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
    </svg>
  )
}

/** Prancheta tática — aba "Tática". */
export function ClipboardIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="4.6" y="4" width="14.8" height="17.4" rx="2" fill="currentColor" opacity="0.28" />
      <rect
        x="4.6"
        y="4"
        width="14.8"
        height="17.4"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect x="8.6" y="2.2" width="6.8" height="3.6" rx="1.2" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="9.2" cy="11" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="14.8" cy="14.2" r="1.5" fill="currentColor" stroke="none" />
        <path d="M10.4 12 13.6 13.4M9 16.6h6" strokeDasharray="1.8 1.6" />
      </g>
    </svg>
  )
}

/** Frasco de poção do tipo (vermelho = força, azul = velocidade). */
export function PotionIcon({ kind, ...p }: IconProps & { kind: 'strength' | 'pace' }) {
  return <ArtIcon name={`potion_${kind}`} size={p.size ?? 18} className={p.className} />
}

/** Apito de árbitro — fim de jogo. */
export function WhistleIcon(p: IconProps) {
  return <ArtIcon name="whistle" size={p.size ?? 18} className={p.className} />
}

/** Ícone de fechar (X) para modais e popups. */
export function CloseIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

/** Ponto de interrogação em círculo — abre a ajuda/regras do jogo. */
export function HelpIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.6a2.7 2.7 0 1 1 3.9 2.4c-.8.45-1.2.9-1.2 1.7v.4" strokeLinejoin="round" />
      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Alto-falante — liga/desliga música e efeitos (ondas quando ativo, X quando mudo). */
export function SoundIcon({ muted, ...p }: IconProps & { muted: boolean }) {
  return (
    <svg
      {...svgProps(p)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" />
      ) : (
        <>
          <path d="M15.5 9a3.6 3.6 0 0 1 0 6" />
          <path d="M18 6.3a7.2 7.2 0 0 1 0 11.4" />
        </>
      )}
    </svg>
  )
}

/** Chama — chip de Ascension (dificuldade aumentada). */
export function FlameIcon(p: IconProps) {
  return <ArtIcon name="fire" size={p.size ?? 18} className={p.className} />
}

/** Cadeado — conteúdo bloqueado (ex.: seleções ainda não jogáveis). */
export function LockIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="5" y="10.4" width="14" height="10.2" rx="2.2" fill="currentColor" />
      <path
        d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="12" cy="14.8" r="1.5" fill="rgba(7,11,20,0.8)" />
      <rect x="11.3" y="15.4" width="1.4" height="2.6" rx="0.7" fill="rgba(7,11,20,0.8)" />
    </svg>
  )
}

/** Banco de reservas vazio — estado vazio da coluna "Banco". */
export function BenchIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      {/* assento e encosto */}
      <rect x="2.6" y="10.6" width="18.8" height="3" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="3.6" y="6.2" width="16.8" height="2.6" rx="1" fill="currentColor" opacity="0.45" />
      {/* pés */}
      <rect x="4.6" y="13.6" width="2.2" height="6" rx="0.9" fill="currentColor" opacity="0.6" />
      <rect x="17.2" y="13.6" width="2.2" height="6" rx="0.9" fill="currentColor" opacity="0.6" />
      {/* garrafinha esquecida em cima do banco */}
      <rect x="10" y="7.2" width="1.9" height="3.4" rx="0.8" fill="currentColor" />
      <rect x="10.5" y="6.2" width="0.9" height="1.2" rx="0.4" fill="currentColor" />
    </svg>
  )
}

/** Expandir — entrar em tela cheia na partida. */
export function ExpandIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M9 4.5H5.7A1.2 1.2 0 0 0 4.5 5.7V9M15 4.5h3.3a1.2 1.2 0 0 1 1.2 1.2V9M9 19.5H5.7a1.2 1.2 0 0 1-1.2-1.2V15M15 19.5h3.3a1.2 1.2 0 0 0 1.2-1.2V15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Recolher — sair da tela cheia da partida. */
export function CompressIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M9 4.5V7.8A1.2 1.2 0 0 1 7.8 9H4.5M15 4.5v3.3A1.2 1.2 0 0 0 16.2 9h3.3M9 19.5v-3.3A1.2 1.2 0 0 0 7.8 15H4.5M15 19.5v-3.3a1.2 1.2 0 0 1 1.2-1.2h3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Velocímetro — botão de velocidade da partida (estilo menu do YouTube). */
export function SpeedIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12.5" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 12.5 16 8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12.5" r="1.4" fill="currentColor" />
      <path d="M8.4 4.4h7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Seta pra baixo — indica menu suspenso (usado no botão de velocidade). */
export function ChevronDownIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="m5.5 8.5 6.5 6.5 6.5-6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Check — marca a opção ativa num menu (velocidade selecionada). */
export function CheckIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
