// tools/.scratch-shots/gen-boss-prematch.entry.ts
import { writeFileSync } from "node:fs";

// src/sim/constants.ts
var FIELD = {
  w: 105,
  h: 68,
  cx: 105 / 2,
  cy: 68 / 2
};
var MATCH = {
  /** duração de cada tempo em segundos de JOGO (45 min/tempo = 90' no total). */
  halfSeconds: 45 * 60,
  /** segundos de JOGO que o RELÓGIO avança por segundo de física. É o knob da
   *  velocidade DO RELÓGIO da partida — NÃO mexe na movimentação dos jogadores
   *  (isso é o multiplicador de velocidade). Com 40 e o Normal (1.5x), o relógio
   *  anda ~60s de jogo por segundo real ≈ 1 minuto a cada segundo. */
  clockRate: 40
};
var STOPPAGE = {
  /** somado por gol marcado */
  perGoal: 50,
  /** somado por falta */
  perFoul: 12,
  /** somado por cartão/expulsão */
  perCard: 20,
  /** teto de acréscimos por tempo (s de jogo) */
  max: 6 * 60
};
var PHYS = {
  /** passo fixo da simulação (s) */
  dt: 1 / 60,
  /** aceleração-base do jogador (m/s²); cada um varia conforme o ritmo */
  playerAccel: 14,
  /** raio do jogador (m) */
  playerRadius: 0.9,
  /** raio da bola (m) */
  ballRadius: 0.45,
  /** distância para dominar a bola solta (m) — primeiro toque/recepção */
  controlRadius: 1.6,
  /** amortecimento da bola por segundo (fração da velocidade mantida);
   *  mais alto = atrito de rolamento menor, a bola corre mais (passes longos viáveis) */
  ballDamping: 0.72,
  /** empurrão à frente ao conduzir a bola (m) — controle curto (menor = mais firme) */
  dribblePush: 0.45,
  /** fator de velocidade do conduto (mais lento, deixa marcar) */
  dribbleSpeed: 0.86,
  /** efeito (Magnus) máximo dado a um chute (m/s² lateral) */
  maxSpin: 8,
  /** fração do efeito aplicada num PASSE (curva sutil, não tira da mira) */
  passSpinScale: 0.3,
  /** fração do efeito mantida por segundo (a curva vai sumindo) */
  spinDecay: 0.78,
  /** quanto da velocidade do conduto é herdada pela bola ao soltá-la (momentum) */
  releaseCarry: 0.5,
  /** taxa (1/s) com que a bola "persegue" o pé ao conduzir — elástico, não rígido */
  footLerp: 22,
  /** restituição ao bater na trave (0=morre, 1=devolve tudo) */
  postRestitution: 0.5,
  /** raio do poste (m) para a colisão da bola */
  postRadius: 0.06
};

// src/sim/chaos.ts
var GK_ONLY = ["goalkeeping"];
var GK_CORE = ["goalkeeping"];
var ATTR_FLOOR = 15;
var applyChaos = (attrs, role, cfg, src) => {
  const out = { ...attrs };
  const keys = Object.keys(out);
  const used = role === "GK" ? keys : keys.filter((k) => !GK_ONLY.includes(k));
  const mean = used.reduce((a, k) => a + out[k], 0) / used.length;
  const spikable = used.filter((k) => !(role === "GK" && GK_CORE.includes(k)));
  const tankable = used.filter((k) => out[k] < mean && !(role === "GK" && GK_CORE.includes(k)));
  const spikes = src.pickN(spikable, "spike", cfg.spikes);
  const tanks = src.pickN(tankable, "tank", cfg.tanks);
  const clamp2 = (v) => Math.max(ATTR_FLOOR, Math.min(cfg.ceil, Math.round(v)));
  for (const k of used) {
    let v = mean + (out[k] - mean) * cfg.spread;
    v += src.jitter(k) * cfg.jitter;
    if (spikes.has(k)) v += cfg.spikeBoost;
    if (tanks.has(k)) v -= cfg.tankDrop;
    out[k] = clamp2(v);
  }
  return out;
};

