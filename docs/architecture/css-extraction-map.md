# Mapa de extração do CSS

Análise de 2026-09-11 sobre `5c9859f`. Intervalos abaixo referem-se à baseline.
G1 e G2a–G2aa executados: quatro `legacy-*.css` e trinta e dois destinos do prefixo 1–4278 existem.
Demais destinos continuam propostos; `styles.css` residual contém as linhas históricas 4279–4879.
`styles.css`: 6.090 linhas; 1.189 regras qualificadas no nível superior, 1.312 incluindo media queries.
Há 11 media queries, dois keyframes, um `@import`, 96 seletores exatos repetidos no nível superior
e 21 ocorrências de `!important`. Parsing com `tinycss2` disponível no ambiente não encontrou
erros sintáticos; isso não comprova aparência. Serena atende TypeScript; CSS foi inspecionado por busca e parsing.

## Fronteiras contíguas

Os intervalos cobrem o arquivo inteiro, sem cortar regras ou media queries. Nomes são relativos a `src/`.
A ordem da tabela é a ordem da cascata. São fronteiras possíveis, não arquivos obrigatórios em um único lote.
Pequenos complementos podem permanecer no legado até um lote com cobertura suficiente.

| Linhas | Destino proposto | Responsabilidade |
|---|---|---|
| 1–109 | `styles/foundation.css` | Fontes, tokens, reset, elementos e scrollbars |
| 110–152 | `styles/shell-layout.css` | Layout e topbar |
| 153–291 | `modules/preferences/presentation/preferences-widgets.css` | Cotação e idioma |
| 292–699 | `styles/navigation-and-account-summary.css` | Sidebar, logo, navegação e resumo da conta |
| 700–945 | `styles/page-surfaces-and-headers.css` | Superfícies e cabeçalhos usados por várias features |
| 946–1059 | `styles/page-actions.css` | Botões e intervalos de datas |
| 1060–1359 | `styles/metric-cards-and-risk-insights.css` | Cards, tooltips no body e indicadores comuns |
| 1360–1520 | `styles/dashboard-and-card-layout.css` | Dashboard e layouts comuns de cards |
| 1521–1842 | `modules/accounts/presentation/account-risk-and-cashflow.css` | Risco, progresso, alertas e caixa |
| 1843–2043 | `modules/analytics/presentation/strategy-comparison.css` | Ranking e comparação |
| 2044–2284 | `modules/calendar/presentation/calendar-grids.css` | Calendário mini, mensal, semanal e quinzenal |
| 2285–2432 | `modules/trades/presentation/trade-tables.css` | Tabelas, ordenação e incompletos |
| 2433–2523 | `styles/form-fields.css` | Campos, unidades e hints |
| 2524–2603 | `styles/modal-and-tabs.css` | Modais e abas comuns |
| 2604–2630 | `modules/calendar/presentation/calendar-toolbar.css` | Controles do calendário |
| 2631–2671 | `styles/upload-zone.css` | Upload comum |
| 2672–2700 | `modules/trades/presentation/emotion-picker.css` | Seleção de emoções |
| 2701–2779 | `styles/tag-editor.css` | Tags e edição |
| 2780–2831 | `styles/alerts-and-utilities.css` | Alertas, separadores e utilitários existentes |
| 2832–2879 | `modules/trades/presentation/trade-actions.css` | Ações em lote e fluxo do modal |
| 2880–2960 | `modules/routine/presentation/premarket.css` | Hábitos e grade premarket |
| 2961–2991 | `modules/trades/presentation/error-chips.css` | Chips de erros do modal de trades |
| 2992–3146 | `modules/data-transfer/presentation/data-transfer.css` | Importação, backup e exportação |
| 3147–3168 | `styles/application-dialog.css` | Diálogo comum |
| 3169–3187 | `styles/navigation-footer.css` | Complemento tardio da navegação |
| 3188–3218 | `styles/workspace-grids.css` | Grids usados por estratégias, perfil e parceiros |
| 3219–3515 | `modules/study-hub/presentation/study-hub-native.css` | Contêiner nativo, abas e cards |
| 3516–3671 | `styles/workspace-summaries.css` | Resumos, status, notificações e ranking |
| 3672–3863 | `modules/documents/presentation/doc-browser-and-layout.css` | Shell/cards, pastas, entradas e metadados |
| 3864–4036 | `modules/documents/presentation/doc-editor-and-media.css` | Contexto, editor, toolbar, mídia e vazios |
| 4037–4151 | `modules/accounts/presentation/account-overview.css` | Cards e barras de risco |
| 4152–4278 | `modules/partners/presentation/partners.css` | Afiliados, suporte e QR |
| 4279–4291 | `styles/tag-cloud.css` | Complemento tardio das tags |
| 4292–4303 | `styles/page-motion.css` | Animação fade-up |
| 4304–4563 | `styles/responsive-desktop-tablet.css` | Media queries completas 1420, 1240 e 1080 |
| 4564–4879 | `styles/responsive-mobile.css` | Media queries completas 720 e 440 |
| 4880–5223 | `modules/study-hub/presentation/legacy-controls.css` | Escopo/reset legado, embedding e controles |
| 5224–5582 | `modules/study-hub/presentation/legacy-trade-sequence.css` | Família ts-* e controles compartilhados |
| 5583–5756 | `modules/study-hub/presentation/legacy-recovery-panels.css` | Família fm-*, recuperação, analytics e logs |
| 5757–6090 | `modules/study-hub/presentation/legacy-integration-overrides.css` | Tema integrado, dimensões e media queries finais |

