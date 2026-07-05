import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Attrs, Role } from '../sim/types'

/** Um atributo exibível: chave interna, rótulo PT-BR e explicação (popup "i"). */
export interface AttrMeta {
  key: keyof Attrs
  label: string
  /** Resumo de UMA linha: o que é este atributo. */
  desc: string
  /** O que ele muda em campo, em tópicos curtos (renderizados como lista no popup). */
  effects: string[]
}

/** Rótulos em PT-BR, ordem de exibição e explicações, agrupados como em atributos.md. */
export const ATTR_GROUPS: { title: string; keys: AttrMeta[] }[] = [
  {
    title: 'Físico',
    keys: [
      {
        key: 'pace',
        label: 'Velocidade',
        desc: 'A velocidade máxima de corrida.',
        effects: [
          'Chega primeiro na bola dividida',
          'Escapa do marcador em disparada',
          'Alcança (ou puxa) o contra-ataque',
        ],
      },
      {
        key: 'acceleration',
        label: 'Aceleração',
        desc: 'O arranque e a mudança de direção.',
        effects: [
          'Sai na frente nas disputas curtas',
          'Vira e gira sem perder velocidade',
          'No goleiro: reação explosiva na área',
        ],
      },
      {
        key: 'strength',
        label: 'Físico',
        desc: 'O corpo do jogador: força, impulsão e fôlego.',
        effects: [
          'Vence o duelo de corpo e protege a bola',
          'Dá potência ao chute (bola forte no gol)',
          'Ganha e direciona a bola alta (cabeceio)',
          'Aguenta o ritmo até o fim do jogo',
        ],
      },
    ],
  },
  {
    title: 'Técnico',
    keys: [
      {
        key: 'dribbling',
        label: 'Drible',
        desc: 'A habilidade e o talento com a bola no pé.',
        effects: [
          'Passa pelo marcador no 1 contra 1',
          'Conduz em velocidade sem perder a bola',
          'Dá efeito/curva e ousadia ao chute',
        ],
      },
      {
        key: 'firstTouch',
        label: 'Domínio',
        desc: 'A qualidade do primeiro toque na bola.',
        effects: [
          'Mata no pé até a bola forte/difícil',
          'Domina bolas que chegam mais longe',
          'Baixo: a bola espirra e o lance se perde',
        ],
      },
      {
        key: 'passing',
        label: 'Passe',
        desc: 'A precisão e a força do passe, raso ou alçado.',
        effects: [
          'Encaixa o passe mesmo na janela apertada',
          'Cruzamento/escanteio acha o atacante na área',
          'Melhora a saída de bola do goleiro',
        ],
      },
      {
        key: 'finishing',
        label: 'Finalização',
        desc: 'A mira do chute a gol, de perto ou de longe.',
        effects: [
          'Converte as chances (menos bola pra fora)',
          'Arrisca — e acerta — de fora da área',
          'Bate forte sem perder o alvo',
        ],
      },
      {
        key: 'tackling',
        label: 'Defesa',
        desc: 'O jogo defensivo: desarme, marcação e pressão.',
        effects: [
          'Rouba a bola no bote e no carrinho',
          'Cola no adversário e fecha o espaço dele',
          'Pressiona a saída de bola do rival',
        ],
      },
    ],
  },
  {
    title: 'Mental',
    keys: [
      {
        key: 'positioning',
        label: 'QI de jogo',
        desc: 'A inteligência em campo, com e sem a bola.',
        effects: [
          'Se posiciona certo e intercepta passes',
          'Aparece livre para receber no ataque',
          'Solta a bola na hora certa (não enrola)',
          'Mantém a frieza sob pressão (erra menos)',
        ],
      },
    ],
  },
  {
    title: 'Goleiro',
    keys: [
      {
        key: 'goalkeeping',
        label: 'Goleiro',
        desc: 'Tudo que faz um goleiro (só o GK usa).',
        effects: [
          'Defende o chute e segura sem dar rebote',
          'Voa mais longe no mergulho',
          'Sai no cruzamento e fecha o 1 contra 1',
        ],
      },
    ],
  },
]

/** Rótulo PT-BR de um atributo (busca em ATTR_GROUPS — fonte única dos rótulos). */
export const attrLabel = (key: keyof Attrs): string =>
  ATTR_GROUPS.flatMap((g) => g.keys).find((k) => k.key === key)?.label ?? key

export const ROLE_LABEL: Record<Role, string> = {
  GK: 'Goleiro',
  DEF: 'Defesa',
  MID: 'Meio-campo',
  FWD: 'Ataque',
}

/** Ordem de exibição das funções (GK → DEF → MID → FWD) nas listas de elenco. */
export const ROLE_ORDER: Record<Role, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

/** Comparador padrão de elenco: por função e, dentro dela, do maior overall pro menor. */
export const byRole = <T extends { role: Role; overall: number }>(a: T, b: T): number =>
  ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.overall - a.overall

/** Grupos de atributos visíveis para a função. Sem função (modo run, onde a
 *  posição vem do slot e qualquer um pode ir pro gol), TODOS os grupos aparecem. */