// src/sim/teams.ts
var FORMATION_433 = [
  { x: 5, y: 34 },
  // GK
  { x: 20, y: 12 },
  // RB
  { x: 17, y: 27 },
  // CB
  { x: 17, y: 41 },
  // CB
  { x: 20, y: 56 },
  // LB
  { x: 42, y: 20 },
  // MC dir
  { x: 39, y: 34 },
  // MC centro
  { x: 42, y: 48 },
  // MC esq
  { x: 72, y: 15 },
  // PD
  { x: 74, y: 34 },
  // CA
  { x: 72, y: 53 }
  // PE
];
var ROLES_433 = [
  "GK",
  "DEF",
  "DEF",
  "DEF",
  "DEF",
  "MID",
  "MID",
  "MID",
  "FWD",
  "FWD",
  "FWD"
];
var baseAttrs = (role) => {
  const b = {
    // físico
    pace: 65,
    acceleration: 65,
    strength: 65,
    // técnico
    dribbling: 60,
    firstTouch: 62,
    passing: 64,
    finishing: 52,
    tackling: 60,
    // mental
    positioning: 62,
    // goleiro (jogador de linha quase não usa)
    goalkeeping: 20
  };
  if (role === "GK")
    return {
      ...b,
      goalkeeping: 75,
      tackling: 32,
      finishing: 20,
      strength: 70,
      positioning: 71,
      acceleration: 70
    };
  if (role === "DEF")
    return { ...b, tackling: 77, positioning: 78, strength: 78 };
  if (role === "MID")
    return { ...b, passing: 72, strength: 72, positioning: 70 };
  return { ...b, finishing: 78, pace: 80, dribbling: 78, positioning: 75 };
};
var BRASIL = [
  { number: 1, name: "Alisson", attrs: { goalkeeping: 91, positioning: 91, strength: 84, acceleration: 80, passing: 78 } },
  // lateral veterano: inteligente, mas perdendo o pique e sem peso ofensivo
  { number: 2, name: "Danilo", attrs: { tackling: 77, positioning: 78, pace: 64, acceleration: 60, passing: 72, strength: 60, dribbling: 54, finishing: 32 } },
  // zagueiro-líder: leitura e saída de bola de elite, nulo no ataque
  { number: 4, name: "Marquinhos", attrs: { tackling: 87, positioning: 89, pace: 80, strength: 78, passing: 74, dribbling: 58, finishing: 28 } },
  // muralha canhota: forte e dono do alto, MUITO lento e tosco com a bola
  { number: 3, name: "Gabriel M.", attrs: { tackling: 83, strength: 89, pace: 58, acceleration: 56, dribbling: 38, passing: 52, finishing: 24, positioning: 67 } },
  // lateral-ala: pace e cruzamento, FRACO defensivamente e no físico
  { number: 6, name: "Wendell", attrs: { pace: 82, acceleration: 80, strength: 62, dribbling: 68, passing: 78, tackling: 53, finishing: 38, positioning: 52 } },
  // volante destruidor: rouba e impõe físico, porém LENTO e travado tecnicamente
  { number: 5, name: "Casemiro", attrs: { tackling: 88, strength: 88, positioning: 81, passing: 74, finishing: 72, pace: 56, acceleration: 52, dribbling: 48, firstTouch: 56 } },
  // box-to-box completo: o equilibrado do time (poucas fraquezas, nada de elite)
  { number: 8, name: "Bruno G.", attrs: { passing: 84, positioning: 75, strength: 76, dribbling: 76, tackling: 78, finishing: 76, pace: 66 } },
  // camisa 10 de talento: técnica e visão, mas some na marcação e é frágil
  { number: 10, name: "Paquet\xE1", attrs: { dribbling: 86, passing: 84, positioning: 74, finishing: 62, firstTouch: 84, pace: 68, tackling: 37, strength: 50 } },
  // ponta-flecha: veloz e driblador, ZERO defesa e fraco no físico
  { number: 19, name: "Raphinha", attrs: { pace: 88, acceleration: 86, dribbling: 85, finishing: 76, passing: 86, positioning: 69, strength: 50, tackling: 29 } },
  // joia crua: letal e veloz, mas verde de decisão/passe/sangue-frio
  { number: 9, name: "Endrick", attrs: { pace: 90, acceleration: 88, finishing: 86, dribbling: 80, strength: 68, positioning: 65, passing: 48, tackling: 22 } },
  // O DIFERENCIADO: pace/drible irreais — mas finaliza só "bem", não marca,
  // é fraco no físico e ainda decide mal sob pressão
  { number: 7, name: "Vini Jr.", attrs: { pace: 97, acceleration: 96, dribbling: 95, finishing: 72, positioning: 68, passing: 76, strength: 60, tackling: 21 } }
];
var ARGENTINA = [
  { number: 23, name: "Dibu", attrs: { goalkeeping: 90, positioning: 88, strength: 80, passing: 72, acceleration: 78 } },
  // lateral motor: pace e fôlego, limitado tecnicamente e na finalização
  { number: 26, name: "Molina", attrs: { pace: 84, acceleration: 82, tackling: 72, strength: 66, passing: 70, dribbling: 62, finishing: 36, positioning: 67 } },
  // zagueiro brigão: marcação e raça de elite, tosco com a bola
  { number: 13, name: "Cuti Romero", attrs: { tackling: 88, positioning: 78, strength: 87, pace: 72, dribbling: 50, passing: 58, finishing: 26 } },
  // veterano-bloco: MUITO lento, mas parede física e aérea, decisivo na raça
  { number: 19, name: "Otamendi", attrs: { tackling: 81, strength: 89, pace: 50, acceleration: 48, dribbling: 36, passing: 56, finishing: 22, positioning: 68 } },
  // lateral regular: sólido e equilibrado, sem grande ponto fora da curva
  { number: 3, name: "Tagliafico", attrs: { pace: 74, tackling: 78, strength: 70, passing: 70, dribbling: 56, finishing: 36 } },
  // motor incansável: pega, corre e briga 90', sem refino de finalização
  { number: 7, name: "De Paul", attrs: { strength: 78, passing: 79, dribbling: 78, tackling: 78, positioning: 78, pace: 72, finishing: 66 } },
  // volante-criador: passe e leitura excelentes, NÃO é rápido nem físico
  { number: 24, name: "Enzo", attrs: { passing: 86, strength: 62, finishing: 80, positioning: 77, pace: 60, acceleration: 58, tackling: 62, dribbling: 70 } },
  // meia inteligente: técnica e chute de fora, mediano fisicamente
  { number: 20, name: "Mac Allister", attrs: { passing: 85, finishing: 80, dribbling: 78, positioning: 77, pace: 62, tackling: 66, strength: 60 } },
  // bruxo veterano: pés mágicos, mas o físico FOI embora e não defende
  { number: 11, name: "Di Mar\xEDa", attrs: { dribbling: 88, passing: 89, finishing: 84, pace: 70, acceleration: 82, positioning: 80, strength: 46, tackling: 28 } },
  // 9 moderno e móvel: completo e trabalhador, fraco no alto e no corpo
  { number: 9, name: "J. \xC1lvarez", attrs: { finishing: 84, dribbling: 80, strength: 66, positioning: 84, pace: 80, acceleration: 82, passing: 72, tackling: 44 } },
  // O DIFERENCIADO: drible/passe/decisão sobrenaturais — porém físico mínimo
  // (frágil, devagar, sem fôlego) e não marca um lance
  { number: 10, name: "Messi", attrs: { dribbling: 99, passing: 98, finishing: 92, positioning: 92, pace: 70, acceleration: 86, strength: 45, firstTouch: 98, tackling: 21 } }
];
var WC_SPECS = { brasil: BRASIL, argentina: ARGENTINA };

// src/sim/formation.ts
var roleForSlot = (index, slot) => index === 0 ? "GK" : slot.x < 30 ? "DEF" : slot.x < 58 ? "MID" : "FWD";
var defaultFormation = () => FORMATION_433.map((s2) => ({ ...s2 }));

// src/game/log.ts
var pushLog = (log2, msg, max) => {
  log2.unshift(msg);
  if (log2.length > max) log2.pop();
};