## Contratos que impedem agrupamento automático por página

- `.modal-footer`: layout em 1423–1431, padding/borda em 2549–2553 e alinhamento em 2555–2558.
- `.doc-empty`: raio de 8px em 1462–1465 sobrescrito por 18px em 4031–4034.
- Calendário mini e página compartilham seletores em 2052–2088; alturas recebem regras posteriores.
- `#sidebar`: `height:100dvh` no bloco 1240 e `height:100vh` no bloco 1080. Não deduplicar como equivalentes.
- StudyHub nativo usa classes genéricas e recebe media queries gerais posteriores.
- Legado: todas as alternativas dos seletores estão sob `#studyHubLegacyApp`; manter especificidade e `.embed-mode`.
- Controles `.field`, `.btn`, `.tbl`, `.sec`, canvas e grids são sobrescritos entre ferramentas legadas.
  Carregar CSS somente da aba ativa mudaria a aparência atual.
- `.mrow`: duas colunas em 5753, cinco em 6011, três no media 1200 em 6074 e duas no media 720 em 6083.
- Há seletores por texto de `style`, como em 793/4624, e `.chart-wrap[style]`. Mover/reformatar inline styles pode mudar matching.
- Um import Google Fonts e 16 SVGs `data:`; nenhuma URL relativa encontrada. Preservar fontes e fallbacks existentes.

## Primeiro corte executado (G1)

Extraído o sufixo StudyHub 4880–6090 em quatro arquivos da tabela.
`styles.css` mantém o prefixo 1–4879; os quatro `<link>` vêm depois dele, nessa ordem.
Esse corte retira 1.211 linhas sem reorganizar regras anteriores. Nenhum arquivo novo ultrapassa 359 linhas.
Os blocos contêm controles compartilhados do legado: todos os quatro continuam carregados em todas as abas.

O smoke foi ampliado para as quatro abas e a baseline visual determinística foi capturada antes do corte.
Bytes concatenados preservados integralmente; resultados e limites em [progresso](refactoring-progress.md).
Depois repetir o método com prefixos/sufixos ou segmentos intermediários explicitamente ordenados;
não inserir todos os arquivos de feature depois de um `styles.css` residual que contenha sobrescritas tardias.

## Segundo corte executado (G2a, 2026-09-12)

Prefixo 1–699 extraído nos quatro destinos da tabela: foundation, shell-layout,
preferences-widgets e navigation-and-account-summary. Links nessa ordem antes do residual;
os quatro CSS G1 continuam depois dele. `styles.css`: 4.879 para 4.180 linhas.

