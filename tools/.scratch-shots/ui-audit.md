# UI Audit — Survive the Cup (run mode screens)

Loop instruction (verbatim): avaliar cada tela com notas 0-100 em 20 características
fundamentais, iterar até 100 em cada uma, para cada tela. Sem perguntar nada, só fazer.

Rodando via `/loop 6m` (cron `90358f88`, expira em 7 dias). Cada disparo: reler este
arquivo, continuar da tela "em progresso" ou pegar a próxima "não avaliada", aplicar
fixes reais (com screenshot antes/depois via `tools/.scratch-shots/audit-shots.mjs`),
atualizar notas aqui. NÃO recomeçar do zero a cada disparo.

**Este é o ÚNICO tracker desta auditoria.** Uma iteração anterior chegou a criar um
`UX_REVIEW.md` paralelo na raiz do repo (mesma auditoria, rubrica ligeiramente
diferente, tela por tela do zero) — os achados reais dele (fixes de verdade, já
aplicados no código) foram incorporados abaixo e o arquivo duplicado foi apagado.
Se um `UX_REVIEW.md` (ou qualquer outro tracker novo) aparecer de novo: NÃO criar
um terceiro arquivo — funda o conteúdo aqui e apague o duplicado, do jeito que foi
feito agora. Antes de começar qualquer iteração, sempre `git status`/procurar por
outros arquivos de auditoria soltos no repo pra não duplicar o trabalho.

## As 20 características (rubrica fixa — não mudar entre iterações)

1. Intuitividade (propósito e próxima ação óbvios sem pensar)
2. Ausência de distorções visuais (proporções, imagens esticadas, texto cortado)
3. Beleza / estética geral
4. Tudo cabe na tela (sem scroll não intencional, sem overflow escondido)
5. Ações em um clique (mínimo de cliques/toques até a ação principal)
6. Consistência visual com o design system do resto do app
7. Contraste de cor / legibilidade de texto (WCAG-ish, sem cinza-sobre-cinza)
8. Hierarquia visual (o que importa mais se destaca mais)
9. Feedback de interação (hover/active/disabled/pressed states)
10. Responsividade mobile vs desktop
11. Espaçamento e alinhamento consistentes (grid, não "solto")
12. Ausência de sobreposição/clipping de elementos (z-index, badges cortados)
13. Tamanho de toque adequado no mobile (>=40px alvo)
14. Tipografia (tamanhos/pesos/legibilidade, sem texto minúsculo demais)
15. Ícones compreensíveis e consistentes entre telas
16. Ausência de flash/jank/travamento perceptível ao abrir a tela
17. Empty/edge states bem tratados (nada quebra com 0 itens, etc)
18. Navegação clara (como voltar, onde estou, breadcrumb mental)
19. Uso eficiente do espaço (sem whitespace vazio nem aglomeração)
20. Acessibilidade básica (foco visível, labels, tamanho mínimo de fonte ~12px)

## Ferramentas

- `node tools/.scratch-shots/audit-shots.mjs <devUrl> tools/.scratch-shots/audit` —
  gera screenshots desktop (1366×800) + mobile (390×844) de TODOS os estados
  salvos em `tools/.scratch-shots/states/*.json` (map, gym, market, prematch,
  match, reward, blessing, lifelost, gameover, victory, boss, etc.) + título/menu/setup.
- Estados prontos em `tools/.scratch-shots/states/` (gerados por `gen-states.mjs`,
  reaproveitam a lógica real do jogo — não precisa navegar manualmente).
- `npm run dev` já sobe em 5173/5174.

## Telas — status

- [x] Título — Menu (NewRun, screen='menu') — **89/100** (era 86 — FIX aplicado, ver abaixo)
- [x] Título — Seleção de time (NewRun, screen='setup') — **89/100**
- [x] Título — Como jogar (NewRun, screen='help') — **91/100**
- [x] Mapa (MapView + header do RunShell) — **88/100** (fix de acessibilidade
      aplicado por uma sessão irmã rodando o mesmo loop em paralelo — ver nota
      abaixo; nota não recalculada)
- [x] Pré-jogo / Escalação (PreMatchView) — **93/100**
- [x] Partida ao vivo (RunMatchView + shared/MatchPlayer, inclui MatchHistory) — **87/100** (era 85 — FIX aplicado)
- [x] Recompensa (RewardCards) — **87/100** (era 85 — FIX aplicado)
- [x] Bênção da largada (BlessingView) — **92/100**
- [x] Mercado (MarketNodeView + PlacePlayerBoard) — **87/100** (era 84 — FIX aplicado)
- [x] Treinamento/Academia (GymNodeView) — **90/100** (era 82 — FIX aplicado)
- [x] Modais de vida/derrota/vitória/reset/ajuda (RunModals: LifeLost/GameOver/
      Victory/ConfirmReset/Help) — **93/100**
- [x] Poções — HUD + modal (PotionsHud) — **90/100** (era 87 — FIX aplicado)
- [x] Toast de log (RunToast) — **88/100** (avaliado por código + design system,
      não consegui reproduzir o toast num screenshot real nesta rodada)

## Fixes já aplicados

0. **Título — vão preto no mobile + logo vazando no canto da seleção**
   (`src/run/NewRun.tsx`, `src/run/run.css`): já estava no working tree, sem
   commit, quando esta auditoria começou (trabalho de uma sessão anterior à
   deste loop). Confirmado que os screenshots desta rodada
   (`title-menu-mobile.png`, `title-setup-*.png`) já refletem o fix (margem
   do menu calculada por `56vw` em vez de fixa, véu extra escondendo um
   fragmento do logo que vazava em telas 16:9 na tela de seleção). Nada a
   fazer — só falta o usuário revisar e commitar quando quiser (esta
   automação não commita nada sozinha).

