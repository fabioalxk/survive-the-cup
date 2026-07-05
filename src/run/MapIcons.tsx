/**
 * Ícones SVG do mapa da corrida — emblemas desenhados à mão (nada de emoji),
 * com gradientes, brilhos e detalhes próprios. Ficam "soltos" sobre o mapa
 * (fundo transparente, sem círculo), no clima de Slay the Spire.
 *
 * Os gradientes usam ids fixos: instâncias repetidas do mesmo ícone declaram
 * defs idênticos, então o url(#id) resolve sempre para o mesmo visual.
 */

export type MapIconProps = { size?: number; className?: string }

/** Academia — haltere de aço com anilhas em azul-ciano (tema dos nós de treino). */
export function GymIcon({ size = 44, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="rqi-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.45" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="rqi-cyan-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="rqi-cyan-out" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#075985" />
        </linearGradient>
      </defs>
      <g transform="rotate(-24 32 32)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1">
        {/* barra + pegada central */}
        <rect x="17" y="29" width="30" height="6" rx="3" fill="url(#rqi-steel)" />
        <rect x="27.5" y="27.8" width="9" height="8.4" rx="2.6" fill="url(#rqi-cyan-out)" />
        {/* anilhas (interna maior, externa menor) */}
        <rect x="11" y="16.5" width="7.5" height="31" rx="2.8" fill="url(#rqi-cyan-in)" />
        <rect x="4.8" y="22.5" width="5.6" height="19" rx="2.4" fill="url(#rqi-cyan-out)" />
        <rect x="45.5" y="16.5" width="7.5" height="31" rx="2.8" fill="url(#rqi-cyan-in)" />
        <rect x="53.6" y="22.5" width="5.6" height="19" rx="2.4" fill="url(#rqi-cyan-out)" />
      </g>
      {/* reflexos nas anilhas internas */}
      <g transform="rotate(-24 32 32)" fill="rgba(255, 255, 255, 0.5)">
        <rect x="12.6" y="18.5" width="1.8" height="26" rx="0.9" />
        <rect x="47.1" y="18.5" width="1.8" height="26" rx="0.9" />
      </g>
    </svg>
  )
}

/** Mercado — barraca de feira com toldo listrado, porta iluminada e moeda pendurada. */
export function MarketIcon({ size = 44, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="rqi-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92561f" />
          <stop offset="1" stopColor="#3f2308" />
        </linearGradient>
        <linearGradient id="rqi-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <clipPath id="rqi-awning-clip">
          <path d="M8 21 H56 V29 A6 6 0 0 1 44 29 A6 6 0 0 1 32 29 A6 6 0 0 1 20 29 A6 6 0 0 1 8 29 Z" />
        </clipPath>
      </defs>
      {/* fachada de madeira */}
      <rect x="12" y="28" width="40" height="26" rx="2" fill="url(#rqi-wood)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1" />
      {/* janelas acesas */}
      <rect x="16.5" y="36" width="7" height="7" rx="1.4" fill="#fcd34d" opacity="0.9" stroke="#3f2308" strokeWidth="1.2" />
      <rect x="40.5" y="36" width="7" height="7" rx="1.4" fill="#fcd34d" opacity="0.9" stroke="#3f2308" strokeWidth="1.2" />
      {/* porta em arco com luz quente saindo de dentro */}
      <path d="M26.5 54 V42.5 a5.5 5.5 0 0 1 11 0 V54 Z" fill="#1c0f06" />
      <path d="M28.2 54 V43 a3.8 3.8 0 0 1 7.6 0 V54 Z" fill="#f59e0b" opacity="0.85" />
      {/* toldo listrado (vermelho + âmbar) com barrado ondulado */}
      <g clipPath="url(#rqi-awning-clip)">
        <rect x="8" y="21" width="48" height="15" fill="#b91c1c" />
        <rect x="8" y="21" width="12" height="15" fill="#f59e0b" />
        <rect x="32" y="21" width="12" height="15" fill="#f59e0b" />
        <rect x="8" y="21" width="48" height="4" fill="rgba(255, 255, 255, 0.22)" />
      </g>
      <path
        d="M8 21 H56 V29 A6 6 0 0 1 44 29 A6 6 0 0 1 32 29 A6 6 0 0 1 20 29 A6 6 0 0 1 8 29 Z"
        fill="none"
        stroke="rgba(2, 8, 23, 0.55)"
        strokeWidth="1.2"
      />
      <rect x="6.5" y="16.5" width="51" height="5" rx="2.5" fill="url(#rqi-coin)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1" />
      {/* moeda pendurada na quina da barraca (balança com a "brisa" — ver .rqi-swing) */}
      <g className="rqi-swing">
        <line x1="53.5" y1="18" x2="53.5" y2="8" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="53.5" cy="9.5" r="6.2" fill="url(#rqi-coin)" stroke="#78350f" strokeWidth="1.3" />
        <circle cx="53.5" cy="9.5" r="3.6" fill="none" stroke="#92400e" strokeWidth="1.1" opacity="0.7" />
        <circle cx="51.4" cy="7.4" r="1.3" fill="rgba(255, 255, 255, 0.75)" />
      </g>
      {/* piso */}
      <rect x="10" y="53.5" width="44" height="3.4" rx="1.7" fill="#1e293b" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1" />
    </svg>
  )
}