// src/game/worldcup.ts
var ROWS = [
  ["brasil", "Brasil", "BRA", "#fde047", "#16a34a", 90, "#1d4ed8", "#f8fafc"],
  ["argentina", "Argentina", "ARG", "#7dd3fc", "#1e3a8a", 92, "#111827", "#f8fafc"],
  ["franca", "Fran\xE7a", "FRA", "#1e40af", "#f8fafc", 91, "#f8fafc", "#dc2626"],
  ["alemanha", "Alemanha", "ALE", "#f8fafc", "#111827", 93, "#111827", "#f8fafc"],
  ["espanha", "Espanha", "ESP", "#dc2626", "#fbbf24", 89, "#1e3a8a", "#1e3a8a"],
  ["inglaterra", "Inglaterra", "ING", "#f8fafc", "#1e3a8a", 85, "#1e3a8a", "#f8fafc"],
  ["portugal", "Portugal", "POR", "#b91c1c", "#16a34a", 88, "#16a34a", "#dc2626"],
  ["holanda", "Holanda", "HOL", "#f97316", "#1e3a8a", 82, "#f8fafc", "#f97316"],
  ["italia", "It\xE1lia", "ITA", "#38bdf8", "#111827", 86, "#f8fafc", "#38bdf8"],
  ["belgica", "B\xE9lgica", "BEL", "#111827", "#dc2626", 89, "#111827", "#111827"],
  ["uruguai", "Uruguai", "URU", "#60a5fa", "#111827", 85, "#111827", "#111827"],
  ["croacia", "Cro\xE1cia", "CRO", "#dc2626", "#f8fafc", 84, "#f8fafc", "#1e3a8a"],
  ["colombia", "Col\xF4mbia", "COL", "#fbbf24", "#1e3a8a", 86, "#1e3a8a", "#dc2626"],
  ["chile", "Chile", "CHI", "#dc2626", "#f8fafc", 87, "#111827", "#f8fafc"],
  ["mexico", "M\xE9xico", "MEX", "#16a34a", "#f8fafc", 82, "#f8fafc", "#f8fafc"],
  ["estados-unidos", "Estados Unidos", "EUA", "#1e3a8a", "#f8fafc", 77, "#f8fafc", "#dc2626"],
  ["canada", "Canad\xE1", "CAN", "#dc2626", "#f8fafc", 60, "#f8fafc", "#f8fafc"],
  ["japao", "Jap\xE3o", "JAP", "#1e3a8a", "#f8fafc", 72, "#f8fafc", "#f8fafc"],
  ["coreia-do-sul", "Coreia do Sul", "COR", "#f8fafc", "#dc2626", 71, "#dc2626", "#f8fafc"],
  ["marrocos", "Marrocos", "MAR", "#dc2626", "#16a34a", 72, "#16a34a", "#16a34a"],
  ["senegal", "Senegal", "SEN", "#16a34a", "#fbbf24", 75, "#f8fafc", "#16a34a"],
  ["nigeria", "Nig\xE9ria", "NIG", "#16a34a", "#f8fafc", 72, "#f8fafc", "#f8fafc"],
  ["gana", "Gana", "GAN", "#dc2626", "#fbbf24", 73, "#f8fafc", "#fbbf24"],
  ["suica", "Su\xED\xE7a", "SUI", "#dc2626", "#f8fafc", 81, "#f8fafc", "#f8fafc"],
  ["polonia", "Pol\xF4nia", "POL", "#f8fafc", "#dc2626", 81, "#dc2626", "#f8fafc"],
  ["australia", "Austr\xE1lia", "AUS", "#fbbf24", "#16a34a", 70, "#16a34a", "#16a34a"],
  ["ira", "Ir\xE3", "IRA", "#111827", "#dc2626", 71, "#f8fafc", "#dc2626"],
  ["arabia-saudita", "Ar\xE1bia Saudita", "KSA", "#16a34a", "#f8fafc", 64, "#f8fafc", "#f8fafc"],
  ["catar", "Catar", "QAT", "#7f1d3a", "#f8fafc", 58, "#f8fafc", "#7f1d3a"],
  ["tunisia", "Tun\xEDsia", "TUN", "#dc2626", "#f8fafc", 71, "#f8fafc", "#dc2626"],
  ["equador", "Equador", "EQU", "#fbbf24", "#111827", 76, "#1e3a8a", "#dc2626"],
  ["paraguai", "Paraguai", "PAR", "#dc2626", "#f8fafc", 73, "#111827", "#dc2626"],
  ["peru", "Peru", "PER", "#dc2626", "#f8fafc", 74, "#f8fafc", "#f8fafc"],
  ["venezuela", "Venezuela", "VEN", "#7f1d3a", "#111827", 66, "#111827", "#7f1d3a"],
  ["costa-rica", "Costa Rica", "CRC", "#dc2626", "#f8fafc", 76, "#111827", "#111827"],
  ["jamaica", "Jamaica", "JAM", "#111827", "#fbbf24", 65, "#fbbf24", "#16a34a"],
  ["panama", "Panam\xE1", "PAN", "#dc2626", "#1e3a8a", 64, "#1e3a8a", "#1e3a8a"],
  ["egito", "Egito", "EGI", "#dc2626", "#111827", 73, "#111827", "#f8fafc"],
  ["argelia", "Arg\xE9lia", "ARL", "#16a34a", "#f8fafc", 76, "#f8fafc", "#f8fafc"],
  ["camaroes", "Camar\xF5es", "CAM", "#16a34a", "#dc2626", 70, "#dc2626", "#fbbf24"],
  ["africa-do-sul", "\xC1frica do Sul", "RSA", "#fbbf24", "#16a34a", 63, "#16a34a", "#fbbf24"],
  ["nova-zelandia", "Nova Zel\xE2ndia", "NZL", "#111827", "#f8fafc", 59, "#f8fafc", "#111827"],
  ["suecia", "Su\xE9cia", "SUE", "#fde047", "#1e3a8a", 78, "#1e3a8a", "#fde047"],
  ["dinamarca", "Dinamarca", "DIN", "#dc2626", "#f8fafc", 77, "#f8fafc", "#f8fafc"],
  ["ucrania", "Ucr\xE2nia", "UCR", "#fde047", "#1e3a8a", 78, "#1e3a8a", "#1e3a8a"],
  ["turquia", "Turquia", "TUR", "#dc2626", "#f8fafc", 79, "#f8fafc", "#f8fafc"],
  ["servia", "S\xE9rvia", "SER", "#dc2626", "#111827", 74, "#111827", "#111827"]
];
var WC_TEAM_LIST = ROWS.map(
  ([id, name, short, shirt, text, strength, shorts, socks]) => ({
    id,
    name,
    short,
    shirt,
    text,
    strength,
    shorts,
    socks,
    flag: `/flags/wc/${id}.svg`
  })
);
var ALL_CLUBS = Object.fromEntries(
  WC_TEAM_LIST.map((t) => [t.id, t])
);

// src/game/names.ts
var FIRST = [
  "Lucas",
  "Gabriel",
  "Matheus",
  "Rafael",
  "Bruno",
  "Felipe",
  "Pedro",
  "Jo\xE3o",
  "Gustavo",
  "Vin\xEDcius",
  "Thiago",
  "Diego",
  "Rodrigo",
  "Carlos",
  "Eduardo",
  "Ricardo",
  "Fernando",
  "Andr\xE9",
  "Marcelo",
  "Leonardo",
  "Daniel",
  "Caio",
  "Igor",
  "Wesley",
  "Douglas",
  "Renato",
  "Alan",
  "Vitor",
  "Henrique",
  "J\xFAnior",
  "Wellington",
  "Anderson",
  "Robson",
  "Everton",
  "Jonas",
  "Murilo",
  "Kaique",
  "Yuri",
  "Ot\xE1vio",
  "Maicon",
  "Cl\xE9ber",
  "\xC9merson",
  "F\xE1bio",
  "Sandro",
  "T\xE9o"
];
var LAST = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Pereira",
  "Lima",
  "Ferreira",
  "Costa",
  "Rodrigues",
  "Almeida",
  "Nascimento",
  "Carvalho",
  "Ara\xFAjo",
  "Ribeiro",
  "Gomes",
  "Martins",
  "Rocha",
  "Barbosa",
  "Alves",
  "Cardoso",
  "Teixeira",
  "Moreira",
  "Correia",
  "Mendes",
  "Nunes",
  "Cavalcanti",
  "Dias",
  "Castro",
  "Campos",
  "Freitas",
  "Pinto",
  "Moraes",
  "Vieira",
  "Monteiro",
  "Cunha"
];
var makeName = (i, j) => `${FIRST[i % FIRST.length]} ${LAST[j % LAST.length]}`;
var FIRST_COUNT = FIRST.length;
var LAST_COUNT = LAST.length;