Foundation mantém `@import` absoluto Google Fonts na primeira instrução. Nenhuma URL relativa no prefixo.
Preferences preserva o keyframe `cot-spin`; responsividade e complementos tardios permanecem no residual.
A regra agrupada com `.acct-pill`, `.tb-stat`, `.btn`, `.tab-btn`, `.mode-btn` continua global.
Não corrigir incidentalmente referências já indefinidas a `--border2`/`--cyan`.
O bloco de navegação tem 408 linhas: mantém sidebar, logo e resumo coesos; não foi subdividido por tamanho.

Proteção: fingerprint integral anterior preservado; runner shell cobre 15 páginas em três larguras e
10 estados do shell nos limites 440/720/1080/1240. Resultados e limites em [progresso](refactoring-progress.md).

## Terceiro corte executado (G2b, 2026-09-12)

Bloco histórico 700–945 em `src/styles/page-surfaces-and-headers.css` (246 linhas, 10.037 bytes).
Carrega entre navigation-and-account-summary e o residual. `styles.css`: 4.180 para 3.934 linhas;
encerra a extração em `.page-actions`, preservando `.btn` como início do próximo bloco.

34 regras completas, sem media query ou import. SVGs são `data:`; não há URL relativa a ajustar.
Mantidos os pseudo-elementos das superfícies e cabeçalhos, máscaras, animação `fade-up`,
seletores de espaçamento por inline style e overrides responsivos tardios.
Baseline preparada antes do corte: 211 casos, incluindo cinco abas de análise e seus filhos diretos.
O fingerprint do CSS permanece o mesmo, sem atualização de expectativa.

## Quarto corte executado (G2c)

Bloco histórico 946–1059 em `src/styles/page-actions.css`: 114 linhas, 2.183 bytes, 16 regras completas.
Link depois de superfícies/cabeçalhos e antes de `styles.css`, agora com 3.820 linhas.
Sem URL, import, media query ou keyframe. Overrides em 1080/440 permanecem no residual.
Preservados hover, foco, `filter`, tamanhos, flex, `color-scheme` e cores de opções dos selects.

Baseline ampliada antes do corte: 323 casos. Inclui filtragem/limpeza de datas por eventos reais,
hover de primary/ghost/ícone/limpeza e foco nos dois campos. Nenhuma mudança de handlers ou dados.
Fingerprint integral mantido; limites de controles nativos documentados em [tooling](tooling.md).

## Quinto corte executado (G2d)

Bloco histórico 1060–1359 em `src/styles/metric-cards-and-risk-insights.css`: 300 linhas.
Começa em `.metrics-row` e termina nas variantes de `.m-value`; residual inicia em `.dashboard-command-grid`.
Link após `page-actions.css`, antes de `styles.css`, agora com 3.520 linhas.
Grids, cards, tooltips no body e indicadores são apresentação comum; não há nova camada de domínio.
Overrides em 1420/1080/720 ficam no residual. Bytes, separadores e ordem integral preservados.

Baseline ampliada antes do corte: 358 casos, incluindo 1420±1, tons safe/warn/danger pelo renderer
existente e tooltips acima/abaixo/ocultos por eventos de mouse. Pseudo-elementos dos cards amostrados.
Cálculos, handlers e dados não alterados; limites da interação sintética em [tooling](tooling.md).

## Sexto corte executado (G2e)

Bloco histórico 1360–1520 em `src/styles/dashboard-and-card-layout.css`: 161 linhas/2.740 bytes, 23 regras completas.
Inicia em `.dashboard-command-grid`, termina em `.chart-wrap canvas`; residual começa em `.risk-command-grid`.
Link após métricas/risco e antes de `styles.css`, agora com 3.359 linhas. Sem URL, import ou media query no corte.
Layout do dashboard e containers/cabeçalhos comuns são apresentação; carga global e ordem mantidas.
Overrides em 1420/1240/1080/720/440 permanecem no residual; classes sem consumidor encontrado também são preservadas.

