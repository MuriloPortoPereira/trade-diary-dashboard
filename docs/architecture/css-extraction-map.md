# Mapa de extração do CSS

Análise de 2026-09-11 sobre `5c9859f`. Intervalos abaixo referem-se à baseline.
G1 e G2a executados: quatro `legacy-*.css` e quatro destinos do prefixo 1–699 existem.
Demais destinos continuam propostos; `styles.css` residual contém as linhas históricas 700–4879.
`styles.css`: 6.090 linhas; 1.189 regras qualificadas no nível superior, 1.312 incluindo media queries.
Há 11 media queries, dois keyframes, um `@import`, 96 seletores exatos repetidos no nível superior
e 21 ocorrências de `!important`. Parsing com `tinycss2` disponível no ambiente não encontrou
erros sintáticos; isso não comprova aparência. Serena atende TypeScript; CSS foi inspecionado por busca e parsing.

## Fronteiras contíguas

Os intervalos cobrem o arquivo inteiro, sem cortar regras ou media queries. Nomes são relativos a `src/`.
A ordem da tabela é a ordem da cascata. São fronteiras possíveis, não 38 arquivos obrigatórios em um único lote.
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
| 2880–2991 | `modules/routine/presentation/premarket-and-error-chips.css` | Hábitos e chips; revisar consumidores antes de separar internamente |
| 2992–3146 | `modules/data-transfer/presentation/data-transfer.css` | Importação, backup e exportação |
| 3147–3168 | `styles/application-dialog.css` | Diálogo comum |
| 3169–3187 | `styles/navigation-footer.css` | Complemento tardio da navegação |
| 3188–3218 | `styles/workspace-grids.css` | Grids usados por estratégias, perfil e parceiros |
| 3219–3515 | `modules/study-hub/presentation/study-hub-native.css` | Contêiner nativo, abas e cards |
| 3516–3671 | `styles/workspace-summaries.css` | Resumos, status, notificações e ranking |
| 3672–4036 | `modules/documents/presentation/documents.css` | Lista, editor, mídia e estados vazios |
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