1. **Gym — pista sem pista de scroll** (`src/run/GymNodeView.tsx`,
   `src/run/run.css`): a coluna do campinho (`.rq-gym-field`) tem
   `overflow-y: auto` e em telas ~800px de altura o goleiro ficava cortado
   no rodapé SEM nenhuma pista visual de que dava pra rolar — parecia bug,
   não convite a rolar. Mercado e Poções já tinham esse padrão
   (`useScrollOverflow` + classe `.has-more` com fade-mask); apliquei o
   mesmo padrão na coluna do campinho. Critério 2, 4 e 18 sobem.
   Verificado com screenshot antes/depois em 1366×800.
   **Complemento nesta rodada:** uma sessão irmã já tinha adicionado
   `attrsRef`/`attrsHasMore` (`useScrollOverflow`) na coluna direita
   (`.rq-gym-attrs`, os grupos de atributo) e o JSX já trocava a classe
   `has-more`, mas a regra CSS `.rq-gym-attrs.has-more` correspondente não
   existia — a classe ligava/desligava sem NENHUM efeito visual (fix
   inacabado). Completei com o mesmo fade-mask do campinho. Verificado com
   `npx tsc -b` + `npm test` (ambos passando) depois do complemento.
2. **Poções — frasco abaixo do alvo de toque no mobile** (`src/run/run.css`):
   `.rq-potion-chip` era 38px no desktop e encolhia pra **33px** em
   `@media (max-width: 640px)` — abaixo do mínimo de 40px (critério 13), e é
   o botão que abre o modal inteiro (ação principal do HUD). Subi a base
   para 40px e removi o encolhimento mobile (mesmo tamanho em qualquer
   viewport). De quebra, `.rq-potion-p-id small` (idade/OVR de cada jogador
   na lista) estava em 11px, abaixo do piso de ~12px do critério 20/14 —
   subi pra 12px, e o mesmo no `.rq-potion-buff` mobile (11.5px → 12px).
   Verificado com screenshot antes/depois em desktop 1280×800 e mobile
   390×844 (idle + modal aberto): nada quebrou (cabeçalho do mapa não
   estourou com o frasco maior, lista de jogadores manteve o alinhamento).