Baseline anterior ao corte: 378 casos. A tabela inferior entra no viewport em 17 larguras, com scroll horizontal real;
hover de card de gráfico em 390/1080/1440. Snapshot inclui scroll e estilos de overflow/scrollbars/align-self.
Dois trades não geram overflow vertical; `.board-card-sticky` não tem consumidor encontrado. Sem fixture artificial para esses estados.
Contrato integral de bytes permanece o mesmo; limites em [tooling](tooling.md).

## Sétimo corte executado (G2f)

Bloco histórico 1521–1842 em `src/modules/accounts/presentation/account-risk-and-cashflow.css`:
322 linhas/6.224 bytes, 48 regras completas. Inicia em `.risk-command-grid`, termina em `.account-cashflow-empty`;
residual começa em `.strategy-board` e mantém 3.037 linhas. Sem URL, import ou media query no corte.
Link após layouts do dashboard, antes do residual. Apresentação de contas usada no dashboard, setup e editor.
Override do grid até 1080px permanece no residual; `!important`, transição e pseudo-elementos preservados.
As 322 linhas formam um bloco contíguo de componentes da conta; não separar só pela contagem.

Baseline corrigida antes do corte: 407 casos. Tons de risco em 17 larguras, meta e caixa preenchido/vazio
em 390/1080/1440; armazenamento e dados em memória preservados pelos testes.
Badge-warn e risk-period-label sem consumidor encontrado permanecem no CSS, sem fabricar UI para validá-los.
Contrato integral de bytes mantido; falha corrigida no isolamento do runner e limites em [tooling](tooling.md).

## Oitavo corte executado (G2g)

Bloco histórico 1843–2043 em `src/modules/analytics/presentation/strategy-comparison.css`:
201 linhas/3.455 bytes, 30 regras completas. De `.strategy-board` a `.strategy-compare-winner`;
residual começa em `.dash-calendar-mini` e mantém 2.836 linhas. Sem URL, import ou media query no corte.
Link após risco/caixa, antes do residual. Apresentação de analytics usada no dashboard, central e análises.
Overrides de `.strategy-board-large` e media queries 1420/720 ficam na posição original.

Baseline anterior ao corte: 448 casos. Comparação completa em 17 larguras; ranking positivo/negativo/vazio,
limpeza, seleção parcial/repetida, troca A/B, foco e gráficos em três larguras.
Seletores usam `change` real; cálculos, dados persistidos e APIs não mudam. Limites em [tooling](tooling.md).

## Nono corte executado (G2h)

Bloco histórico 2044–2284 em `src/modules/calendar/presentation/calendar-grids.css`:
241 linhas/4.420 bytes, 32 regras completas. De `.dash-calendar-mini` a `.cal-biweek-total`;
residual começa em `.tbl` e mantém 2.595 linhas. Sem URL, import ou media query no corte.
Link após comparação de estratégias, antes do residual. Apresentação de calendário compartilhada com dashboard.
Overrides 1080/720/440 e controles tardios permanecem na posição original; transições e ellipsis preservados.

Baseline anterior ao corte: 509 casos. `week`/`biweek` em 17 larguras; `month` via API, hover de mini/dia,
clique do mini, detalhes com ganho/perda/vazio, ano seguinte/anterior e fevereiro bissexto em três larguras.
Rolagem e dimensões de `calGridWrap` entram no snapshot; limites em [tooling](tooling.md).

## Décimo corte executado (G2i)

Bloco histórico 2285–2432 em `src/modules/trades/presentation/trade-tables.css`:
148 linhas/2.411 bytes, 23 regras completas. De `.tbl` a `.btn-link-warn`;
residual começa em `.form-grid` e mantém 2.447 linhas. Sem URL, import ou media query no corte.
Link após calendário, antes do residual. Carga global preserva tabelas em outras páginas e badge do resumo da conta.
Seletores, sticky, `!important`, estados e overrides tardios mantêm a ordem original.

Baseline anterior ao corte: 559 casos. Diário com scroll em 17 larguras; ordenação por P/L,
seleção/limpeza, hover/foco, vazio, badges e incompletos em três larguras.
Vinte operações temporárias exercitam sticky com scroll vertical no dashboard; dados são restaurados.
A fixture define flags de incompletude para caracterizar apresentação, sem validar sua recomputação.
Limites em [tooling](tooling.md).

