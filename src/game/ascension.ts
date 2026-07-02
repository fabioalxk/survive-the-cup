/**
 * Ascension — níveis de dificuldade do modo roguelike (0 a 10, como no Slay
 * the Spire). Fonte única de TODAS as regras de escala: quem precisa saber o
 * quanto a dificuldade muda importa daqui, nunca recalcula por conta própria.
 *
 * O aperto vem de três lados, todos proporcionais ao nível:
 *  • adversários com elencos melhores;
 *  • jogadores oferecidos (cartas de recompensa e mercado) piores;
 *  • menos melhoramentos por visita à academia (a partir da ascension 3).
 */
export const ASCENSION_MAX = 10

export const clampAscension = (a: number): number =>
  Math.max(0, Math.min(ASCENSION_MAX, Math.floor(a)))

/** Bônus no nível-alvo (overall médio) dos ADVERSÁRIOS: +1 por ascension. */
export const opponentLevelBonus = (ascension: number): number => ascension

/** Penalidade no nível dos jogadores OFERECIDOS (recompensa e mercado): -1,5 por ascension. */
export const offerLevelPenalty = (ascension: number): number => ascension * 1.5

/** Melhoramentos por visita à academia: 5 no normal, -1 a cada 3 ascensions (mín. 2 na A9+). */
export const gymTrains = (ascension: number): number =>
  Math.max(2, 5 - Math.floor(ascension / 3))
