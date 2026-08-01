/**
 * Emblemas SVG desenhados à mão da corrida — os nós do mapa e os heróis das
 * telas de desfecho. Nada de emoji do sistema e nada de arte raster: no print
 * 1:1 o glifo da plataforma aparecia com paleta e luz que não são do jogo.
 *
 * Os ícones de NÓ (mercado, treinamento, largada) cabem INTEIROS num círculo de
 * centro (32,32) e raio 26 do viewBox de 64 — é isso que permite montá-los
 * dentro do mesmo medalhão dos nós de país (`.rq-node-badge`), no diâmetro do
 * `<ClubBadge size={32}>`, em vez de boiarem soltos sobre a grama com o cadeado
 * pendurado no vazio. Qualquer detalhe novo tem que respeitar esse raio.
 *
 * Luz sempre do alto-esquerda (reflexos brancos na aresta superior/esquerda),
 * como no resto da arte.
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
      {/* barra mais curta e giro menor que o desenho anterior: as anilhas
          externas ficavam a 29 do centro e vazariam pelo anel do medalhão. */}
      <g transform="rotate(-20 32 32)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1">
        {/* barra + pegada central */}
        <rect x="20" y="29.4" width="24" height="5.2" rx="2.6" fill="url(#rqi-steel)" />
        <rect x="27.8" y="28.2" width="8.4" height="7.6" rx="2.4" fill="url(#rqi-cyan-out)" />
        {/* anilhas (interna maior, externa menor) */}
        <rect x="14.4" y="19" width="6.6" height="26" rx="2.5" fill="url(#rqi-cyan-in)" />
        <rect x="9" y="24" width="4.8" height="16" rx="2.1" fill="url(#rqi-cyan-out)" />
        <rect x="43" y="19" width="6.6" height="26" rx="2.5" fill="url(#rqi-cyan-in)" />
        <rect x="50.2" y="24" width="4.8" height="16" rx="2.1" fill="url(#rqi-cyan-out)" />
      </g>
      {/* reflexos nas anilhas internas */}
      <g transform="rotate(-20 32 32)" fill="rgba(255, 255, 255, 0.5)">
        <rect x="15.8" y="21" width="1.6" height="22" rx="0.8" />
        <rect x="44.4" y="21" width="1.6" height="22" rx="0.8" />
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
          <path d="M12 22 H52 V29 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 Z" />
        </clipPath>
      </defs>
      {/* fachada de madeira (sem piso e sem janelinhas: dentro do medalhão o
          piso encostava no anel e as janelas de 3px viravam ruído) */}
      <rect x="16" y="29" width="32" height="21" rx="2" fill="url(#rqi-wood)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1" />
      {/* porta em arco com luz quente saindo de dentro */}
      <path d="M26.5 50 V41.5 a5.5 5.5 0 0 1 11 0 V50 Z" fill="#1c0f06" />
      <path d="M28 50 V42 a4 4 0 0 1 8 0 V50 Z" fill="#f59e0b" opacity="0.85" />
      {/* toldo listrado (vermelho + âmbar) com barrado ondulado */}
      <g clipPath="url(#rqi-awning-clip)">
        <rect x="12" y="22" width="40" height="13" fill="#b91c1c" />
        <rect x="12" y="22" width="10" height="13" fill="#f59e0b" />
        <rect x="32" y="22" width="10" height="13" fill="#f59e0b" />
        <rect x="12" y="22" width="40" height="3.4" fill="rgba(255, 255, 255, 0.22)" />
      </g>
      <path
        d="M12 22 H52 V29 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 a5 5 0 0 1 -10 0 Z"
        fill="none"
        stroke="rgba(2, 8, 23, 0.55)"
        strokeWidth="1.2"
      />
      <rect x="12" y="17.5" width="40" height="4.6" rx="2.3" fill="url(#rqi-coin)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="1" />
      {/* placa-moeda pendurada no barrado, DENTRO do quadro (antes ela pendia da
          quina superior direita, o ponto mais distante do centro do emblema) */}
      <g className="rqi-swing">
        <line x1="47" y1="32" x2="47" y2="38.5" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="47" cy="43.5" r="5.5" fill="url(#rqi-coin)" stroke="#78350f" strokeWidth="1.3" />
        <circle cx="47" cy="43.5" r="3.1" fill="none" stroke="#92400e" strokeWidth="1.1" opacity="0.7" />
        <circle cx="45.2" cy="41.7" r="1.2" fill="rgba(255, 255, 255, 0.75)" />
      </g>
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

/** Fim de jornada (eliminado) — caveira desenhada na MESMA família do troféu:
 *  lado a lado com a vitória, a arte raster antiga parecia emoji de sistema. */