## Décimo primeiro corte executado (G2j)

Bloco histórico 2433–2523 em `src/styles/form-fields.css`:
91 linhas/1.544 bytes, 15 regras completas. De `.form-grid` a `.field-hint`;
residual começa em `.modal-overlay` e mantém 2.356 linhas. Sem URL, import ou media query no corte.
Link após tabelas, antes do residual. Carga global preserva campos em operações, simulação, contas, parceiros e StudyHub.
Overrides tardios e responsivos mantêm a posição original; `.field-hint` sem consumidor encontrado permanece intacto.

Baseline anterior ao corte: 577 casos. Seis estados adicionais em 390/1080/1440 cobrem foco em texto,
número com unidade, readonly, select e textarea vazio/preenchido. Grids continuam amostrados nas 17 larguras.
Valores são somente de apresentação; contas, trades e storage permanecem iguais. Limites em [tooling](tooling.md).

## Décimo segundo corte executado (G2k)

Bloco histórico 2524–2603 em `src/styles/modal-and-tabs.css`:
80 linhas/1.412 bytes, 10 regras completas. De `.modal-overlay` a `.tab-btn.active`;
residual começa em `.calendar-toolbar` e mantém 2.276 linhas. Sem URL, import ou media query no corte.
Link após campos, antes do residual. Carga global preserva quatro modais e treze botões de aba.
A segunda regra de `.modal-footer` mantém posição/especificidade; overrides responsivos e do StudyHub continuam tardios.

Baseline anterior ao corte: 595 casos. Seis estados adicionais em 390/1080/1440 cobrem modal rolável,
footer simples, diálogo com input e abas de importação, calendário e StudyHub. Trade/account e limites 720±1
permanecem cobertos pelos estados anteriores. Dados e storage não mudam. Limites em [tooling](tooling.md).

## Décimo terceiro corte executado (G2l)

Bloco histórico 2604–2630 em `src/modules/calendar/presentation/calendar-toolbar.css`:
27 linhas/394 bytes, cinco regras completas. De `.calendar-toolbar` a `.calendar-mode-btn`;
residual começa em `.upload-zone` e mantém 2.249 linhas. Sem URL, import ou media query no corte.
Link após modais/abas, antes do residual. Consumidor único: toolbar da página de calendário.
O utility `.gap-8` aparece depois e mantém gap efetivo de 8px; não reorganizar nem “corrigir” a cascata.

Baseline anterior ao corte: 598 casos. Cenário dedicado em 390/1080/1440 cobre foco do picker,
padding, dimensões e tipografia computados; week/biweek e responsividade continuam cobertos nas 17 larguras.
Dados e storage não mudam. Limites em [tooling](tooling.md).

## Décimo quarto corte executado (G2m)

Bloco histórico 2631–2671 em `src/styles/upload-zone.css`: 41 linhas/734 bytes e seis regras
completas. De `.upload-zone` a `.upload-sub`; residual começa em `.emotion-grid` e mantém
2.208 linhas. Link após a toolbar do calendário e antes do residual.

Nenhum consumidor ativo foi encontrado para as classes globais; fixture descartável caracteriza
base, hover, `.drag`, input oculto, ícone e textos em 390/1080/1440px. Overrides scoped do
StudyHub continuam carregados depois e o JavaScript de drop permanece intacto.

## Décimo quinto corte executado (G2n)

Bloco histórico 2672–2700 em `src/modules/trades/presentation/emotion-picker.css`:
29 linhas/515 bytes e quatro regras completas. De `.emotion-grid` a `.emotion-name`; residual
começa em `.tag-list` e mantém 2.179 linhas. Link após upload, antes do residual.

Nenhum consumidor ativo foi encontrado. Fixture descartável caracteriza idle, pseudo-hover e
`.selected` em 390/1080/1440px, incluindo grid, cores, dimensões e tipografia sem mutar dados.

## Décimo sexto corte executado (G2o)

