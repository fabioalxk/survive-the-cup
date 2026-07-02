/**
 * Ícones SVG da interface (HUD, navegação, modais) — mesmo espírito dos
 * emblemas de MapIcons.tsx, mas em traço simples 24×24 para uso em chips,
 * botões e cabeçalhos. Todos herdam `currentColor`, então a cor vem do CSS.
 *
 * Gradientes usam ids fixos: instâncias repetidas declaram defs idênticos,
 * então o url(#id) resolve sempre para o mesmo visual (padrão de MapIcons).
 */

export type IconProps = { size?: number; className?: string }

const svgProps = ({ size = 18, className }: IconProps) => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  className,
  'aria-hidden': true as const,
})

/** Coração cheio — vida disponível (a cor vem do CSS via currentColor). */
export function HeartIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M12 21c-.4 0-.8-.14-1.1-.42C6.5 16.7 2.5 13.2 2.5 8.9 2.5 5.9 4.9 3.5 7.9 3.5c1.6 0 3.1.72 4.1 1.9a5.44 5.44 0 0 1 4.1-1.9c3 0 5.4 2.4 5.4 5.4 0 4.3-4 7.8-8.4 11.68-.3.28-.7.42-1.1.42Z"
        fill="currentColor"
      />
      <path
        d="M6.2 7.2c.7-.9 1.9-1.3 3-1"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Coração partido — a vida perdida (rachadura no meio). */
export function HeartbreakIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M12 21c-.4 0-.8-.14-1.1-.42C6.5 16.7 2.5 13.2 2.5 8.9 2.5 5.9 4.9 3.5 7.9 3.5c1.6 0 3.1.72 4.1 1.9a5.44 5.44 0 0 1 4.1-1.9c3 0 5.4 2.4 5.4 5.4 0 4.3-4 7.8-8.4 11.68-.3.28-.7.42-1.1.42Z"
        fill="currentColor"
      />
      <path
        d="M12 4.6 10 9l3.2 1.8-2 4.6 1 4.6"
        fill="none"
        stroke="rgba(7,11,20,0.9)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Moeda de ouro — usada no chip de moedas e nos preços. */
export function CoinIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <defs>
        <linearGradient id="cmi-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.2" fill="url(#cmi-coin)" stroke="#78350f" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5.9" fill="none" stroke="#92400e" strokeWidth="1.1" opacity="0.7" />
      <path
        d="M12 8.4l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z"
        fill="#78350f"
        opacity="0.85"
      />
      <circle cx="8.6" cy="7.4" r="1.5" fill="rgba(255,255,255,0.75)" />
    </svg>
  )
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
  return (
    <svg {...svgProps(p)}>
      <path
        d="M12 2.6c-4.9 0-8.4 3.4-8.4 8.1 0 2.6 1.2 4.6 3 5.9v3a1.6 1.6 0 0 0 1.6 1.6h.7v-2.1a.7.7 0 0 1 1.4 0v2.1h3.4v-2.1a.7.7 0 0 1 1.4 0v2.1h.7a1.6 1.6 0 0 0 1.6-1.6v-3c1.8-1.3 3-3.3 3-5.9 0-4.7-3.5-8.1-8.4-8.1Z"
        fill="currentColor"
      />
      <circle cx="8.6" cy="11" r="2.1" fill="rgba(7,11,20,0.9)" />
      <circle cx="15.4" cy="11" r="2.1" fill="rgba(7,11,20,0.9)" />
      <path d="M12 13.6l1.1 2.2h-2.2Z" fill="rgba(7,11,20,0.9)" />
    </svg>
  )
}

/** Presente — recompensa pós-vitória. */
export function GiftIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <defs>
        <linearGradient id="cmi-gift" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="3.4" y="7.6" width="17.2" height="4.4" rx="1.2" fill="url(#cmi-gift)" stroke="#78350f" strokeWidth="1.1" />
      <rect x="4.8" y="12" width="14.4" height="9" rx="1.4" fill="currentColor" stroke="rgba(7,11,20,0.45)" strokeWidth="1.1" />
      <rect x="10.6" y="7.6" width="2.8" height="13.4" fill="url(#cmi-gift)" stroke="#78350f" strokeWidth="0.9" />
      <path
        d="M12 7.2C10.2 4 7.2 3.2 6.2 4.6c-.9 1.3.6 2.9 5.8 2.6Zm0 0c1.8-3.2 4.8-4 5.8-2.6.9 1.3-.6 2.9-5.8 2.6Z"
        fill="url(#cmi-gift)"
        stroke="#78350f"
        strokeWidth="1"
      />
    </svg>
  )
}