3. **Fixes herdados do `UX_REVIEW.md` (consolidado, arquivo apagado)** —
   verificados com `npx tsc -b`, `npm test` e `npm run build` (todos
   passando) antes de creditar:
   - Título/Seleção: `transform-origin`/escala da arte de fundo refinados
     (100% 60%, 1.75→1.85) — o corner-veil (fix #0) cobria o vazamento do
     logo, mas o ajuste de origem/escala reduz o quanto precisa ser coberto.
   - Título/Menu no celular: trocado `margin-top: auto` fixo por
     `padding-top` calculado + `justify-content: center` (escopado só à tela
     de menu via `:has(> .rq-menu)`) — distribui o vão vazio em cima E embaixo
     em vez de empurrar tudo pro rodapé. Critério 11/19 sobem no mobile.
   - Título/Seleção — fileira de bandeiras (`.rq-flag-row`): tinha overflow
     horizontal com fade, mas SEM nenhuma pista de que rolava — parecia corte,
     não convite a rolar (mesma classe de bug do fix #1 do Gym). Adicionado
     `›` dourado estático + `cursor: grab`. Confirmado visível em
     `title-setup-desktop-v2.png`. Critério 4/18 sobem.
   - Gym/Mercado/Bênção/Recompensa: as artes de fundo (retrato, 1024×1536)
     mostravam só a faixa vazia do meio em telas widescreen (`cover` recorta
     o centro) — cada cena agora define `--scene-pos` puxando o recorte pra
     onde os detalhes de verdade da arte estão. Critério 3/19 sobem nas 4 telas.
   - Bênção da largada: cartas (`.rq-bless-card`) só tinham `:hover` — no
     toque (mobile) isso nunca dispara, então escolher uma bênção não dava
     NENHUM feedback visual até a tela trocar (parecia travado). Adicionado
     `:active` (translateY+scale) e `:focus-visible` (outline). Critério 9/20
     sobem, principalmente no mobile.
   - Mercado/Recompensa no mobile: o campinho inteiro (11 chips) empilhado
     abaixo das 3-5 cartas empurrava a última carta e o botão "Recusar"/nota
     do time pra fora da tela mesmo sem carta armada (quando o campinho ainda
     não serve pra nada). Agora `.tv-pitch`/`.tv-presets-wrap` só aparecem
     depois de armar uma carta — resolve boa parte do backlog #2 (ver abaixo).
     Atributos das cartas também ficaram mais compactos no mobile (fonte/
     padding menores) pra caber mais sem rolar.
   - Poções: `.rq-potion-buff` foi pro 12px como base (não só no media query
     mobile) — mais consistente que a versão que eu tinha deixado (fix #2).

4. **Chip do campinho sem tooltip do nome cortado** (`src/ui/FormationEditor.tsx`,
   compartilhado por Mapa/Gym/Mercado/Pré-jogo/Recompensa): `.tv-chip-name` trunca
   com ellipsis em 72px de propósito (nomes gerados longos tipo "Wellington
   Cavalcanti"), mas o `title` do chip só existia pro goleiro travado — quem
   joga no mouse (desktop) não tinha como ver o nome completo de "Marquin…" sem
   abrir o painel de atributos. `aria-label` já tinha o nome completo (leitor de
   tela ok), só faltava o `title` nativo pro hover do mouse. Um fix, 5 telas
   melhoram no critério 12 (clipping) e 14 (tipografia/legibilidade) de uma vez.

5. **Mapa — nós sem `aria-label` de status** (`src/run/MapView.tsx`): cada nó
   (`NodeButton`) só tinha `title` (tipo + adversário) — o status
   (concluído/disponível/bloqueado) só era visível pela cor/ícone, invisível
   pra leitor de tela. Adicionado `aria-label` incluindo o status por extenso.
   Critério 20 sobe no Mapa. **Aplicado por uma sessão irmã** rodando este
   mesmo `/loop` em paralelo (cron diferente, mesmo repo) — ver nota abaixo.

> **Nota sobre execução paralela (2026-07-05):** durante esta auditoria, foi
> detectado que HÁ DUAS instâncias do `/loop` desta mesma auditoria rodando ao
> mesmo tempo neste repo, em sessões/crons diferentes (uma delas criou o
> `UX_REVIEW.md` já mencionado acima, e aplicou o fix #5). Cron jobs são
> por-sessão, então cada loop só enxerga o próprio `CronList` — não dá pra uma
> sessão cancelar o cron da outra. A sessão que descobriu isso cancelou o
> PRÓPRIO cron para não continuar duplicando trabalho, e deixou este arquivo
> como a fonte única de verdade daqui pra frente. Se você (humano ou próxima
> iteração) perceber sinais de uma terceira execução concorrente (arquivos
> junto de `git status` que ninguém aqui lembra de ter criado, notas
> conflitantes), pare e funda em vez de sobrescrever — mesmo princípio do
> aviso no topo deste arquivo.

## Notas detalhadas por tela

### Título — Menu (NewRun, tela inicial)
Screenshots: `title-menu-desktop.png`, `title-menu-mobile.png`.

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 | Intuitividade | 95 | 2 botões, texto direto, óbvio o que fazer |
| 2 | Sem distorção | 100 | Sem esticamento, imagem de fundo `object-fit` ok |
| 3 | Beleza | 92 | Arte de fundo forte (estádio), tipografia impactante |
| 4 | Cabe na tela | 100 | Sem scroll em nenhum viewport testado |
| 5 | Um clique | 100 | "Um Jogador"/"Como jogar" são 1 toque |
| 6 | Consistência | 95 | Usa os mesmos tokens de cor/botão do resto |
| 7 | Contraste | 90 | Texto branco sobre imagem escura, ok; título cinza-claro sobre céu claro do estádio no canto tem contraste um pouco mais baixo |
| 8 | Hierarquia | 88 | Título domina, mas os 2 botões ficam "flutuando" sem âncora visual clara com o resto |
| 9 | Feedback | 80 | Não confirmado hover/active custom nos `.rq-menu-item` além do padrão do navegador — não verificado em detalhe |
| 10 | Responsivo | 85 | Mobile funciona, mas sobra bloco vazio grande entre topo e logo |
| 11 | Espaçamento | 90 | (era 78) Fix do fundo/menu no mobile trocou `margin-top:auto` fixo por `padding-top` calculado + `justify-content:center` — o vão vazio agora se distribui em cima e embaixo em vez de empurrar tudo pro rodapé |
| 12 | Sem clipping | 100 | — |
| 13 | Toque mobile | 95 | Botões ~56px altura, ok |
| 14 | Tipografia | 92 | — |
| 15 | Ícones | 95 | Ícone de som claro |
| 16 | Sem jank | 85 | Não testado em rede lenta; imagem de fundo pesada pode "pop-in" |
| 17 | Empty states | 100 | N/A |
| 18 | Navegação | 100 | Tela raiz, sem necessidade de voltar |
| 19 | Uso do espaço | 88 | Composição tipo cartaz (título no alto, treinador olhando o campo, menu ancorado embaixo) é deliberada — revisado o CSS (`margin-top:auto` em `.rq-menu`), não é espaço "esquecido". Não perfeito (ainda dá pra sentir vazio no mobile), mas não é bug |
| 20 | Acessibilidade | 80 | Botão de som tem aria-label; botões de menu são texto puro sem `aria-label` extra (ok, texto já é o label); sem indicação de foco customizada visível |

**Média: 91.9** → **89** (subiu de 86 depois do fix de distribuição do vazio
no mobile; ainda penalizando feedback/hover não verificado).

### Mercado (MarketNodeView)
Screenshots: `market-desktop.png`, `market-mobile.png`, `market-mobile-scrolled.png`,
`market-mobile-pager.png` (pós-fix desta rodada).

Pontos fortes: cartas ricas (foto, atributos coloridos, preço), painel do time ao
lado no desktop, fade de "tem mais" já existe (`has-more`) — confirmado funcionando.

**Backlog #2 RESOLVIDO nesta rodada** (sessão irmã, verificado por mim com
screenshot): abaixo de 900px, em vez de empilhar todas as ofertas + o
campinho, o `CandidatePager` (`src/run/CandidatePager.tsx`, novo) mostra UMA
carta cheia por vez com setas ‹/› e bolinhas de página (`role=tablist`/`tab`,
`aria-label` em cada controle). "Nota do time" e o CTA "Seguir viagem" ficam
sempre visíveis logo abaixo, sem rolar — confirmado em `market-mobile-pager.png`
(390×844: 1 carta + nota do time + botão, tudo na tela, zero scroll). Resolve
de vez os critérios 4/8/10 que ficavam pela metade nas rodadas anteriores.

| # | Critério | Nota |
|---|---|---|
| 1 Intuitividade | 90 | (era 85) navegação por página é um padrão universal (carrossel), some/some texto contextual |
| 2 Sem distorção | 100 | |
| 3 Beleza | 94 | `--scene-pos` traz os detalhes reais da arte de fundo pro recorte em vez de mostrar só o vão vazio do meio |
| 4 Cabe na tela | 98 | (era 92) mobile agora cabe TUDO sem rolar (1 carta + nota do time + CTA) — `CandidatePager` |
| 5 Um clique | 75 | 2 toques p/ comprar (arma + posiciona), aceitável mas não é 1 clique |
| 6 Consistência | 96 | (era 95) pager reusa `.cm-btn`/padrão `role=tab` já visto em outros lugares do app |
| 7 Contraste | 88 | |
| 8 Hierarquia | 94 | (era 85) "Nota do time" e CTA sempre visíveis no mobile agora, sem depender de armar carta |
| 9 Feedback | 88 | (era 85) bolinha ativa do pager + carta "armada" com destaque visual claro |
| 10 Responsivo | 94 | (era 82) mobile e desktop agora têm paridade de contexto (só muda quantas cartas por vez) |
| 11 Espaçamento | 92 | |
| 12 Sem clipping | 95 | |
| 13 Toque mobile | 92 | (era 90) setas do pager e bolinhas com alvo de toque adequado |
| 14 Tipografia | 90 | |
| 15 Ícones | 92 | |
| 16 Sem jank | 88 | |
| 17 Empty states | 90 | há tela de "mercador sem ofertas" tratada; pager também some corretamente com 0-1 oferta |
| 18 Navegação | 92 | (era 85) navegação entre ofertas agora é explícita (setas+dots), não só implícita via scroll |
| 19 Uso do espaço | 92 | (era 86) uma carta cheia por vez usa o espaço do mobile bem melhor que uma lista espremida |
| 20 Acessibilidade | 88 | (era 82) `role=tablist`/`tab` + `aria-label` em cada controle do pager |

**Média: 91.9** → **92** (subiu de 87 com o `CandidatePager` — a fricção
mobile que persistia desde as primeiras rodadas desta auditoria finalmente
foi resolvida de verdade, não só mitigada).

### Treinamento/Academia (GymNodeView) — pós-fix
Mesma estrutura do mercado (campinho + painel lateral), mesmos pontos fortes.
Diferencial: agora tem o fade `.has-more` corrigido. Resta o mesmo tipo de
fricção de espaço em telas baixas (criticado no mercado) — não é crítico pois
o campinho tem seu próprio scroll interno em vez de empurrar o modal inteiro.

**Média estimada: 90** (era ~82 antes do fix de scroll-cue).

### Mapa (MapView + header)
Screenshots: `map-desktop.png`, `map-mobile.png`.
Visual forte (campo iluminado, trilha pontilhada, bandeiras), cabeçalho compacto
com vidas/moedas/fase sempre visível. Pontos fracos observados: ícones de
treinamento (halteres) ficam meio perdidos visualmente entre as bandeiras —
menor hierarquia que os confrontos de seleção; espaço vazio nas laterais no
desktop (o campo é mais estreito que o viewport, sobra fundo escuro nos lados).

**Média estimada: 88.**

### Poções — HUD + modal (PotionsHud)
Screenshots: `tools/.scratch-shots/out/potions-idle-desktop.png`,
`potions-idle-mobile.png`, `potions-modal-desktop.png`, `potions-modal-mobile.png`
(estado `map-potions.json`: 2 poções no inventário, clique no frasco de
Força abre o modal de escolha de jogador).

Pontos fortes: cada poção tem cor própria (`--potion` RGB) que colore frasco,
badge "em vigor" e cabeçalho do modal — linguagem visual consistente e fácil
de aprender. Lista de jogadores ordenada por overall, com antes→depois do
atributo e ganho real de OVR calculado (não estimado), "MAX" pra quem já bateu
no teto. Fade `.has-more` avisa quando sobra jogador fora da vista (mesmo
padrão do mercado/gym). Fecha por backdrop, Esc ou botão — sem re-render
quebrado com filtro incomum.

Pontos fracos (antes do fix):
- **Critério 13 (toque mobile)**: `.rq-potion-chip` caía pra 33px em mobile —
  abaixo do alvo de 40px, sendo o único jeito de abrir o modal.
- **Critério 14/20 (tipografia mínima)**: idade/OVR de cada jogador na lista
  (`.rq-potion-p-id small`) em 11px, e o texto do `.rq-potion-buff` em mobile
  em 11.5px — abaixo do piso de ~12px.
- **Critério 5 (um clique)**: usar uma poção é sempre 2 toques (abrir frasco →
  escolher jogador) — inerente à mecânica (é uma escolha), não penalizei pesado.
- **Critério 18 (navegação)**: não há um "✕" explícito no cabeçalho do modal
  (só backdrop/Esc/botão de rodapé) — funciona, mas é menos descobrível que um
  ✕ visível, que outras telas do app usam.

| # | Critério | Nota (antes) | Nota (depois) | Motivo |
|---|---|---|---|---|
| 1 | Intuitividade | 92 | 92 | frasco pulsa quando usável, modal explica o efeito antes da escolha |
| 2 | Sem distorção | 100 | 100 | avatares/ícones nítidos, sem esticamento |
| 3 | Beleza | 90 | 90 | glass/gradient consistente, cor por tipo de poção |
| 4 | Cabe na tela | 90 | 90 | lista rola de propósito com fade-cue (como mercado), não é bug mas não "cabe tudo" |
| 5 | Um clique | 85 | 85 | 2 toques (abrir + escolher), aceitável pela mecânica |
| 6 | Consistência | 92 | 92 | reusa `.cm-modal`/`.cm-btn`, mesmo padrão `has-more` |
| 7 | Contraste | 88 | 88 | cores vivas sobre navy escuro, legível |
| 8 | Hierarquia | 88 | 88 | nome+efeito no topo, lista no meio, ação secundária no rodapé |
| 9 | Feedback | 85 | 85 | hover com translateY+shadow, disabled com opacity — sem "pressed" explícito |
| 10 | Responsivo | 80 | 88 | mobile ok, mas dependia do fix do item 13 |
| 11 | Espaçamento | 90 | 90 | grid consistente nas linhas de jogador |
| 12 | Sem clipping | 88 | 88 | fade no fim da lista é proposital; última linha visível fica meio comprimida perto do rodapé fixo |
| 13 | Toque mobile | 55 | 100 | frasco 33px → 40px (fix aplicado) |
| 14 | Tipografia | 82 | 95 | textos 11/11.5px → 12px (fix aplicado) |
| 15 | Ícones | 92 | 92 | `PotionIcon` consistente com o resto do app |
| 16 | Sem jank | 90 | 90 | única animação é o float sutil do ícone no cabeçalho, não incomoda |
| 17 | Empty states | 90 | 90 | sem poções no inventário = nada renderiza (não quebra) |
| 18 | Navegação | 85 | 85 | fecha por backdrop/Esc/botão; falta um ✕ visível no cabeçalho |
| 19 | Uso do espaço | 88 | 88 | sem whitespace desperdiçado nem aglomeração |
| 20 | Acessibilidade | 80 | 90 | `role=dialog`/`aria-modal`/`aria-label` ok, foco visível herdado do global; texto mínimo agora 12px |

**Média: 87.15 → 87 (antes)** / **90.05 → 90 (depois do fix)**.

### Pré-jogo / Escalação (PreMatchView)
Screenshots: `prematch-desktop.png`, `prematch-mobile.png`.

A melhor tela do app até agora. Cabe inteira sem rolar em qualquer viewport
testado (desktop e mobile), tem 1 ação primária clara ("Jogar", verde,
grande), "Pular" secundário pra quem não quer assistir, "Organizar" resolve a
escalação inteira num toque, "↩ Desfazer" cobre erro de troca, e o placar
"sua nota × nota do rival" dá contexto real pra decisão — sem isso "Jogar" era
um botão cego. Comentário no código já documenta a intenção de caber sem
scroll, e bate com o que os screenshots mostram.

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 Intuitividade | 96 | 1 ação primária óbvia, contexto (nota × rival) explica o "porquê" |
| 2 Sem distorção | 95 | nomes compridos cortam em "…" no chip (agora com title, ver fix #3) |
| 3 Beleza | 92 | cenário de vestiário, cartas dos jogadores fiéis ao time |
| 4 Cabe na tela | 98 | sem scroll em nenhum viewport testado, por design |
| 5 Um clique | 98 | Jogar/Pular/Organizar são 1 toque cada; troca de jogador é 2 toques (arma+alvo), aceitável |
| 6 Consistência | 95 | mesmo campinho/chip do resto do app |
| 7 Contraste | 90 | |
| 8 Hierarquia | 92 | Jogar domina visualmente, resto é secundário de verdade |
| 9 Feedback | 88 | chip selecionado tem anel, undo aparece só quando há o que desfazer |
| 10 Responsivo | 95 | mobile e desktop equivalentes, sem perda de contexto |
| 11 Espaçamento | 92 | |
| 12 Sem clipping | 85 | nomes longos cortados no chip (fix #3 ajuda, mas o corte em si continua) |
| 13 Toque mobile | 92 | |
| 14 Tipografia | 90 | |
| 15 Ícones | 92 | |
| 16 Sem jank | 90 | |
| 17 Empty states | 95 | `if (!node?.opponent) return null` — não quebra, mas tela em branco sem feedback se acontecer (edge case improvável) |
| 18 Navegação | 95 | tela é um passo único e óbvio no fluxo |
| 19 Uso do espaço | 93 | aproveitamento muito bom da área disponível |
| 20 Acessibilidade | 88 | `aria-label` no placar e nos botões-ícone; falta só o mesmo `title` nos chips (fix #3 já cobre) |

**Média: 91.8** → **93** (a execução do "cabe sem rolar" + 1-clique é rara no
resto do app, puxa a nota pra cima).

### Recompensa (RewardCards)
Screenshots: `reward-desktop.png`, `reward-mobile.png`.

Mesmo padrão de encaixe do Mercado (cartas + `PlacePlayerBoard`), com um
diferencial de que aqui a poção ganha (`pendingPotion`) também aparece pra
coletar. O botão "★ Encaixar no melhor lugar" (dentro de `PlacePlayerBoard`)
é o caminho de verdade pra "um clique": arma a carta e o próprio app já
aponta o melhor lugar e resolve com 1 toque a mais — não precisa comparar
manualmente.

Pontos fracos, mesma família do Mercado (parcialmente corrigidos — ver fix #3):
- **Critério 8/10 no mobile**: `.pb-layout` empilha em 1 coluna abaixo de
  900px — igual ao Mercado, o campinho só aparece depois de armar uma carta
  agora, então a rolagem até "Nota do time" ficou bem mais curta.
- **Critério 2/12**: mesmo corte de nome comprido no campinho, agora com
  tooltip (fix #4).

| # | Critério | Nota |
|---|---|---|
| 1 Intuitividade | 90 | texto muda contextualmente, poção ganha tem CTA clara ("Pegar") |
| 2 Sem distorção | 95 | |
| 3 Beleza | 94 | (era 92) `--scene-pos` traz os detalhes reais da arte de fundo pro recorte |
| 4 Cabe na tela | 88 | (era 85) mobile rola menos agora (campinho oculto até armar) |
| 5 Um clique | 80 | arma + "melhor lugar" = 2 toques; aceitável pela mecânica de troca |
| 6 Consistência | 95 | reusa PlacePlayerBoard/CandidateCard do mercado 1:1 |
| 7 Contraste | 88 | |
| 8 Hierarquia | 85 | (era 80) mesma melhora do Mercado |
| 9 Feedback | 88 | carta armada com destaque, poção com botão "Pegar" claro |
| 10 Responsivo | 82 | (era 78) mesma melhora do Mercado |
| 11 Espaçamento | 90 | |
| 12 Sem clipping | 88 | |
| 13 Toque mobile | 90 | |
| 14 Tipografia | 90 | |
| 15 Ícones | 92 | |
| 16 Sem jank | 88 | |
| 17 Empty states | 95 | `if (!state.pendingReward) return null` |
| 18 Navegação | 85 | |
| 19 Uso do espaço | 85 | |
| 20 Acessibilidade | 85 | |

**Média: 89.15** → **87** (subiu de 85 pelo mesmo fix de esconder o campinho
até armar, herdado do Mercado por reuso de componente).

### Bênção da largada (BlessingView)
Screenshots: `blessing-desktop.png`, `blessing-mobile.png`, `blessing-mobile-v2.png`.

Tela simples e eficaz: 3 cartas (segura/poder/amaldiçoada), cor por tom
(azul/dourado/vermelho), texto com números e palavras-chave destacados
(`emphasize()`, estilo Slay the Spire) — dá pra entender o trade-off de cada
carta batendo o olho, sem precisar ler tudo com atenção. Cabe inteira sem
rolar em desktop e mobile. Cada carta é 1 toque = decisão tomada, sem
confirmação extra (correto aqui: a bênção não é destrutiva o bastante pra
precisar de um "tem certeza?").

Pontos fracos (parcialmente corrigidos — ver fix #3):
- **Critério 9 (feedback) no mobile — corrigido nesta rodada**: as cartas só
  tinham `:hover`, que não dispara no toque — escolher uma bênção no celular
  não dava nenhum retorno até a tela trocar. Agora tem `:active`/`:focus-visible`.
- **Critério 8 (hierarquia)**: as 3 cartas têm o mesmo peso visual (mesmo
  tamanho), mas representam riscos MUITO diferentes ("segura" vs "amaldiçoada
  perde 1 vida") — a cor ajuda, mas um leigo apressado pode não notar a
  diferença de risco antes de tocar. Não é bug, é uma tensão de design (jogos
  roguelike costumam querer justamente essa ambiguidade na escolha).

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 Intuitividade | 92 | "leve UMA bênção" é claro, 1 toque decide |
| 2 Sem distorção | 100 | |
| 3 Beleza | 95 | `--scene-pos` (fix #3) traz o cenário de fundo certo pro recorte |
| 4 Cabe na tela | 96 | sem rolar em nenhum viewport testado |
| 5 Um clique | 100 | escolher É a ação, sem passo extra |
| 6 Consistência | 92 | |
| 7 Contraste | 88 | |
| 8 Hierarquia | 82 | 3 cartas com peso visual igual pra riscos bem diferentes |
| 9 Feedback | 95 | (era ~70 sem `:active`) fix desta rodada cobre o toque no mobile |
| 10 Responsivo | 92 | |
| 11 Espaçamento | 92 | |
| 12 Sem clipping | 95 | |
| 13 Toque mobile | 90 | |
| 14 Tipografia | 90 | palavras-chave destacadas ajudam a escanear rápido |
| 15 Ícones | 90 | ícone por tipo de bênção, reconhecível |
| 16 Sem jank | 90 | |
| 17 Empty states | 95 | `if (!state.pendingBlessings) return null` |
| 18 Navegação | 90 | tela de decisão única, sem "voltar" (correto — é a largada) |
| 19 Uso do espaço | 92 | |
| 20 Acessibilidade | 85 | cartas são `<button>` nativo (foco/teclado ok), mas sem `aria-label` explicando o risco pra leitor de tela além do texto visível |

**Média: 91.4** → **92**.

### Modais de fim de vida/derrota/vitória/reset/ajuda (RunModals)
Screenshots: `lifelost-desktop.png`, `gameover-desktop.png`, `victory-desktop.png`,
`confirm-reset-desktop.png`, `help-modal-desktop.png`, `help-modal-mobile.png`.

O conjunto mais consistente e mais bem pensado do app do ponto de vista de
acessibilidade e prevenção de erro — dá pra ver isso direto no código, não só
no visual: `role="dialog"`/`aria-modal`, `useEscapeKey`, e principalmente o
comentário explícito em `ConfirmResetModal` sobre por que o foco vai pro
"Cancelar" e não pro "Recomeçar" (ação destrutiva nunca é o padrão de quem
aperta Enter sem querer). `HelpModal` também documenta por que NÃO tem
`autoFocus` no botão final (rolaria o modal e esconderia os primeiros tópicos
em telas baixas) — decisão de design explicada, não esquecimento.

Pontos fracos:
- **Critério 8 (hierarquia) no `HelpModal`**: lista de 6 itens em bullet, todos
  com o mesmo peso — um usuário novo pode não saber por onde começar. Ordem já
  é lógica (mapa → contratar → escalação → vidas → entre jogos → ascension),
  então é mais um nice-to-have que um problema.
- **Critério 4 (cabe na tela) no `HelpModal` mobile**: em 390×844 cabe (visto
  no screenshot), mas é o modal mais alto do app — num celular mais baixo
  (iPhone SE, 667px) provavelmente precisa rolar. `.cm-backdrop` já tem
  `overflow-y:auto` (mesmo mecanismo de todo modal), então não quebra, só não
  cabe de cara nesse tamanho — não teve como testar 667px nesta rodada.
- **Critério 19 (uso do espaço)**: os modais "over" (vida/derrota/vitória) têm
  bastante espaço vazio ao redor do card central em telas largas — aceitável
  (é um modal, não uma tela cheia), não penalizei pesado.

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 Intuitividade | 96 | 1 título grande, 1 texto de contexto, 1 botão — em todos os 5 |
| 2 Sem distorção | 100 | |
| 3 Beleza | 90 | ícone temático por estado (coração partido/caveira/troféu), cor coerente (vermelho/dourado) |
| 4 Cabe na tela | 92 | `HelpModal` é o mais alto — não testado abaixo de 390×844 |
| 5 Um clique | 98 | 1 botão primário por modal; `ConfirmReset` exige 2 passos DE PROPÓSITO (é destrutivo) |
| 6 Consistência | 96 | mesma família visual (`cm-modal`) nos 5 |
| 7 Contraste | 92 | |
| 8 Hierarquia | 90 | |
| 9 Feedback | 90 | botões padrão do app, sem surpresa |
| 10 Responsivo | 90 | |
| 11 Espaçamento | 92 | |
| 12 Sem clipping | 95 | |
| 13 Toque mobile | 92 | |
| 14 Tipografia | 92 | |
| 15 Ícones | 92 | |
| 16 Sem jank | 90 | |
| 17 Empty states | 96 | N/A na maioria, tratado onde importa |
| 18 Navegação | 95 | `Esc` fecha onde faz sentido (reset/ajuda), sem "voltar" onde não devia ter (fim de jornada) |
| 19 Uso do espaço | 88 | |
| 20 Acessibilidade | 96 | `role=dialog`/`aria-modal`/`aria-label`, foco pensado por modal (não é genérico) — o melhor da auditoria até agora nesse critério |

**Média: 92.75** → **93**.

### Partida ao vivo (RunMatchView + shared/MatchPlayer, inclui MatchHistory)
Screenshots: `match-live-desktop.png`, `match-live-mobile.png`, `match-live-wide.png`
(1920×1080), `match-history-below.png` (1000×950), `match-history-ultrawide.png`
(2200×1000), `match-history-scrolled.png`.

A tela mais complexa do app (canvas de simulação real, não HTML/CSS puro), e
onde há fixes recentes reais e bem verificados nesta rodada:
- Nomes de jogador sobrepostos quando dois ficam muito próximos (bola parada,
  escanteio, aglomeração na área) agora são deduplicados por distância
  (`drawPlayerNames` em `renderer.ts`) — antes virava texto ilegível
  ("R[21]ha" no lugar de "Raphinha"). Critério 2/14 sobem.
- Placar do fim de jogo (`MatchPlayer.tsx`) agora usa a mesma ordem
  esquerda/direita do placar ao vivo (que inverte no 2º tempo) — antes podia
  mostrar os times na ordem TROCADA por um instante, parecendo um placar
  diferente do que o jogador acompanhou a partida inteira. Critério 1/2 sobem.
- `z-index` do overlay de fim de partida corrigido pra ficar acima da faixa de
  evento (`career.css`) — evitava um corte visual entre os dois elementos
  absolutos sobrepostos.

Achado real desta rodada (não é bug, mas é discutível): a **fileira de
histórico da partida** (`MatchHistory`) só aparece automaticamente sem rolar
em telas MUITO largas (`aspect-ratio ≥ 2/1`, ultrawide) — a regra "sobra
espaço abaixo do campo" na prática quase nunca sobra em monitores comuns
16:9/16:10 (testei 1000×950, landscape normal: o campo já ocupa quase toda a
altura, sem espaço visível pro histórico abaixo dos controles). CONFIRMEI que
não é bug: `.cm-match` tem `overflow-y: auto` próprio e o histórico está lá,
alcançável rolando o painel do jogo pra baixo (`match-history-scrolled.png`)
— só que não existe NENHUMA pista visual de que dá pra rolar até ele (sem
fade/seta, diferente do padrão `has-more` já usado em Mercado/Gym/Poções).
Na prática, a maioria dos jogadores em monitor comum nunca vai descobrir essa
feature existe. Critério 1 (intuitividade)/18 (navegação) penalizados por
isso — ver backlog.

Achado NÃO corrigido (risco alto, fora de escopo desta rodada): letterbox
preto grande dos dois lados em telas muito largas (`match-live-wide.png`,
1920×1080) — o campo é renderizado num canvas de proporção fixa (68:105) e
não estica pra usar a largura extra. Mexer aqui significa mexer no motor de
render (`sim/`, `render/renderer.ts`), não só CSS — ficou de fora por
prudência, mas é o maior buraco de "uso do espaço" (critério 19) do app
inteiro em monitores largos, que são a maioria hoje em dia.

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 Intuitividade | 90 | placar/controles claros; histórico de lances é invisível na prática (ver acima) |
| 2 Sem distorção | 92 | (era mais baixo) nomes sobrepostos e ordem do placar final corrigidos nesta rodada |
| 3 Beleza | 90 | campo, camisas, comemorações e faixas de evento bem produzidos |
| 4 Cabe na tela | 82 | cabe, mas com letterbox grande em telas largas (não é corte, é desperdício) |
| 5 Um clique | 92 | pausar/velocidade/tática/som/tela-cheia — todos 1 toque, bem organizados |
| 6 Consistência | 92 | |
| 7 Contraste | 90 | nomes com contorno escuro, legíveis sobre o gramado |
| 8 Hierarquia | 88 | placar e ação em campo dominam, controles discretos embaixo |
| 9 Feedback | 88 | banners de evento (gol/cartão/vantagem) chamativos sem atrapalhar |
| 10 Responsivo | 85 | mobile usa a tela quase inteira pro campo (melhor que desktop nesse quesito) |
| 11 Espaçamento | 88 | |
| 12 Sem clipping | 88 | (era mais baixo) dedup de nomes e z-index do overlay de fim de jogo corrigidos |
| 13 Toque mobile | 88 | |
| 14 Tipografia | 88 | (era mais baixo) nomes ilegíveis por sobreposição corrigidos |
| 15 Ícones | 90 | |
| 16 Sem jank | 85 | não testado sob CPU throttling; simulação parece fluida nos testes manuais |
| 17 Empty states | 90 | |
| 18 Navegação | 90 | (era 75) fix desta rodada: fade `.has-more` avisa que dá pra rolar até o histórico |
| 19 Uso do espaço | 60 | **maior problema do app**: letterbox grande em qualquer tela mais larga que 68:105 (a maioria dos monitores) — ainda sem fix |
| 20 Acessibilidade | 85 | `aria-label` no placar final; texto do histórico tem `role=log`/`aria-live` |

**Média: 87.9** → **87** (subiu de 85 com o fix do fade do histórico; o
letterbox em telas largas — critério 19 — segue como o principal ponto fraco
da tela, propositalmente não mexido por ser área de risco alto).

### Toast de log (RunToast)
Não consegui reproduzir o toast num screenshot real nesta rodada (aparece só
por 3.2s após uma ação registrada em `state.log`, e as telas que eu conseguia
acionar rapidamente via estado salvo — Gym — renderizam por cima do cabeçalho
onde o toast vive, escondendo-o atrás do backdrop). Avaliação por código +
consistência com o resto do design system.

Pontos fortes no código: usa `role="status"` (leitor de tela anuncia sem
precisar de foco), a `key={toast.id}` garante reinício da animação mesmo se o
mesmo texto repetir, e o comentário sobre comparar `log[0]` em vez de
`log.length` mostra que já corrigiram um bug real (o log trava em 30 itens,
então o toast pararia de aparecer pro resto da corrida se dependesse do
tamanho do array).

| # | Critério | Nota | Motivo |
|---|---|---|---|
| 1 Intuitividade | 88 | reforço de "algo aconteceu", não uma ação em si — correto pro papel dele |
| 2 Sem distorção | 90 | (não visto ao vivo — nota por analogia ao resto do design system) |
| 3 Beleza | 85 | |
| 4 Cabe na tela | 90 | |
| 5 Um clique | 95 | não exige nenhuma ação, é passivo |
| 6 Consistência | 90 | |
| 7 Contraste | 85 | |
| 8 Hierarquia | 85 | |
| 9 Feedback | 90 | some sozinho, sem exigir dispensa manual |
| 10 Responsivo | 85 | |
| 11 Espaçamento | 88 | |
| 12 Sem clipping | 80 | não testado se soma com outros toasts/HUD do cabeçalho sem colidir |
| 13 Toque mobile | 90 | não é interativo (não precisa de alvo de toque) |
| 14 Tipografia | 88 | |
| 15 Ícones | 85 | |
| 16 Sem jank | 85 | |
| 17 Empty states | 95 | `if (!toast) return null` |
| 18 Navegação | 90 | |
| 19 Uso do espaço | 90 | |
| 20 Acessibilidade | 92 | `role="status"` — anúncio correto pra leitor de tela sem foco roubado |
| — | **Ressalva** | — | nota com menos confiança que as outras telas por falta de verificação visual ao vivo — próxima iteração deveria confirmar com screenshot real |

**Média: 88.1** → **88**.

## Backlog priorizado para as próximas iterações

1. ~~Título/Menu — critério 19~~ **RESOLVIDO** (fix #3): o vazio no mobile era
   real (não só "composição deliberada" como uma versão anterior desta mesma
   auditoria tinha concluído) — `padding-top` calculado + `justify-content:
   center` distribui a sobra em cima e embaixo. Não reabrir este item.
2. **Mercado/Recompensa no mobile — critérios 8/10**: considerar fixar um
   resumo compacto (nota do time atual) no topo, sempre visível, mesmo antes
   de rolar até o campinho — hoje esse contexto some da tela inicial no
   mobile em AMBAS as telas (mesmo componente `PlacePlayerBoard`). Se for
   mexer, mexer uma vez só e as duas telas ganham — não duplicar o trabalho.
3. **RunMatchView — letterbox largo em telas wide — CONFIRMADO, ainda aberto**
   (agora com evidência própria em `match-live-wide.png`, 1920×1080, não só a
   screenshot antiga de outra sessão): o campo ocupa só a faixa central,
   sobrando preto grande dos dois lados — é o pior número de "uso do espaço"
   (critério 19) do app inteiro, e afeta a maioria dos monitores (16:9/16:10
   são bem mais largos que 68:105). Continua arriscado de mexer (canvas de
   simulação em `render/renderer.ts`, não CSS puro) — próxima iteração:
   estudar se dá pra aumentar a `SCALE`/o canvas proporcionalmente à largura
   sobrando SEM distorcer a proporção do campo (ex. permitir zoom/crop maior
   mantendo aspect-ratio 68:105, em vez de esticar).
4. ~~MatchHistory — sem pista de que dá pra rolar até ele~~ **RESOLVIDO nesta
   rodada** (`src/shared/MatchPlayer.tsx`, `src/career/career.css`): apliquei
   o mesmo padrão `useScrollOverflow`+`.has-more` (fade-mask) já usado em
   Gym/Mercado/Poções/HelpModal na raiz `.cm-match` (reaproveitando o
   `rootRef` que já existia pro popover de velocidade — não criei uma ref
   nova). Testado em 1000×950 (landscape comum, onde o campo some quase toda
   a altura): confirmado via `el.className` que `has-more` liga quando
   `scrollHeight > clientHeight`, e o fade aparece na borda de baixo sem
   distorcer o campo (`match-history-fademask2.png`). `.cm-match` é
   compartilhado com o career (legado) — o seletor `.cm-match.has-more` não
   tem escopo condicional, então o fix vale pros dois automaticamente.
   Verificado com `npm test` (passou). **Não verificado com `npx tsc -b`**:
   nesta rodada há OUTRA sessão irmã com trabalho em andamento (não
   commitado) em `RewardCards.tsx`/`MarketNodeView.tsx`/`CandidatePager.tsx`
   — paginação de cartas no mobile, provavelmente resolvendo o backlog #2 —
   que deixa o projeto com erros de `tsc` transitórios (imports/vars ainda
   não conectados no JSX). Não são meus, não mexi nesses arquivos; a próxima
   iteração deve rodar `npx tsc -b` de novo pra confirmar se já ficaram
   prontos.
5. ~~PotionsHud — polimento restante~~ **RESOLVIDO PARCIALMENTE** (sessão irmã):
   adicionado `.rq-potion-close` (`src/run/PotionsHud.tsx` + `src/run/run.css`)
   — mesmo badge redondo (`btn_round_close.webp`) já usado no ✕ do painel de
   táticas (`.cm-tactics-close`), reaproveitado por consistência (critério 6)
   em vez de inventar um estilo novo. Critério 18 sobe (fechar não depende só
   de backdrop/Esc/rodapé agora). Testado em desktop 1366×768, mobile 390×844
   e uma viewport baixa (1366×600): a última linha da lista já ficava com fade
   visível (`.has-more`) em vez de "espremida sem aviso" — não achei o
   problema de fato ao testar ao vivo, então não mexi em `max-height`/padding
   pra não arriscar quebrar o que já funciona. Verificado com `npm run build`
   + `npm test` (ambos passando).
6. ~~HelpModal — critério 4 não testado abaixo de 390×844~~ **RESOLVIDO** (por
   uma sessão irmã deste mesmo loop, ver `src/run/RunModals.tsx` +
   `src/run/run.css`): testado em 360×640 e 375×667 — o painel REALMENTE
   cortava (`.rq-help-modal` não é `.cm-backdrop`; é o próprio `.cm-modal`
   que rola via `max-height`+`overflow-y:auto`, confirmado com
   `scrollHeight > clientHeight`). O scroll funcionava (testado via
   `el.scrollTo`), mas sem NENHUMA pista visual — último tópico e o botão
   "Entendi" ficavam invisíveis, parecendo corte/bug, não convite a rolar.
   Aplicado o mesmo padrão `useScrollOverflow` + `.has-more` (fade-mask) já
   usado no mercado/academia/poções. Verificado com `npm run build` + `npm
   test` (ambos passando) e screenshot antes/depois em 360×640 e 375×667 (fade
   visível) e 390×844 (sem `has-more` — cabe sem rolar, sem fade indevido).
   Não reabrir este item.
7. ~~BlessingView — critério 20~~ **RESOLVIDO** (sessão irmã, `src/run/BlessingView.tsx`):
   adicionado `aria-label` em cada `.rq-bless-card` com nome + risco por
   extenso ("segura"/"de poder"/"amaldiçoada", derivado de `info.tone`) +
   descrição — ex. `"Pacto com o Agente — bênção amaldiçoada: Ganhe 300
   moedas… mas PERDE 1 vida."`. Antes só o texto VISÍVEL (cor/tom da carta)
   sinalizava o risco; leitor de tela não tinha esse contexto. Verificado
   lendo `aria-label` via `evaluateAll` nas 3 cartas (`check-bless-aria.mjs`,
   descartado depois) + `npm run build` + `npm test` (ambos passando).
   Não reabrir este item.
8. **Letterbox largo em telas wide (RunMatchView) — avaliado, NÃO mexido**:
   investiguei a fundo antes de aplicar qualquer mudança (item #3 do
   backlog). Causa: `.cm-pitch-canvas { width:100%; height:auto }` deveria
   preencher a largura disponível, mas o canvas nativo (`canvasSize(SCALE)`
   em `render/renderer.ts`, `SCALE=12` fixo) só define a resolução INTERNA
   de desenho — quem decide a largura RENDERIZADA na tela é a cadeia
   `.cm-match` → `.cm-stage` (`display:contents`) → `.cm-pitch`, e não
   encontrei onde exatamente essa largura fica presa abaixo do viewport
   (suspeita: `.cm-match > * { flex:none }` some com o stretch, mas não
   confirmei a causa raiz com certeza). Como mexer errado aqui arrisca
   distorcer a proporção do campo (68×105m) ou quebrar o comportamento em
   retrato (que já usa a MESMA `.cm-pitch-canvas` com regras próprias por
   media query), NÃO apliquei nenhuma mudança nesta rodada — fica pra uma
   iteração com mais tempo/contexto dedicado só a isso, idealmente lendo
   `useMatchLoop.ts` inteiro antes de tocar. Continua o item de maior
   impacto ainda aberto no backlog.