Bloco histórico 2701–2779 em `src/styles/tag-editor.css`: 79 linhas/1.375 bytes e oito
conjuntos de regras completos. De `.tag-list` a `.tag-add`; residual começa em `.alert` e
mantém 2.100 linhas. Link após o picker de emoções, antes do residual.

Consumidores reais no Setup e Profile cobrem tags editáveis e somente leitura, contagem, botões,
hovers e wrap; fixture descartável preserva `.tag-add`, que não possui consumidor atual.

## Décimo sétimo corte executado (G2p)

Bloco histórico 2780–2831 em `src/styles/alerts-and-utilities.css`: 52 linhas/672 bytes e
dez regras completas. De `.alert` a `.w-full`; residual começa em `#bulkBar` e mantém
2.048 linhas. Link após tags, antes do residual.

Alertas e separadores reais de Import/Setup/Trades e headers responsivos cobrem os consumidores;
fixture descartável cobre `.w-full`, sem consumidor encontrado, e o tom warning isolado.

## Décimo oitavo corte executado (G2q)

Bloco histórico 2832–2879 em `src/modules/trades/presentation/trade-actions.css`:
48 linhas/739 bytes e sete regras completas. De `#bulkBar` a `.trade-modal-flow-actions`;
residual começa em `.pm-check` e mantém 2.000 linhas. Link antes do residual.

Estados reais/isolados cobrem barra oculta, seleção visível e fluxo do modal sem persistir dados.

## Décimo nono corte executado (G2r)

Bloco histórico 2880–2991 separado por consumidor: `src/modules/routine/presentation/premarket.css`
com 81 linhas/1.415 bytes e onze regras; `src/modules/trades/presentation/error-chips.css`
com 31 linhas/624 bytes e quatro regras. O residual começa em `.backup-action-grid` e mantém
1.888 linhas. Links adjacentes antes do residual preservam a cascata.

Grade, hover e estado concluído do premarket, além dos chips ocioso, hover e selecionado,
são cobertos em três larguras sem persistir dados. `.pm-check` permanece por compatibilidade,
embora não tenha consumidor localizado.

## Vigésimo corte executado (G2s)

Bloco histórico 2992–3146 em `src/modules/data-transfer/presentation/data-transfer.css`:
155 linhas/2.612 bytes e 23 regras completas. De `.backup-action-grid` a `.export-action-row .btn`;
residual começa em `.app-dialog` e mantém 1.733 linhas. Link após chips de erro, antes do residual.

Abas reais de importação/exportação são caracterizadas em nove larguras, incluindo 720±1 e
1420±1. Dados e storage permanecem intactos; uploads, downloads e restauração não são disparados.
Overrides responsivos continuam no residual.

## Vigésimo primeiro corte executado (G2t)

Bloco histórico 3147–3168 em `src/styles/application-dialog.css`: 22 linhas/291 bytes e
quatro regras completas. De `.app-dialog` a `.app-dialog-error`; residual começa em
`.sidebar-footer` e mantém 1.711 linhas. Link após transferência de dados, antes do residual.

Input/foco, confirmação sem input e mensagem multilinha, além de erro de validação por
valor incorreto, são caracterizados em três larguras. Nenhuma ação de confirmação é executada;
estado do diálogo é restaurado e contas/trades/storage são conferidos.

## Vigésimo segundo corte executado (G2u)

Bloco histórico 3169–3187 em `src/styles/navigation-footer.css`: 19 linhas/258 bytes e
três regras completas. De `.sidebar-footer` a `.nav-item-meta`; residual começa em
`.strategy-hub-layout` e mantém 1.692 linhas. Link após diálogo comum, antes do residual.

Hover, rolagem do rodapé e seleção ativa/idempotente de Profile são caracterizados em três
larguras. A regra anterior de `margin-top:auto` permanece em `navigation-and-account-summary.css`.
Dados/storage são conferidos; a transição entre páginas não é validada por esse cenário.

## Vigésimo terceiro corte executado (G2v)