export function SkullIcon({ size = 44, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="rqi-bone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.55" stopColor="#dbe2ec" />
          <stop offset="1" stopColor="#8695ad" />
        </linearGradient>
      </defs>
      <g stroke="rgba(2, 8, 23, 0.55)" strokeWidth="1.4" strokeLinejoin="round">
        {/* mandíbula primeiro, crânio por cima (esconde a emenda) */}
        <path d="M21 42 H43 V52 A4 4 0 0 1 39 56 H25 A4 4 0 0 1 21 52 Z" fill="url(#rqi-bone)" />
        <path
          d="M32 5 C47 5 57 16 57 30 C57 39 52 45 45 47 H19 C12 45 7 39 7 30 C7 16 17 5 32 5 Z"
          fill="url(#rqi-bone)"
        />
      </g>
      {/* órbitas e nariz */}
      <g fill="#0b1120">
        <ellipse cx="22" cy="30" rx="8" ry="9" />
        <ellipse cx="42" cy="30" rx="8" ry="9" />
        <path d="M32 36 L37 46 H27 Z" />
      </g>
      {/* dentes */}
      <path d="M27 47 V56 M32 47 V56 M37 47 V56" fill="none" stroke="rgba(2, 8, 23, 0.45)" strokeWidth="1.3" />
      {/* mesmo reflexo do troféu, no alto do crânio */}
      <path
        d="M17 21 c3 -6 8 -9.5 13 -10.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** "Você está aqui" — ponteiro apontando pro nó onde o jogador está agora. */
export function HerePinIcon({ size = 26, className }: MapIconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="rqi-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.45" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        {/* o ponteiro flutua sobre a arte pintada do mapa: sem sombra própria
            (os outros emblemas ganham a deles no CSS) o triângulo boiava. */}
        <filter id="rqi-here-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#000" floodOpacity="0.7" />
        </filter>
      </defs>
      <g filter="url(#rqi-here-shadow)">
        <path
          d="M10 12 H54 L32 50 Z"
          fill="url(#rqi-red)"
          stroke="rgba(2, 8, 23, 0.6)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M18 19 H31" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Largada — bandeirada quadriculada tremulando no mastro, fincada na base. */
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
          <path d="M24 15 C31 11.5 38 18 46 14.8 V29 C38 32.2 31 25.8 24 29.2 Z" />
        </clipPath>
      </defs>
      {/* mastro curto com pé: o de antes atravessava 50 dos 64 do quadro e
          descia como um fio de 1px, sem nada que o apoiasse */}
      <rect x="15" y="46.4" width="15" height="3.6" rx="1.8" fill="url(#rqi-steel)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="0.9" />
      <rect x="20.5" y="14" width="3.4" height="34" rx="1.7" fill="url(#rqi-steel)" stroke="rgba(2, 8, 23, 0.5)" strokeWidth="0.9" />
      <circle cx="22.2" cy="13" r="3" fill="url(#rqi-coin)" stroke="rgba(56, 22, 3, 0.55)" strokeWidth="0.9" />
      {/* bandeira quadriculada tremulando (ver .rqi-wave) */}
      <g className="rqi-wave">
        <path
          d="M24 15 C31 11.5 38 18 46 14.8 V29 C38 32.2 31 25.8 24 29.2 Z"
          fill="#f8fafc"
          stroke="rgba(2, 8, 23, 0.5)"
          strokeWidth="1.1"
        />
        <g clipPath="url(#rqi-flag-clip)" fill="#0f172a">
          <rect x="24" y="11.5" width="5.5" height="5.5" />
          <rect x="35" y="11.5" width="5.5" height="5.5" />
          <rect x="29.5" y="17" width="5.5" height="5.5" />
          <rect x="40.5" y="17" width="5.5" height="5.5" />
          <rect x="24" y="22.5" width="5.5" height="5.5" />
          <rect x="35" y="22.5" width="5.5" height="5.5" />
          <rect x="29.5" y="28" width="5.5" height="5.5" />
          <rect x="40.5" y="28" width="5.5" height="5.5" />
        </g>
      </g>
    </svg>
  )
}

/** Vida perdida — coração rachado ao meio, na MESMA família do troféu e da
 *  caveira. A arte raster que ele substitui era o glifo 💔 de plataforma:
 *  brilho plástico e vermelho que não existem em nenhum outro lugar do jogo. */
export function HeartbreakIcon({ size = 44, className }: MapIconProps) {
  // as duas metades compartilham a MESMA linha de rachadura, então encaixam
  // perfeitamente; o giro em torno da ponta de baixo abre o V que lê "partido".
  const crack = 'L27 42 L33 33 L28 27 Z'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        {/* userSpaceOnUse: com o gradiente por caixa de cada metade, os dois
            lados ganhariam rampas diferentes e a emenda saltaria à vista */}
        <linearGradient id="rqi-blood" x1="0" y1="13" x2="0" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="0.45" stopColor="#f43f5e" />
          <stop offset="1" stopColor="#9f1239" />
        </linearGradient>
      </defs>
      <g stroke="rgba(2, 8, 23, 0.55)" strokeWidth="1.4" strokeLinejoin="round" fill="url(#rqi-blood)">
        <path transform="rotate(-5 32 55)" d={`M32 24 C28 15 17 13 11 20 C5 27 8 37 32 55 ${crack}`} />
        <path transform="rotate(5 32 55)" d={`M32 24 C36 15 47 13 53 20 C59 27 56 37 32 55 ${crack}`} />
      </g>
      {/* mesmo reflexo do troféu e da caveira, no lobo de cima à esquerda */}
      <path
        d="M15 24 c2.5 -5 8.5 -6.5 12.5 -3.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="2.6"
        strokeLinecap="round"
        transform="rotate(-5 32 55)"
      />
    </svg>
  )
}