/** Bola de futebol — marca do jogo (tela de título). */
export function BallIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <defs>
        <radialGradient id="cmi-ball" cx="0.35" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9.6" fill="url(#cmi-ball)" stroke="#0f172a" strokeWidth="1.2" />
      <path d="M12 8.2l3.6 2.6-1.4 4.2H9.8L8.4 10.8Z" fill="#0f172a" />
      <g stroke="#0f172a" strokeWidth="1.1" fill="none">
        <path d="M12 8.2V4.6M15.6 10.8l3.4-1.2M14.2 15l2.2 3M9.8 15l-2.2 3M8.4 10.8 5 9.6" />
        <path d="M12 4.6c-2.2 0-4.2.8-5.8 2.2M12 4.6c2.2 0 4.2.8 5.8 2.2M5 9.6c-.4 1.6-.3 3.4.3 5M19 9.6c.4 1.6.3 3.4-.3 5M7.6 18c1.3 1 2.8 1.6 4.4 1.6s3.1-.6 4.4-1.6" />
      </g>
    </svg>
  )
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

/** Setas de troca (⇄) — trocar titular/reserva. */
export function SwapIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M4 8.4h12.2M13.4 4.8l3.6 3.6-3.6 3.6M20 15.6H7.8M10.6 12l-3.6 3.6 3.6 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/** Cores do frasco por tipo de poção (vermelho = força, ciano = velocidade). */
const POTION_COLORS = {
  strength: { light: '#fca5a5', mid: '#ef4444' },
  pace: { light: '#67e8f9', mid: '#06b6d4' },
}

/**
 * Frasco de poção com o líquido na cor do tipo e o símbolo do efeito dentro:
 * haltere (força) ou raio (velocidade). Segue o padrão de gradiente com id fixo.
 */
export function PotionIcon({ kind, ...p }: IconProps & { kind: 'strength' | 'pace' }) {
  const c = POTION_COLORS[kind]
  const grad = `cmi-potion-${kind}`
  return (
    <svg {...svgProps(p)}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="1" stopColor={c.mid} />
        </linearGradient>
      </defs>
      {/* rolha */}
      <rect x="9.6" y="1.3" width="4.8" height="3.2" rx="1" fill="#b45309" />
      <rect x="9.6" y="1.3" width="4.8" height="1.3" rx="0.65" fill="#d97706" />
      {/* líquido (bojo do frasco) */}
      <circle cx="12" cy="14.3" r="5.5" fill={`url(#${grad})`} />
      <rect x="10.2" y="5.2" width="3.6" height="4.4" fill={`url(#${grad})`} />
      {/* símbolo do efeito */}
      {kind === 'pace' ? (
        <path d="M13.3 10.4 9.9 15h2l-1.2 3.6 3.5-4.8h-2Z" fill="rgba(255,255,255,0.95)" />
      ) : (
        <g fill="rgba(255,255,255,0.95)">
          <rect x="9.1" y="13.5" width="5.8" height="1.7" rx="0.85" />
          <rect x="7.9" y="12.1" width="1.8" height="4.5" rx="0.8" />
          <rect x="14.3" y="12.1" width="1.8" height="4.5" rx="0.8" />
        </g>
      )}
      {/* bolhas e brilho do vidro */}
      <circle cx="10" cy="11.4" r="0.8" fill="rgba(255,255,255,0.65)" />
      <circle cx="14.4" cy="10.8" r="0.55" fill="rgba(255,255,255,0.6)" />
      <path
        d="M10.1 4.5h3.8v3.9a6.6 6.6 0 1 1-3.8 0Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 12.6c-.6 1-.8 2.2-.5 3.4"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Apito de árbitro — fim de jogo. */
export function WhistleIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M13.6 8.2H21a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1h-1.6l-3.2 1.2a5.9 5.9 0 1 1-5.5-5.6Z"
        fill="currentColor"
      />
      <circle cx="9.4" cy="14.4" r="2" fill="rgba(7,11,20,0.85)" />
      <path
        d="M8.2 4.2v2.2M12.4 3.4l-.6 2.2M4.4 5.6l1.2 1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Ícone de fechar (X) para modais e popups. */
export function CloseIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

/** Chama — chip de Ascension (dificuldade aumentada). */
export function FlameIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M12 2.4c.5 3-1.1 4.6-2.7 6.2C7.6 10.3 6 12 6 15a6 6 0 0 0 12 0c0-2.1-.8-3.7-1.9-5.2-.4 1-.9 1.7-1.8 2.3.3-3.6-.7-7.2-2.3-9.7Z"
        fill="currentColor"
      />
      <path
        d="M12 21.4a3.4 3.4 0 0 1-3.4-3.4c0-1.7 1-2.6 1.9-3.5.6-.6 1.1-1.2 1.3-2 1.4 1.2 3.6 3.2 3.6 5.5a3.4 3.4 0 0 1-3.4 3.4Z"
        fill="rgba(255,255,255,0.4)"
      />
    </svg>
  )
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