Bloco histórico 3188–3218 em `src/styles/workspace-grids.css`: 31 linhas/503 bytes e
seis regras completas. De `.strategy-hub-layout` a `.partner-grid`; residual começa em
`.study-module-grid` e mantém 1.661 linhas. Link após rodapé, antes do residual.
Seletores agrupados já compartilham layout entre estratégias, perfil e parceiros;
permanecem em apresentação comum, sem duplicação por página.

Baseline pré-corte: 715 casos. Grids reais em 390/1080/1419/1420/1421/1440px,
incluindo as duas grades do perfil. Overrides de uma coluna até 1420px ficam no residual;
a margem zero do último filho da página continua em superfícies/cabeçalhos.
`partnersGrid` permanece oculto pelo renderer; dados e storage são conferidos.

## Vigésimo quarto corte executado (G2w)

Bloco histórico 3219–3515 em `src/modules/study-hub/presentation/study-hub-native.css`:
297 linhas/5.774 bytes e 43 regras completas. De `.study-module-grid` ao mínimo de altura
dos cards em `.study-native-grid`; residual começa em `.hero-metric-grid` com 1.364 linhas.
Link após grids compartilhados, antes do residual; sem import, media query ou URL relativa.
Overrides responsivos até 1420/1080/720px continuam depois do bloco, sem reordenação.

Baseline pré-corte: 787 casos, incluindo 72 cenários reais de abas/root em oito larguras.
Quatro seleções, hover ativo/inativo, foco, rolagem horizontal e sticky são exercitados;
snapshot inclui offsets de rolagem. Classes de grid/card/range do markup nativo não montado
permanecem protegidas pela identidade integral dos bytes, sem UI sintética.
Nenhuma mudança na montagem legada, renderers, cálculos ou storage.

## Vigésimo quinto corte executado (G2x)

Bloco histórico 3516–3671 em `src/styles/workspace-summaries.css`: 156 linhas/2.895 bytes,
25 regras completas. De `.hero-metric-grid` ao padding de `.strategy-board-large .strategy-row`;
residual começa em `.doc-shell` com 1.208 linhas. Link após StudyHub nativo, antes do residual.
Estilos compartilhados por perfil, notificações, análises e central de estratégias;
sem import, media query ou URL relativa. Hero de uma coluna e status com wrap até 720px
continuam no residual, na ordem anterior.

Baseline pré-corte: 823 casos, incluindo 36 novos cenários em seis larguras.
Hero/compact reais do perfil; renderers existentes para status/chips em quatro tons,
neutro, vazio, valores e textos longos; ranking positivo/negativo com padding ampliado.
Fixture altera somente markup dos consumidores existentes e o restaura antes do próximo caso;
dados/config/storage são conferidos. Nenhuma ação persistente é executada.

## Vigésimo sexto corte executado (G2y)

Bloco histórico 3672–4036 dividido em dois componentes contíguos de apresentação:
`doc-browser-and-layout.css`, 192 linhas/3.386 bytes/24 regras (3672–3863), e
`doc-editor-and-media.css`, 173 linhas/3.269 bytes/20 regras (3864–4036).
O segundo começa em `.doc-trade-context`; metadados agrupados permanecem juntos.
Links adjacentes após resumos compartilhados; residual começa em `.account-overview-grid`
com 843 linhas. Sem import, media query ou URL relativa; overrides responsivos permanecem tardios.
O mapa passa a 40 blocos: 34 extraídos e seis residuais. Carga global mantém 35 links CSS.

41 casos direcionados passaram antes do corte. Matriz v25 tem 864 casos: geral em 11
larguras, incluindo 1080/1240/1420±1; outros dez estados em 390/1080/1440px.
Renderers e seleção reais cobrem notas gerais/diárias, trades WIN/LOSS/R ausente,
vazio, editor focado, toolbar/pasta/entrada em hover e scroll de lista/editor/mídia.
Fixtures restauram referências de configuração/trades/premarket e conferem dados/storage;
nenhum handler persistente é executado. Referência integral usa cópia imutável de `c34344e`
com o mesmo runner v25; capturas antes/depois executadas em perfis isolados independentes.
Resultado: 864 estados idênticos; 48 imagens/197 pixels dentro da tolerância existente,
zero erros de console/runtime ou assets ausentes; revisão independente sem bloqueios.