// src/sim/ratings.ts
var nrm = (v) => v / 100;
var gkRating = (a) => {
  const r = nrm(a.goalkeeping) * 0.62 + nrm(a.positioning) * 0.2 + nrm(a.strength) * 0.1 + nrm(a.acceleration) * 0.08;
  return Math.round(r * 100);
};

// src/game/overall.ts
var WEIGHTS = {
  DEF: { tackling: 0.36, positioning: 0.24, strength: 0.2, pace: 0.1, passing: 0.1 },
  MID: { passing: 0.3, positioning: 0.2, tackling: 0.16, dribbling: 0.18, strength: 0.16 },
  FWD: { finishing: 0.38, pace: 0.2, dribbling: 0.2, positioning: 0.14, firstTouch: 0.08 }
};
var overallOf = (role, attrs) => {
  if (role === "GK") return gkRating(attrs);
  const w = WEIGHTS[role];
  let sum = 0;
  let total = 0;
  for (const k in w) {
    const weight = w[k];
    sum += nrm(attrs[k]) * weight;
    total += weight;
  }
  return Math.round(sum / total * 100);
};
var slotOverallOf = (index, slot, attrs) => overallOf(roleForSlot(index, slot), attrs);

// src/game/generate.ts
var rngChaosSource = (rng) => ({
  jitter: () => rng.next() * 2 - 1,
  pickN: (keys, _purpose, n) => {
    const pool = [...keys];
    const out = /* @__PURE__ */ new Set();
    for (let i = 0; i < n && pool.length > 0; i++) {
      out.add(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    }
    return out;
  }
});
var valueOf = (overall, age) => {
  const base = Math.pow(Math.max(0, overall - 40) / 10, 2.4) * 12e4;
  const ageMul = age <= 24 ? 1.15 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
  return Math.round(base * ageMul / 1e4) * 1e4;
};
var scaledAttrs = (role, target, rng, signature) => {
  const a = { ...baseAttrs(role), ...signature };
  const baseOverall = overallOf(role, a);
  const delta = target - baseOverall + rng.gauss() * 3;
  for (const k in a) {
    const key = k;
    a[key] = Math.max(ATTR_FLOOR, Math.min(99, Math.round(a[key] + delta + rng.gauss() * 3)));
  }
  return a;
};
var nextId = 1;
var freshId = () => nextId++;
var generatePlayer = (role, target, number, rng, chaos, name, signature) => {
  const scaled = scaledAttrs(role, target, rng, signature);
  const attrs = chaos ? applyChaos(scaled, role, chaos, rngChaosSource(rng)) : scaled;
  if (name) {
    const drift = target + rng.gauss() * 2 - overallOf(role, attrs);
    for (const k in attrs) {
      const key = k;
      attrs[key] = Math.max(ATTR_FLOOR, Math.min(99, Math.round(attrs[key] + drift)));
    }
  }
  const overall = overallOf(role, attrs);
  const age = rng.int(17, 34);
  return {
    id: freshId(),
    name: name ?? makeName(rng.int(0, FIRST_COUNT - 1), rng.int(0, LAST_COUNT - 1)),
    number,
    role,
    age,
    attrs,
    overall,
    value: valueOf(overall, age)
  };
};
var generateSquadShaped = (shape, level, chaos, rng, roster) => {
  const used = new Set(roster?.flatMap((p) => p.number != null ? [p.number] : []) ?? []);
  const pickNumber = () => {
    let n = rng.int(1, 39);
    while (used.has(n)) n = rng.int(1, 39);
    used.add(n);
    return n;
  };
  const meanDelta = roster ? roster.reduce((s2, p) => s2 + p.delta, 0) / roster.length : 0;
  return shape.map((role, i) => {
    const real = roster?.[i];
    const target = level + (real ? real.delta - meanDelta : rng.gauss() * 5);
    return generatePlayer(role, target, real?.number ?? pickNumber(), rng, chaos, real?.name, real?.attrs);
  });
};

// src/game/worldcupPlayers.ts
var WC_ROSTERS = {
  brasil: [
    ["Alisson", 5],
    ["Danilo", -6],
    ["Marquinhos", 4],
    ["Gabriel M.", 1],
    ["Wendell", -6],
    ["Casemiro", -2],
    ["Bruno G.", 3],
    ["Paquet\xE1", 1],
    ["Raphinha", 7],
    ["Endrick", -1],
    ["Vini Jr.", 14]
  ],
  argentina: [
    ["Dibu Mart\xEDnez", 6],
    ["Molina", -3],
    ["Cuti Romero", 5],
    ["Otamendi", -4],
    ["Tagliafico", -3],
    ["De Paul", 3],
    ["Enzo Fern\xE1ndez", 5],
    ["Mac Allister", 5],
    ["Di Mar\xEDa", 4],
    ["J. \xC1lvarez", 7],
    ["Messi", 14]
  ],
  franca: [
    ["Mike Maignan", 6],
    ["Jules Kound\xE9", 2],
    ["William Saliba", 6],
    ["Dayot Upamecano", 2],
    ["Theo Hern\xE1ndez", 4],
    ["Tchouam\xE9ni", 3],
    ["Rabiot", 0],
    ["Griezmann", 5],
    ["Mbapp\xE9", 14],
    ["Demb\xE9l\xE9", 8],
    ["Marcus Thuram", 4]
  ],
  alemanha: [
    ["Manuel Neuer", 4],
    ["Kimmich", 7],
    ["R\xFCdiger", 6],
    ["Jonathan Tah", 2],
    ["David Raum", 0],
    ["Florian Wirtz", 10],
    ["G\xFCndogan", 3],
    ["Musiala", 10],
    ["Havertz", 4],
    ["San\xE9", 3],
    ["Gnabry", 1]
  ],
  espanha: [
    ["Unai Sim\xF3n", 2],
    ["Carvajal", 3],
    ["Le Normand", 1],
    ["Cubars\xED", 4],
    ["Cucurella", 2],
    ["Rodri", 10],
    ["Pedri", 7],
    ["Fabi\xE1n Ruiz", 2],
    ["Lamine Yamal", 13],
    ["Nico Williams", 6],
    ["Morata", 0]
  ],
  inglaterra: [
    ["Jordan Pickford", 2],
    ["Kyle Walker", -2],
    ["John Stones", 3],
    ["Marc Gu\xE9hi", 1],
    ["Luke Shaw", 0],
    ["Declan Rice", 6],
    ["Bellingham", 11],
    ["Trent Alexander-Arnold", 5],
    ["Harry Kane", 10],
    ["Bukayo Saka", 8],
    ["Phil Foden", 6]
  ],
  portugal: [
    ["Diogo Costa", 4],
    ["Cancelo", 3],
    ["R\xFAben Dias", 7],
    ["Gon\xE7alo In\xE1cio", 1],
    ["Nuno Mendes", 5],
    ["Bruno Fernandes", 7],
    ["Vitinha", 6],
    ["Bernardo Silva", 7],
    ["Rafael Le\xE3o", 8],
    ["Gon\xE7alo Ramos", 2],
    ["Jo\xE3o F\xE9lix", 0]
  ],
  holanda: [
    ["Bart Verbruggen", 1],
    ["Dumfries", 4],
    ["Van Dijk", 10],
    ["Jurri\xEBn Timber", 3],
    ["Nathan Ak\xE9", 2],
    ["Frenkie de Jong", 6],
    ["Xavi Simons", 4],
    ["Reijnders", 5],
    ["Gakpo", 6],
    ["Memphis Depay", 3],
    ["Bergwijn", -2]
  ],
  italia: [
    ["Donnarumma", 8],
    ["Bastoni", 6],
    ["Calafiori", 4],
    ["Di Lorenzo", 1],
    ["Dimarco", 4],
    ["Barella", 7],
    ["Tonali", 6],
    ["Frattesi", 2],
    ["Moise Kean", 3],
    ["Retegui", 3],
    ["Chiesa", 2]
  ],
  belgica: [
    ["Koen Casteels", 1],
    ["Theate", 0],
    ["Faes", -2],
    ["Zeno Debast", -1],
    ["Castagne", 0],
    ["Onana", 4],
    ["Tielemans", 3],
    ["De Bruyne", 11],
    ["Lukaku", 6],
    ["Doku", 6],
    ["Trossard", 3]
  ],
  uruguai: [
    ["Sergio Rochet", 1],
    ["Gim\xE9nez", 3],
    ["Ara\xFAjo", 7],
    ["Olivera", 1],
    ["Vi\xF1a", -1],
    ["Valverde", 11],
    ["Ugarte", 4],
    ["Bentancur", 3],
    ["Darwin N\xFA\xF1ez", 6],
    ["Pellistri", 0],
    ["Cristian Olivera", -1]
  ],
  croacia: [
    ["Livakovi\u0107", 3],
    ["Stani\u0161i\u0107", 1],
    ["Gvardiol", 8],
    ["\u0160utalo", 1],
    ["Borna Sosa", 0],
    ["Modri\u0107", 9],
    ["Kova\u010Di\u0107", 4],
    ["Baturina", 1],
    ["Peri\u0161i\u0107", 2],
    ["Petkovi\u0107", 0],
    ["Kramari\u0107", 3]
  ],
  colombia: [
    ["Camilo Vargas", 1],
    ["Mu\xF1oz", 4],
    ["Davinson S\xE1nchez", 2],
    ["Lucum\xED", 2],
    ["Mojica", -1],
    ["Lerma", 2],
    ["Kevin Casta\xF1o", 0],
    ["James Rodr\xEDguez", 7],
    ["Luis D\xEDaz", 10],
    ["Jhon C\xF3rdoba", 2],
    ["Borr\xE9", 0]
  ],
  chile: [
    ["Gabriel Arias", 1],
    ["Isla", -3],
    ["Marip\xE1n", 2],
    ["Paulo D\xEDaz", 2],
    ["Suazo", 2],
    ["Erick Pulgar", 1],
    ["Marcelino N\xFA\xF1ez", 2],
    ["Vicente Pizarro", 0],
    ["Alexis S\xE1nchez", 5],
    ["Brereton D\xEDaz", 1],
    ["Eduardo Vargas", -2]
  ],
  mexico: [
    ["Luis Malag\xF3n", 2],
    ["Jes\xFAs Gallardo", 0],
    ["C\xE9sar Montes", 2],
    ["Johan V\xE1squez", 2],
    ["Jorge S\xE1nchez", -2],
    ["Edson \xC1lvarez", 6],
    ["Luis Ch\xE1vez", 1],
    ["Orbel\xEDn Pineda", 0],
    ["Santiago Gim\xE9nez", 5],
    ["Hirving Lozano", 4],
    ["Alexis Vega", 0]
  ],
  "estados-unidos": [
    ["Matt Turner", 0],
    ["Sergi\xF1o Dest", 2],
    ["Chris Richards", 1],
    ["Miles Robinson", 1],
    ["Antonee Robinson", 3],
    ["Weston McKennie", 3],
    ["Tyler Adams", 3],
    ["Yunus Musah", 1],
    ["Christian Pulisic", 9],
    ["Folarin Balogun", 2],
    ["Ricardo Pepi", 2]
  ],
  canada: [
    ["Maxime Cr\xE9peau", 0],
    ["Alistair Johnston", 2],
    ["Kamal Miller", 0],
    ["Mo\xEFse Bombito", 1],
    ["Sam Adekugbe", -1],
    ["Stephen Eust\xE1quio", 2],
    ["Isma\xEBl Kon\xE9", 2],
    ["Mark-Anthony Kaye", -1],
    ["Jonathan David", 9],
    ["Cyle Larin", 2],
    ["Tajon Buchanan", 3]
  ],
  japao: [
    ["Zion Suzuki", 1],
    ["Hiroki Ito", 2],
    ["Ko Itakura", 2],
    ["Tomiyasu", 4],
    ["Sugawara", 1],
    ["Wataru Endo", 3],
    ["Hidemasa Morita", 2],
    ["Ao Tanaka", 1],
    ["Kaoru Mitoma", 8],
    ["Minamino", 3],
    ["Ayase Ueda", 2]
  ],
  "coreia-do-sul": [
    ["Jo Hyeon-woo", 0],
    ["Kim Min-jae", 8],
    ["Kim Young-gwon", 0],
    ["Kim Tae-hwan", -2],
    ["Seol Young-woo", 0],
    ["Hwang In-beom", 3],
    ["Paik Seung-ho", 0],
    ["Lee Kang-in", 6],
    ["Son Heung-min", 11],
    ["Cho Gue-sung", 1],
    ["Oh Hyeon-gyu", 0]
  ],
  marrocos: [
    ["Bounou", 5],
    ["Achraf Hakimi", 10],
    ["Sa\xEFss", 0],
    ["Aguerd", 3],
    ["Mazraoui", 4],
    ["Amrabat", 3],
    ["Ounahi", 2],
    ["Amallah", 0],
    ["Ziyech", 4],
    ["En-Nesyri", 2],
    ["Brahim D\xEDaz", 5]
  ],
  senegal: [
    ["\xC9douard Mendy", 4],
    ["Koulibaly", 6],
    ["Abdou Diallo", 1],
    ["Sabaly", 0],
    ["Ballo-Tour\xE9", -2],
    ["Idrissa Gueye", 3],
    ["Pape Matar Sarr", 4],
    ["Nampalys Mendy", 0],
    ["Sadio Man\xE9", 10],
    ["Isma\xEFla Sarr", 4],
    ["Boulaye Dia", 2]
  ],
  nigeria: [
    ["Stanley Nwabali", 1],
    ["Ola Aina", 2],
    ["Troost-Ekong", 2],
    ["Calvin Bassey", 2],
    ["Zaidu Sanusi", -1],
    ["Frank Onyeka", 0],
    ["Alex Iwobi", 3],
    ["Onyedika", 1],
    ["Victor Osimhen", 10],
    ["Lookman", 8],
    ["Iheanacho", 1]
  ],
  gana: [
    ["Ati-Zigi", 0],
    ["Djiku", 1],
    ["Salisu", 1],
    ["Gideon Mensah", -1],
    ["Tariq Lamptey", 2],
    ["Thomas Partey", 6],
    ["Mohammed Kudus", 9],
    ["Iddrisu Baba", -1],
    ["Jordan Ayew", 1],
    ["Semenyo", 5],
    ["Osman Bukari", 0]
  ],
  suica: [
    ["Yann Sommer", 6],
    ["Ricardo Rodr\xEDguez", 0],
    ["Akanji", 7],
    ["Elvedi", 2],
    ["Widmer", 0],
    ["Xhaka", 8],
    ["Freuler", 3],
    ["Shaqiri", 3],
    ["Embolo", 3],
    ["Ndoye", 3],
    ["Amdouni", 1]
  ],
  polonia: [
    ["Szcz\u0119sny", 6],
    ["Bednarek", 1],
    ["Kiwior", 2],
    ["Bereszy\u0144ski", -2],
    ["Zalewski", 1],
    ["Zieli\u0144ski", 5],
    ["Szyma\u0144ski", 2],
    ["Frankowski", 0],
    ["Lewandowski", 12],
    ["\u015Awiderski", 0],
    ["Urba\u0144ski", -1]
  ],
  australia: [
    ["Mathew Ryan", 2],
    ["Degenek", 0],
    ["Harry Souttar", 3],
    ["Kye Rowles", 0],
    ["Behich", 0],
    ["Aaron Mooy", 3],
    ["Jackson Irvine", 3],
    ["McGree", 2],
    ["Mitchell Duke", 0],
    ["Goodwin", 0],
    ["Maclaren", 1]
  ],
  equador: [
    ["Hern\xE1n Gal\xEDndez", 0],
    ["Estupi\xF1\xE1n", 4],
    ["Hincapi\xE9", 6],
    ["F\xE9lix Torres", 1],
    ["Preciado", 0],
    ["Caicedo", 10],
    ["Jhegson M\xE9ndez", 0],
    ["Alan Franco", 1],
    ["Enner Valencia", 4],
    ["Kevin Rodr\xEDguez", 0],
    ["Gonzalo Plata", 3]
  ],
  paraguai: [
    ["Carlos Coronel", 2],
    ["Esp\xEDnola", 0],
    ["Alderete", 2],
    ["Gustavo G\xF3mez", 4],
    ["Balbuena", 1],
    ["Villasanti", 3],
    ["\xC1ngel Cardozo", 0],
    ["Diego G\xF3mez", 4],
    ["Almir\xF3n", 5],
    ["Sanabria", 2],
    ["Enciso", 4]
  ],
  peru: [
    ["Pedro Gallese", 4],
    ["Adv\xEDncula", 3],
    ["Zambrano", 0],
    ["Santamar\xEDa", -1],
    ["Marcos L\xF3pez", 1],
    ["Renato Tapia", 3],
    ["Christian Cueva", 1],
    ["Carrillo", 2],
    ["Lapadula", 3],
    ["Edison Flores", 1],
    ["Alex Valera", 0]
  ],
  turquia: [
    ["U\u011Furcan \xC7ak\u0131r", 3],
    ["Zeki \xC7elik", 1],
    ["Merih Demiral", 3],
    ["Bardakc\u0131", 2],
    ["Ferdi Kad\u0131o\u011Flu", 4],
    ["Hakan \xC7alhano\u011Flu", 9],
    ["\u0130smail Y\xFCksek", 1],
    ["Arda G\xFCler", 8],
    ["Kenan Y\u0131ld\u0131z", 6],
    ["Cengiz \xDCnder", 2],
    ["Bar\u0131\u015F Alper", 3]
  ]
};
var wcRoster = (clubId2) => WC_ROSTERS[clubId2]?.map(([name, delta], i) => ({
  name,
  delta,
  attrs: WC_SPECS[clubId2]?.[i].attrs,
  number: WC_SPECS[clubId2]?.[i].number
}));

// src/game/ascension.ts
var ASCENSION_MAX = 10;
var clampAscension = (a) => Math.max(0, Math.min(ASCENSION_MAX, Math.floor(a)));
var opponentLevelBonus = (ascension) => ascension;

// src/game/runGen.ts
var STAGE_COUNT = 6;
var MAP_WIDTH = 5;
var MAP_PATHS = 6;
var BOSS_ID = "boss";
var cellId = (stage, col) => `s${stage}-c${col}`;
var clampCol = (c) => Math.max(0, Math.min(MAP_WIDTH - 1, c));
var STAGE_LEVEL = { 1: 37, 2: 41, 3: 45, 4: 49, 5: 53, 6: 57, 7: 66 };
var START_LEVEL = 50;
var chaosFor = (stage) => ({
  spread: 1.2 + stage * 0.06,
  jitter: 9 + stage,
  spikes: 1 + Math.floor(stage / 3),
  spikeBoost: 14 + stage * 2,
  tanks: Math.max(1, 3 - Math.floor(stage / 3)),
  tankDrop: 22 - stage,
  ceil: 99
});
var REWARD_CHAOS = {
  spread: 2.4,
  jitter: 28,
  spikes: 3,
  spikeBoost: 36,
  tanks: 4,
  tankDrop: 42,
  ceil: 99
};
var START_SHAPE = ROLES_433;
var generateStartSquad = (rng, clubId2) => generateSquadShaped(START_SHAPE, START_LEVEL, chaosFor(1), rng, wcRoster(clubId2));
var BLESS_STAR_LEVEL = 72;
var BLESS_WONDERKID_LEVEL = 62;
var withAge = (p, age) => {
  p.age = age;
  p.value = valueOf(p.overall, age);
  return p;
};
var generateStarPlayer = (rng) => withAge(
  generatePlayer(rng.pick(["DEF", "MID", "FWD", "FWD"]), BLESS_STAR_LEVEL + rng.range(-3, 3), rng.int(1, 39), rng),
  rng.int(24, 28)
);
var generateWonderkid = (rng) => withAge(
  generatePlayer(rng.pick(["DEF", "MID", "FWD"]), BLESS_WONDERKID_LEVEL, rng.int(1, 39), rng, REWARD_CHAOS),
  17
);
var BAND_SIZE = 9;
var pickClubId = (rng, exclude, stage) => {
  const sorted = Object.values(ALL_CLUBS).sort((a, b) => a.strength - b.strength);
  const size = stage > STAGE_COUNT ? 5 : BAND_SIZE;
  const frac = Math.min(1, (stage - 1) / STAGE_COUNT);
  const center = Math.round(frac * (sorted.length - 1));
  const lo = Math.max(0, Math.min(center - Math.floor(size / 2), sorted.length - size));
  const band = sorted.slice(lo, lo + size).filter((t) => !exclude.has(t.id));
  const pool = band.length > 0 ? band : sorted.filter((t) => !exclude.has(t.id));
  const id = rng.pick(pool.length > 0 ? pool : sorted).id;
  exclude.add(id);
  return id;
};
var generateOpponent = (stage, rng, exclude, ascension) => {
  const clubId2 = pickClubId(rng, exclude, stage);
  const level = STAGE_LEVEL[stage] + opponentLevelBonus(ascension) + rng.range(-4, 4);
  const squad = generateSquadShaped(ROLES_433, level, chaosFor(stage), rng, wcRoster(clubId2));
  return { clubId: clubId2, squad };
};
var KIND_WEIGHTS = {
  2: { match: 70, gym: 30 },
  3: { match: 55, gym: 20, market: 25 },
  4: { match: 54, gym: 22, market: 24 },
  5: { match: 52, gym: 26, market: 22 },
  6: { match: 38, gym: 50, market: 12 }
};
var pickKind = (stage, parentKinds, rng) => {
  if (stage <= 1) return "match";
  const weights = KIND_WEIGHTS[stage] ?? { match: 60, gym: 25, market: 15 };
  const blocked = new Set(parentKinds.filter((k) => k === "market" || k === "gym"));
  const pool = Object.entries(weights).filter(([k]) => !blocked.has(k));
  const total = pool.reduce((s2, [, n]) => s2 + n, 0);
  let r = rng.next() * total;
  for (const [k, n] of pool) if ((r -= n) < 0) return k;
  return "match";
};
var buildGraph = (rng) => {
  const edges = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set();
  const crossed = Array.from({ length: STAGE_COUNT + 1 }, () => /* @__PURE__ */ new Set());
  const addEdge = (from, to) => {
    if (!edges.has(from)) edges.set(from, /* @__PURE__ */ new Set());
    edges.get(from).add(to);
  };
  const spread = [0, Math.floor((MAP_WIDTH - 1) / 2), MAP_WIDTH - 1];
  const starts = Array.from({ length: MAP_PATHS }, (_, i) => spread[i % spread.length]);
  for (const start of starts) {
    let col = clampCol(start);
    used.add(cellId(1, col));
    for (let stage = 1; stage < STAGE_COUNT; stage++) {
      const options = [...new Set([col - 1, col, col + 1].map(clampCol))].filter(
        (nx2) => nx2 === col || !crossed[stage].has(`${nx2}->${col}`)
      );
      const nx = rng.pick(options);
      crossed[stage].add(`${col}->${nx}`);
      addEdge(cellId(stage, col), cellId(stage + 1, nx));
      used.add(cellId(stage + 1, nx));
      col = nx;
    }
    addEdge(cellId(STAGE_COUNT, col), BOSS_ID);
  }
  return { edges, used };
};
var ensureKind = (nodes, kind, minStage, rng) => {
  if (nodes.some((n) => n.kind === kind)) return;
  const cands = nodes.filter((n) => n.kind === "match" && n.stage >= minStage && n.stage <= STAGE_COUNT);
  if (cands.length === 0) return;
  const target = rng.pick(cands);
  target.kind = kind;
  target.opponent = void 0;
};
var generateMap = (rng, playerClubId, ascension) => {
  const { edges, used } = buildGraph(rng);
  const cells = [...used].map((id) => {
    const [, s2, c] = /^s(\d+)-c(\d+)$/.exec(id);
    return { id, stage: Number(s2), col: Number(c) };
  }).sort((a, b) => a.stage - b.stage || a.col - b.col);
  const parents = /* @__PURE__ */ new Map();
  for (const [from, tos] of edges)
    for (const to of tos) (parents.get(to) ?? parents.set(to, []).get(to)).push(from);
  const usedClubs = /* @__PURE__ */ new Set([playerClubId]);
  const kindOf = /* @__PURE__ */ new Map();
  const nodes = [];
  for (const cell of cells) {
    const parentKinds = (parents.get(cell.id) ?? []).map((p) => kindOf.get(p));
    const kind = pickKind(cell.stage, parentKinds, rng);
    kindOf.set(cell.id, kind);
    nodes.push({
      id: cell.id,
      stage: cell.stage,
      lane: cell.col,
      kind,
      next: [...edges.get(cell.id) ?? []],
      opponent: kind === "match" ? generateOpponent(cell.stage, rng, usedClubs, ascension) : void 0,
      cleared: false
    });
  }
  ensureKind(nodes, "market", 3, rng);
  ensureKind(nodes, "gym", 2, rng);
  nodes.push({
    id: BOSS_ID,
    stage: STAGE_COUNT + 1,
    lane: Math.floor((MAP_WIDTH - 1) / 2),
    kind: "boss",
    next: [],
    opponent: generateOpponent(STAGE_COUNT + 1, rng, usedClubs, ascension),
    cleared: false
  });
  return nodes;
};

// src/sim/rng.ts
var seedRng = (seed) => seed >>> 0;
var rand = (s2) => {
  s2.rngState = s2.rngState + 1831565813 >>> 0;
  let t = s2.rngState;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// src/game/random.ts
var makeRng = (seed) => {
  const s2 = { rngState: seedRng(seed) };
  const next = () => rand(s2);
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    gauss: () => (next() + next() + next() + next() - 2) / 2
  };
};
var mixSeed = (a, b) => (a * 73856093 ^ b * 19349663) >>> 0;

// src/game/run.ts
var RUN_VERSION = 6;
var START_COINS = 100;
var START_LIVES = 2;
var POTIONS_MAX = 3;
var POTION_KINDS = ["strength", "pace"];
var POTION_INFO = {
  strength: { label: "Po\xE7\xE3o de For\xE7a", emoji: "\u{1F4AA}" },
  pace: { label: "Po\xE7\xE3o de Velocidade", emoji: "\u26A1" }
};
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
var log = (state, msg) => pushLog(state.log, msg, 30);
var nodeOf = (state, id) => state.nodes.find((n) => n.id === id);
var refreshSquadRatings = (state) => {
  state.squad.forEach((p, i) => {
    p.overall = slotOverallOf(i, state.formationSlots[i], p.attrs);
    p.value = valueOf(p.overall, p.age);
  });
};
var newRun = (managerName, clubId2, seed, ascension = 0) => {
  ascension = clampAscension(ascension);
  const rng = makeRng(seed);
  const squad = generateStartSquad(rng, clubId2);
  const nodes = generateMap(rng, clubId2, ascension);
  const state = {
    version: RUN_VERSION,
    seed,
    managerName,
    clubId: clubId2,
    ascension,
    squad,
    // gerado na ordem dos slots do 4-3-3 (índice = slot, 0 = gol)
    formationSlots: defaultFormation(),
    coins: START_COINS,
    lives: START_LIVES,
    stage: 0,
    nodes,
    availableNodeIds: nodes.filter((n) => n.stage === 1).map((n) => n.id),
    currentNodeId: null,
    pendingReward: null,
    potions: [],
    activePotions: [],
    pendingPotion: null,
    pendingBlessings: rollBlessings(rng),
    lastMatch: null,
    status: "blessing",
    log: [
      `${managerName} assume o ${ALL_CLUBS[clubId2]?.name ?? clubId2} para a jornada.${ascension > 0 ? ` \u{1F525} Ascension ${ascension}.` : ""}`
    ]
  };
  refreshSquadRatings(state);
  return state;
};
var rngForNode = (state, nodeId) => makeRng(mixSeed(state.seed, [...nodeId].reduce((s2, c) => s2 + c.charCodeAt(0), 0)));
var enterNode = (state, nodeId) => {
  if (state.status !== "map") return;
  if (!state.availableNodeIds.includes(nodeId)) return;
  const node = nodeOf(state, nodeId);
  if (!node || node.cleared) return;
  state.currentNodeId = nodeId;
  state.status = node.kind === "market" ? "market" : node.kind === "gym" ? "gym" : "prematch";
};
var BLESS_COINS = 150;
var BLESS_PACT_COINS = 300;
var BLESS_CAPTAIN_BOOST = 10;
var BLESSING_INFO = {
  sponsor: {
    emoji: "\u{1F4B0}",
    label: "Patroc\xEDnio Master",
    desc: `Ganhe ${BLESS_COINS} moedas para gastar no mercado.`,
    tone: "safe"
  },
  potionkit: {
    emoji: "\u{1F9EA}",
    label: "Kit do Preparador",
    desc: `Comece com o invent\xE1rio cheio: ${POTIONS_MAX} po\xE7\xF5es sortidas.`,
    tone: "safe"
  },
  extralife: {
    emoji: "\u2764\uFE0F",
    label: "Torcida Apaixonada",
    desc: "Ganhe 1 vida extra para a jornada inteira.",
    tone: "safe"
  },
  star: {
    emoji: "\u{1F31F}",
    label: "O Craque",
    desc: "Um craque de outro n\xEDvel chega \u2014 voc\xEA escolhe quem sai do time.",
    tone: "power"
  },
  captain: {
    emoji: "\u{1F396}\uFE0F",
    label: "Bra\xE7adeira de Capit\xE3o",
    desc: `Seu melhor jogador ganha +${BLESS_CAPTAIN_BOOST} em TODOS os atributos.`,
    tone: "power"
  },
  wonderkid: {
    emoji: "\u{1F48E}",
    label: "Joia da Base",
    desc: "Uma promessa de 17 anos, ca\xF3tica e imprevis\xEDvel, quer uma vaga no time.",
    tone: "power"
  },
  pact: {
    emoji: "\u{1F608}",
    label: "Pacto com o Agente",
    desc: `Ganhe ${BLESS_PACT_COINS} moedas\u2026 mas PERDE 1 vida.`,
    tone: "cursed"
  }
};
var blessingsOf = (tone) => Object.keys(BLESSING_INFO).filter((k) => BLESSING_INFO[k].tone === tone);
var rollBlessings = (rng) => ["safe", "power", "cursed"].map((tone) => rng.pick(blessingsOf(tone)));
var applyBlessing = (state, kind, rng) => {
  switch (kind) {
    case "sponsor":
      state.coins += BLESS_COINS;
      log(state, `\u{1F4B0} Patroc\xEDnio Master: +${BLESS_COINS} moedas.`);
      break;
    case "potionkit":
      while (state.potions.length < POTIONS_MAX) state.potions.push(rng.pick(POTION_KINDS));
      log(state, `\u{1F9EA} Kit do Preparador: invent\xE1rio cheio (${POTIONS_MAX} po\xE7\xF5es).`);
      break;
    case "extralife":
      state.lives += 1;
      log(state, `\u2764\uFE0F Torcida Apaixonada: +1 vida (agora ${state.lives}).`);
      break;
    case "star": {
      const p = generateStarPlayer(rng);
      state.pendingReward = [p];
      log(state, `\u{1F31F} ${p.name} chega como o craque \u2014 escolha o lugar dele no time.`);
      break;
    }
    case "captain": {
      const captain = [...state.squad].sort((a, b) => b.overall - a.overall)[0];
      for (const k of Object.keys(captain.attrs))
        captain.attrs[k] = clamp(captain.attrs[k] + BLESS_CAPTAIN_BOOST, 1, 100);
      refreshSquadRatings(state);
      log(state, `\u{1F396}\uFE0F ${captain.name} vestiu a bra\xE7adeira: agora ${captain.overall} OVR.`);
      break;
    }
    case "wonderkid": {
      const p = generateWonderkid(rng);
      state.pendingReward = [p];
      log(state, `\u{1F48E} ${p.name}, ${p.age} anos, sobe da base \u2014 escolha o lugar dele no time.`);
      break;
    }
    case "pact":
      state.coins += BLESS_PACT_COINS;
      state.lives -= 1;
      log(state, `\u{1F608} Pacto com o Agente: +${BLESS_PACT_COINS} moedas, mas -1 vida (resta ${state.lives}).`);
      break;
  }
};
var pickBlessing = (state, index) => {
  if (state.status !== "blessing" || !state.pendingBlessings) return;
  const kind = state.pendingBlessings[index];
  if (!kind) return;
  const info = BLESSING_INFO[kind];
  log(state, `${info.emoji} B\xEAn\xE7\xE3o da largada: ${info.label}.`);
  applyBlessing(state, kind, rngForNode(state, "blessing:" + kind));
  state.pendingBlessings = null;
  state.status = state.pendingReward ? "reward" : "map";
};
var closeReward = (state) => {
  if (state.pendingPotion) {
    log(state, `${POTION_INFO[state.pendingPotion].emoji} A ${POTION_INFO[state.pendingPotion].label} ficou para tr\xE1s\u2026`);
  }
  state.pendingReward = null;
  state.pendingPotion = null;
  state.status = "map";
};
var skipReward = (state) => {
  if (state.status !== "reward") return;
  closeReward(state);
};

// tools/.scratch-shots/gen-boss-prematch.entry.ts
var clubId = Object.keys(ALL_CLUBS)[0];
var s = newRun("SHOT", clubId, 4242);
pickBlessing(s, 1);
if (s.status === "reward") skipReward(s);
var boss = s.nodes.find((n) => n.kind === "boss");
if (boss) {
  s.availableNodeIds = [boss.id];
  enterNode(s, boss.id);
}
writeFileSync("tools/.scratch-shots/states/boss-prematch.json", JSON.stringify(s));
console.log("wrote boss-prematch.json, status=", s.status);