export const attrGroupsFor = (role?: Role) =>
  ATTR_GROUPS.filter((g) => g.title !== 'Goleiro' || role === undefined || role === 'GK')

/** Rótulo de posição com a cor da função (mesma paleta dos chips do campinho tático). */
export function RoleTag({ role }: { role: Role }) {
  return <span className={`cm-role cm-role-${role.toLowerCase()}`}>{ROLE_LABEL[role]}</span>
}

/** Cor conforme a faixa do atributo/nota (0..100). Fonte única de escala visual. */
export const attrColor = (v: number): string =>
  v >= 85 ? 'var(--cm-green)' : v >= 70 ? '#84cc16' : v >= 50 ? '#facc15' : '#f97316'

/** Média geral simples (todos os atributos) — usada na tela de elenco da demo. */
export const overallOfAll = (a: Attrs): number => {
  const vals = Object.values(a)
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}

/**
 * Ícone "i" com popup explicativo, para o jogador que quiser saber mais. Abre no
 * hover do mouse, no foco (teclado) e no clique (toque). O balão é renderizado num
 * PORTAL no body com `position: fixed`, então nunca é cortado pelo scroll do modal.
 */
export function AttrInfo({ label, desc, effects }: { label: string; desc: string; effects?: string[] }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; above: boolean } | null>(null)

  const show = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const above = r.top > 140 // acima se couber; senão, abaixo do ícone
    const half = 130 // metade da largura máx. do balão, para não vazar nas bordas
    const x = Math.max(half, Math.min(window.innerWidth - half, r.left + r.width / 2))
    setTip({ x, y: above ? r.top - 8 : r.bottom + 8, above })
  }, [])
  const hide = useCallback(() => setTip(null), [])

  return (
    <span
      ref={ref}
      className="ps-info"
      tabIndex={0}
      role="button"
      aria-label={`O que é ${label}?`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={(e) => {
        e.stopPropagation()
        if (tip) hide()
        else show()
      }}
    >
      i
      {tip &&
        createPortal(
          <span
            className={`ps-tip ${tip.above ? 'above' : 'below'}`}
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
          >
            <strong>{label}</strong>
            {desc}
            {effects && effects.length > 0 && (
              <ul className="ps-tip-list">
                {effects.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </span>,
          document.body,
        )}
    </span>
  )
}

export function AttrBar({
  label,
  value,
  desc,
  effects,
}: {
  label: string
  value: number
  desc?: string
  effects?: string[]
}) {
  return (
    <div className="ps-attr">
      <span className="ps-attr-label">
        <span className="ps-attr-label-text">{label}</span>
        {desc && <AttrInfo label={label} desc={desc} effects={effects} />}
      </span>
      <span className="ps-attr-bar">
        <span className="ps-attr-fill" style={{ width: `${value}%`, background: attrColor(value) }} />
      </span>
      <span className="ps-attr-val" style={{ color: attrColor(value) }}>
        {value}
      </span>
    </div>
  )
}

/**
 * Lista compacta de TODOS os atributos (sem títulos de grupo) — usada nos cards
 * de mercado e de recompensa, onde o espaço é curto mas nada pode ficar oculto.
 * Com `role`, atributos exclusivos de goleiro só aparecem para o GK; sem `role`
 * (modo run) tudo aparece — qualquer jogador pode ser posto no gol.
 */
export function AttrList({ role, attrs }: { role?: Role; attrs: Attrs }) {
  const keys = ATTR_GROUPS.flatMap((g) => g.keys).filter(
    (k) => k.key !== 'goalkeeping' || role === undefined || role === 'GK',
  )
  return (
    <div className="mk-attrs">
      {keys.map((k) => (
        <AttrBar key={k.key} label={k.label} value={attrs[k.key]} desc={k.desc} effects={k.effects} />
      ))}
    </div>
  )
}

/** Legenda compacta da escala de cores dos atributos/nota (mesmos limiares de `attrColor`). */
function AttrColorLegend() {
  return (
    <div className="ps-legend">
      {(
        [
          [30, 'Fraco'],
          [55, 'Razoável'],
          [75, 'Bom'],
          [90, 'Ótimo'],
        ] as const
      ).map(([sample, word]) => (
        <span key={word} className="ps-legend-item">
          <span className="ps-legend-dot" style={{ background: attrColor(sample) }} aria-hidden />
          {word}
        </span>
      ))}
    </div>
  )
}

/** Painel de grupos de atributos de um jogador (reutilizado em telas diferentes). */
export function AttrGroups({ role, attrs }: { role?: Role; attrs: Attrs }) {
  const groups = attrGroupsFor(role)
  return (
    <div className="ps-groups">
      {groups.map((g) => (
        <div key={g.title} className="ps-group">
          <h4>{g.title}</h4>
          {g.keys.map((k) => (
            <AttrBar key={k.key} label={k.label} value={attrs[k.key]} desc={k.desc} effects={k.effects} />
          ))}
        </div>
      ))}
      <AttrColorLegend />
    </div>
  )
}