## Vigésimo sétimo corte executado (G2z)

Bloco histórico 4037–4151 em `src/modules/accounts/presentation/account-overview.css`:
115 linhas/2.150 bytes e 16 regras completas. Começa em `.account-overview-grid`, termina
em `.mini-progress > span`; residual começa em `.partner-card` com 728 linhas.
Link após editor/mídia de documentos, antes do residual; sem import, media query ou URL relativa.
Regras comuns anteriores para o card/pseudo-elemento permanecem antes do novo link;
overrides 1420/720px permanecem no residual. Mapa: 35 blocos extraídos e cinco residuais;
36 links CSS globais mantêm a cascata.

17 casos direcionados passaram antes do corte: uma conta em oito larguras (390,
719/720/721, 1419/1420/1421, 1440px); duas contas, vazio e nome longo em 390/720/1440px.
`renderAccountsPage` preenche o contêiner real. A fixture restaura a referência de `accounts`
e confere memória/storage; não dispara editar/selecionar/salvar. Em largura estreita, o ponto
de cor pode encolher com um título longo pelo flex layout existente; a expectativa do teste
foi ajustada antes do corte. Matriz v26: 881 casos. Referência integral de cópia imutável do
commit `0bc5a44` com o mesmo runner/helper; capturas em perfis isolados independentes.
Resultado: 881 estados idênticos; 49 imagens/279 pixels dentro da tolerância existente,
zero erros de console/runtime ou assets ausentes; revisão independente sem bloqueios.
Detalhes em [tooling](tooling.md).

## Vigésimo oitavo corte executado (G2aa)

Bloco histórico 4152–4278 em `src/modules/partners/presentation/partners.css`:
127 linhas/2.076 bytes e 21 regras completas. Começa em `.partner-card`, termina em
`.partner-support-actions`; residual começa em `.tag-cloud-block` com 601 linhas.
Link após visão geral de contas, antes do residual; sem import, media query ou URL relativa.
Regras comuns anteriores de cards e overrides tardios 1420/720px permanecem na posição
original. Mapa: 36 blocos extraídos e quatro residuais; 37 links CSS globais.

32 casos direcionados passaram antes do corte: vazio, dois afiliados e QR, somente afiliado,
somente QR em oito larguras (390, 719/720/721, 1419/1420/1421, 1440px).
`renderPartnersPage` preenche consumidores reais; fixture restaura configuração e confere
memória/storage, sem acionar salvar/upload/remover. `.partner-card*`, preview/mono legados
e variante da imagem pequena seguem preservados por identidade de bytes, sem consumidor ativo.
Matriz v27: 913 casos. Referência integral de cópia imutável do commit `f1d90a3` com
runner/helper idênticos; capturas em perfis isolados independentes. Resultado: 913 estados
idênticos; 48 imagens/254 pixels dentro da tolerância existente, zero erros de console/runtime
ou assets ausentes; revisão independente sem bloqueios. Detalhes em [tooling](tooling.md).

## Validação exigida

1. Comparar bytes concatenados dos blocos com o CSS anterior, ou sequência integral de regras e contexto das media queries.
2. Cada regra deve aparecer uma vez e na mesma posição relativa; preservar seletores, valores, `!important` e keyframes.
3. Conferir ordem dos links, ausência de 404, fontes e fallback. Não introduzir `@layer` ou CSS carregado por página.
4. Capturar telas antes/depois com fixture, viewport e fontes estáveis; controlar gráficos, aleatoriedade e animações.
5. Comparar estilos computados/geometria dos elementos afetados acima/no/abaixo dos breakpoints aplicáveis.
6. Cobrir sidebar, modais, menus, tabs, tooltip, hover/focus, editor, calendário e overflow do StudyHub conforme o lote.
7. Rodar testes existentes e diff; registrar que testes JS não comprovam equivalência visual.

Metas de tamanho são sinais de revisão. Blocos de 300–408 linhas acima têm responsabilidade e ordem
identificadas; um corte adicional exige limite de regra seguro e revisão dos consumidores.
