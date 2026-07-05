/** Empilha uma mensagem no topo do histórico (mais recente primeiro), cortando
 *  no teto pra não crescer sem limite — mesma regra usada pela carreira e pela
 *  corrida roguelike, cada uma com seu próprio teto de linhas guardadas. */
export const pushLog = (log: string[], msg: string, max: number): void => {
  log.unshift(msg)
  if (log.length > max) log.pop()
}