/** Chefão — troféu dourado com brilho e faísca. */
export function TrophyIcon({ size = 44, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="rqi-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="rqi-gold-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d97706" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <g stroke="rgba(56, 22, 3, 0.55)" strokeWidth="1">
        {/* alças */}
        <path
          d="M17.5 15 h-5.5 a2.5 2.5 0 0 0 -2.5 2.5 c0 8.5 4.5 14 11 15.5 M46.5 15 h5.5 a2.5 2.5 0 0 1 2.5 2.5 c0 8.5 -4.5 14 -11 15.5"
          fill="none"
          stroke="url(#rqi-gold-dark)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* taça */}
        <path d="M18 11 H46 V24 C46 33.5 40 39.5 32 39.5 C24 39.5 18 33.5 18 24 Z" fill="url(#rqi-gold)" />
        <rect x="15.5" y="8" width="33" height="5.5" rx="2.75" fill="url(#rqi-gold)" />
        {/* haste e base */}
        <path d="M28.5 39.5 H35.5 L37.5 48 H26.5 Z" fill="url(#rqi-gold-dark)" />
        <rect x="23" y="48" width="18" height="4.5" rx="2" fill="url(#rqi-gold)" />
        <rect x="19.5" y="52.5" width="25" height="5" rx="2.2" fill="url(#rqi-gold-dark)" />
      </g>
      {/* reflexo da taça + faísca piscando (ver .rqi-spark) */}
      <path d="M23 14 c-1 6 0 12 3.5 17" fill="none" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="2.4" strokeLinecap="round" />
      <path
        className="rqi-spark"
        d="M50 1.5 l1.5 3.9 3.9 1.5 -3.9 1.5 -1.5 3.9 -1.5 -3.9 -3.9 -1.5 3.9 -1.5 Z"
        fill="#fff"
        opacity="0.9"
      />
    </svg>
  )
}

/** Coroa do chefão — flutua sobre o escudo do adversário final. */
export function CrownIcon({ size = 26, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        {/* mesmos ids/cores do ouro dos outros ícones — defs idênticos */}
        <linearGradient id="rqi-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="rqi-gold-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d97706" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <g stroke="rgba(56, 22, 3, 0.55)" strokeWidth="1.4">
        <path d="M10 45 L10 22 L22 33 L32 13 L42 33 L54 22 L54 45 Z" fill="url(#rqi-gold)" />
        <rect x="10" y="45" width="44" height="7" rx="2.5" fill="url(#rqi-gold-dark)" />
      </g>
      {/* pontas e joias */}
      <circle cx="10" cy="21" r="3" fill="#fef3c7" stroke="rgba(56, 22, 3, 0.55)" strokeWidth="1" />
      <circle cx="32" cy="12" r="3.4" fill="#fef3c7" stroke="rgba(56, 22, 3, 0.55)" strokeWidth="1" />
      <circle cx="54" cy="21" r="3" fill="#fef3c7" stroke="rgba(56, 22, 3, 0.55)" strokeWidth="1" />
      <circle cx="32" cy="48.5" r="2.6" fill="#dc2626" stroke="rgba(56, 22, 3, 0.6)" strokeWidth="1" />
      <circle cx="20" cy="48.5" r="2" fill="#2563eb" stroke="rgba(56, 22, 3, 0.6)" strokeWidth="1" />
      <circle cx="44" cy="48.5" r="2" fill="#2563eb" stroke="rgba(56, 22, 3, 0.6)" strokeWidth="1" />
    </svg>
  )
}

/** Largada — bandeirada quadriculada tremulando no mastro. */
export function FlagIcon({ size = 44, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        {/* mesmos ids/cores do aço e do ouro dos outros ícones — defs idênticos */}
        <linearGradient id="rqi-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.45" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="rqi-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <clipPath id="rqi-flag-clip">
          <path d="M22.6 11 C31 7.5 38 15 48.5 11.2 V28.5 C38 32.3 31 24.8 22.6 28.3 Z" />
        </clipPath>
      </defs>
      {/* mastro */}
      <rect x="19" y="7" width="3.6" height="50" rx="1.8" fill="url(#rqi-steel)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="0.9" />
      <circle cx="20.8" cy="6.5" r="3" fill="url(#rqi-coin)" stroke="rgba(56, 22, 3, 0.55)" strokeWidth="0.9" />
      {/* bandeira quadriculada tremulando (ver .rqi-wave) */}
      <g className="rqi-wave">
        <path
          d="M22.6 11 C31 7.5 38 15 48.5 11.2 V28.5 C38 32.3 31 24.8 22.6 28.3 Z"
          fill="#f8fafc"
          stroke="rgba(2, 8, 23, 0.5)"
          strokeWidth="1.1"
        />
        <g clipPath="url(#rqi-flag-clip)" fill="#0f172a">
          <rect x="22.6" y="8" width="6.5" height="6.5" />
          <rect x="35.6" y="8" width="6.5" height="6.5" />
          <rect x="29.1" y="14.5" width="6.5" height="6.5" />
          <rect x="42.1" y="14.5" width="6.5" height="6.5" />
          <rect x="22.6" y="21" width="6.5" height="6.5" />
          <rect x="35.6" y="21" width="6.5" height="6.5" />
        </g>
      </g>
    </svg>
  )
}
