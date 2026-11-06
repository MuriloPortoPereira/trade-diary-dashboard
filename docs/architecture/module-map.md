# Mapa de módulos

Catálogo iniciado na baseline `ab0cb63`, atualizado com os limites físicos extraídos.
Localizar símbolos com Serena antes de ler trechos; os resíduos legados permanecem em `app.js`.

HTML de autoria: `src/app/presentation/shell/index.fragments.json` lista, em ordem, duas fontes do shell
e quinze páginas nas respectivas features. `scripts/build-index.cjs` gera `index.html` versionado;
`tests/index-composition.test.cjs` protege sincronização, bytes e páginas. Ver [ADR-005](adr/005-static-shell-composition.md).

| Feature | Entradas/símbolos | Dependências atuais |
|---|---|---|
| Shell/navegação | `src/app/application/bootstrap-app.js`; `src/app/presentation/navigation.js` | Carga inicial, IDs `page-*`, funções globais, contas e estado |
| Operações | `src/modules/trades/application/trade-workflows.js`; `renderLog` | Formulário, `trades`, contas, persistência, seleção e métricas |
| Dados demonstrativos | `src/modules/trades/application/demo-data.js` | Geração determinística, importação Tickmill, estratégias, confirmação e persistência |
| Contas/risco | `accounts/application/account-risk-workflows.js`; `presentation/{account-form,risk-setup-page}.js`; `normalizeAccount` em `app.js` | `accounts`, trades, calendário atual, cashflows, formatação |
| Dashboard | `renderDashboard`, `calcMetrics`, `renderRiskBoard` | Conta ativa, filtros, Chart.js, DOM |
| Estratégias/análises | `analytics/application/strategy-analysis.js`; renderers em `analytics/presentation/` | Queries sem DOM; conta/métricas/formatação globais transitórias; Chart.js na apresentação |
| Calendário/rotina | `calendar/presentation/calendar-page.js`; `routine/presentation/premarket-page.js` reúne renderer e controles | Trades, `preMarketData`, datas, save e helpers globais |
| Psicologia | `renderPsych`, `renderStatsPsych`, `buildHesitationStats` | Campos subjetivos das operações e gráficos |
| Simulação principal | `simulation/domain/calculate-simulation-{sizing,projection}.js`; `presentation/simulation-panel.js` | Domínio numérico/RNG; painel consulta conta/configuração e formata/renderiza; wrappers mantidos |
| Importação | `parseMT5Rows`, `parseGenericTradeRows`, `parseMT5HTML`, `confirmImport` | FileReader, datas, IDs, normalizadores, contas e `save` |
| Backup/exportação | `createBackupPayload`, `restoreBackupData`, `exportJSON`, `buildTradesCSV` | Estado global, JSON, CSV, Blob, confirmação e storage |
| StudyHub nativo | `src/modules/study-hub/presentation/study-hub-page.js`: `renderStudyHub`, wrappers de cálculo, `syncStudyHubLegacyInputs` | Estado `studyHubState`, conta, risco, domínio nativo, DOM legado e `window.sh_*` |
| StudyHub legado | `presentation/study-hub-legacy-runtime.js`: montagem/pontes; `presentation/study-hub-{propfirm,plan,tradesim,mental}.js`: ferramentas isoladas | Estado privado por ferramenta, Chart.js, helpers puros no domínio e storage em infrastructure |
| Intraday adicional | `src/modules/study-hub/presentation/study-hub-intraday.js`: `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` | IIFE própria; wrappers de `sh_buildIntraday`/`sh_tsRunAll` |
| Documentos/imagens | `documents/presentation/{documents-page,document-rendering-helpers}.js`: workspace e mídia | Trades, rotina, `config.generalDocs`, FileReader, DOM; dependências globais transitórias |
| Parceiros | `partners/presentation/partners-page.js`: controller completo | `config.partnerHub`, links, imagens, clipboard |
| Perfil/notificações | `renderProfilePage`, `renderNotificationsPage`, `buildOperationalAlerts` | Conta ativa, risco e histórico; sem autenticação |
| Configuração/storage | `renderSetup`, `saveConfig`, `save`, `load` | Globals, normalização, localStorage |
| Idiomas/cotação | `TRANSLATIONS`, `applyLanguage`; `src/modules/preferences/infrastructure/exchange-rate.js` | DOM, storage, AwesomeAPI; cotação também duplicada no legado |

## Fronteiras de integração que devem permanecer compatíveis

- `index.html`: estrutura e chamadas inline dos símbolos públicos.
- `app.js`: ordem de bootstrap, globals de apresentação e estado ainda legado.
- CSS base/shell/preferências, superfícies/cabeçalhos, ações, CSS responsivos e quatro CSS StudyHub: classes/IDs e ordem da cascata.
- `window.sh_*`: ponte pública para funções privadas do IIFE legado.
- JSON de backup e chaves localStorage: contrato de dados existente.

## Fronteiras físicas extraídas

Registro histórico por lote; caminhos e contagens abaixo refletem a extração original. Para editar o código atual, usar as tabelas no [mapa compacto](project-map.md), que já incluem as consolidações por workspace.

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/study-hub/application/study-hub-state.js` | Defaults/merge permissivo nativo; duas APIs globais/61 linhas; defaults de simulação compartilhados permanecem dependência de aplicação |
| `src/modules/study-hub/domain/study-hub-calculations.js` | Checklist, RNG, snapshots, simulação, helpers PropFirm/plano/mental puros; namespace/127 linhas |
| `src/modules/study-hub/presentation/study-hub-page.js` | Página nativa coesa: metadata, formulários, markup, renderers, pontes e wrappers globais; 759 linhas |
| `tests/study-hub-native.test.cjs` | Estado/backups parciais, parsing, persistência real, refresh, eventos, abas, cálculo, seed e isolamento/carga |
| `src/modules/study-hub/presentation/study-hub-legacy-runtime.js` | Montagem, shell, tooltips e pontes; 233 linhas/11.187 bytes; consome template clássico pré-carregado |
| `src/modules/study-hub/presentation/templates/{propfirm,plan,tradesim,mental}.html` | HTML de autoria por ferramenta; 352/580/310/167 linhas, ordem e texto preservados |
| `src/modules/study-hub/presentation/study-hub-template.js` | Asset gerado/versionado de distribuição; dados clássicos síncronos, não editar diretamente |
| `scripts/build-study-hub-template.cjs` | Geração determinística sem dependências; --check detecta divergência sem escrever |
| `tests/study-hub-template.test.cjs` | Montagem com fingerprint, módulos/handlers, sincronização do asset e escaping do gerador |
| `src/modules/study-hub/presentation/study-hub-propfirm.js` | Factory PropFirm privado, callbacks e 12 funções para as pontes do runtime; 703 linhas |
| `src/modules/study-hub/presentation/study-hub-plan.js` | Factory plano privado, ciclos, diário, projeções, cotação e callbacks; 394 linhas/21 funções para pontes |
| `src/modules/study-hub/presentation/study-hub-tradesim.js` | Factory TradeSim privado, cenários, Monte Carlo, bindings e resize; 627 linhas/cinco funções para pontes |
| `src/modules/study-hub/presentation/study-hub-mental.js` | Factory mental privado, histórico, analytics, exportação e callbacks; 423 linhas/dez funções para pontes |
| `tests/study-hub-tools.test.cjs` | Restauração, IO, bindings, timers, resize, histórico/exportação, helpers puros e isolamento |
| `src/modules/study-hub/infrastructure/study-hub-storage.js` | IO das cinco chaves privadas, sem unificar com tl_*; dez operações/12 linhas |
| `tests/study-hub-propfirm.test.cjs` | Criação adiada, sizing/charts, restauração, CSV/JSON, falhas, exportação e regras puras |
| `tests/study-hub-storage.test.cjs` | Chaves, defaults, JSON/raw reads, round-trip e propagação de erros |
| `src/modules/study-hub/presentation/study-hub-intraday.js` | Controles, projeções e wrappers do intraday; 306 linhas |
| `tests/study-hub-runtime.test.cjs` | Montagem única, pontes, isolamento, navegação, limites/projeções intraday e carga clássica |
| `src/modules/simulation/domain/calculate-simulation-sizing.js` | Cálculo numérico puro; sem DOM, storage ou framework |
| `src/app/infrastructure/app-state-storage.js` | save e leitura bruta das seis chaves principais; 17 linhas, estado global transitório |
| `src/app/application/load-app-state.js` | load/normalização via contrato de leitura bruta; 17 linhas, sem storage direto |
| `tests/app-state-storage.test.cjs` | Caracterização de ordem, seis formatos, defaults, round-trip, falhas parciais e carga |
| `tests/simulation-sizing.test.cjs` | Caracterização dos valores/defaults e regressões do cálculo |
| `src/modules/simulation/presentation/simulation-panel.js` (campos incorporados em G7e) | Sincronização dos percentuais e demais controles da simulação no painel coeso |
| `tests/simulation-sizing-fields.test.cjs` | Caracterização de conta, fallbacks, conversão, projeções, retorno e carga |
| `src/modules/simulation/presentation/simulation-panel.js` | Snapshot, seleção de conta e renderer do painel; quatro funções/81 linhas |
| `tests/simulation-panel.test.cjs` | Caracterização de snapshot, reset, modos manual/conta, painel, plano, gráfico e carga |
| `src/modules/accounts/presentation/account-form.js` | Abertura/edição do formulário, cashflows temporários e alternância do tipo; cinco funções/53 linhas |
| `tests/account-form.test.cjs` | Caracterização de defaults, edição, cashflows, tipo e ordem de carga do formulário |
| `src/app/presentation/app-dialog.js` | Diálogo comum, confirmação, notice e prompt; seis funções/60 linhas |
| `tests/app-dialog.test.cjs` | Caracterização do DOM, estado, callbacks, validação, fallbacks nativos e carga |
| `src/modules/trades/presentation/trade-log-controls.js` | Ordenação, período e seleção visual do diário; cinco funções/43 linhas |
| `tests/trade-log-controls.test.cjs` | Caracterização de indicadores, datas, checkboxes, linhas, seleção e carga |
| `src/app/presentation/navigation.js` | Refresh, sidebar e troca de página; três funções/29 linhas |
| `tests/navigation.test.cjs` | Caracterização de despacho, efeitos compartilhados, classes, sidebar e carga |
| `src/modules/trades/presentation/trade-form.js` | Formulário coeso: disciplina, reset, projeção, cálculos, opções, conta, duração e imagens; 11 funções/249 linhas |
| `tests/trade-form-options.test.cjs` | Caracterização de opções, campos opcionais, conta, erros, efeitos e carga |
| `src/app/presentation/modal-controller.js` | Abertura/fechamento dos modais e coordenação das apresentações; duas funções/27 linhas |
| `tests/modal-controller.test.cjs` | Caracterização de bloqueio, trade novo/edição, contas, importação, fechamento e carga |
| `tests/trade-form-account-context.test.cjs` | Caracterização de conta/fallback, campos, resumo, símbolo, mercado e carga |
| `src/modules/trades/domain/trade-timing.js` | Factory puro de horário, duração e agregações temporais; 115 linhas |
| `tests/trade-timing.test.cjs` | Caracterização de formatos, virada do dia, inválidos, médias, grupos, wrappers e isolamento |
| `src/modules/analytics/domain/calculate-trade-metrics.js` | Métricas puras de resultado, drawdown, índices e streaks; 53 linhas |
| `tests/trade-metrics.test.cjs` | Caracterização de capital, grupos, ordem, Infinity, drawdown, streaks, índices, wrapper e isolamento |
| `src/modules/accounts/domain/calculate-cashflow-totals.js` | Totais puros de depósitos, retiradas e líquido; 14 linhas |
| `tests/account-cashflow.test.cjs` | Caracterização de lookup, parsing, tipos, Infinity, erros, imutabilidade, capital, wrapper e isolamento |
| `src/modules/accounts/domain/calculate-risk-limits.js` | Limites, perdas e excessos monetários de risco; 30 linhas |
| `tests/account-risk-limits.test.cjs` | Caracterização de defaults, capital, escopos, excessos, zero, isolamento e carga |
| `src/modules/accounts/domain/calculate-goal-cycle.js` | Cálculo puro de metas cíclicas e progresso; 17 linhas |
| `tests/account-goal-cycle.test.cjs` | Caracterização de patamares, precisão, cashflow, fallback, isolamento e carga |
| `src/modules/accounts/domain/calculate-balance-drawdown.js` | Saldo, pico e drawdown puros sobre trades ordenados; 18 linhas |
| `tests/account-balance-drawdown.test.cjs` | Caracterização de cashflow, ordem, perdas, coerção, isolamento e carga |
| `src/modules/accounts/domain/calculate-risk-period-pnl.js` | Filtros temporais e P/L de risco com datas explícitas; 42 linhas |
| `tests/account-risk-period-pnl.test.cjs` | Caracterização de limites de data, períodos, P/L textual, isolamento e carga |
| `src/modules/accounts/application/account-risk-workflows.js` | Composição do estado financeiro/risco e análise de stops/taxas; três APIs globais coesas/183 linhas |
| `tests/account-risk-workflows.test.cjs` | Caracterização integrada de cashflow, limites, drawdown, metas, períodos, taxas, agrupamentos e carga clássica |
| `src/app/presentation/topbar.js` | Valor responsivo, conta ativa e estatísticas da topbar; três funções coesas/45 linhas |
| `tests/topbar-statistics.test.cjs` | Caracterização de datas, percentuais, tons, meta, alvos opcionais, densidade e carga |
| `src/modules/data-transfer/infrastructure/serialize-trades-csv.js` | Formato CSV: colunas e escaping; recebe dados explícitos, sem executar IO |
| `tests/trades-csv.test.cjs` | Caracterização do CSV, wrappers/default, consumidor de exportação e ordem de scripts |
| `src/modules/data-transfer/infrastructure/split-delimited-rows.js` | Normalização e divisão de linhas delimitadas para importação; 16 linhas |
| `tests/split-delimited-rows.test.cjs` | Caracterização de delimitadores, aspas, vazios, consumidor, isolamento e carga |
| `src/modules/data-transfer/infrastructure/normalize-tabular-values.js` | Normalização de números, datas, células e cabeçalhos; quatro globals intactos, 48 linhas, sem IO/estado da aplicação |
| `tests/normalize-tabular-values.test.cjs` | Caracterização de formatos, coerções, datas/Excel, cabeçalhos, consulta dinâmica, erros e carga |
| `src/modules/data-transfer/infrastructure/parse-tabular-trades.js` | Parsers MT/genérico, seleção de formato e texto MT4; quatro globals, 143 linhas, dependências legadas transitórias |
| `tests/parse-tabular-trades.test.cjs` | Caracterização de layouts, aliases, números/datas, duplicados, limites, delegação, erros e carga |
| `src/modules/data-transfer/infrastructure/read-trade-report.js` | Loader SheetJS e extração DOM de relatórios HTML; dois globals, 12 linhas, IO sob chamada |
| `tests/trade-report-import.test.cjs` | Caracterização de roteamento, callbacks, HTML/XLSX, opções/erros, conta, pendências e carga |
| `src/modules/data-transfer/infrastructure/backup-format.js` | Montagem, validação e contagens puras do formato de backup; 33 linhas |
| `tests/backup-format.test.cjs` | Caracterização de contagens, chaves, erros, apresentação, isolamento e carga |
| `tests/backup-payload.test.cjs` | Caracterização de versão, ordem, relógio, referências e globals atuais |
| `src/modules/data-transfer/application/restore-backup.js` | Coordenação transitória da restauração; global intacto, 13 linhas, estado/adaptadores ainda globais |
| `tests/restore-backup.test.cjs` | Caracterização de restauração parcial/completa, referências, falhas parciais e carga |
| `src/modules/data-transfer/application/select-export-trades.js` | Seleção de operações para exportação; dois globals, 25 linhas, conta/adaptador ainda legados |
| `src/modules/data-transfer/infrastructure/download-text-file.js` | Adaptador de download do navegador; uma função global, 9 linhas |
| `src/modules/data-transfer/presentation/export-downloads.js` | Ações JSON/CSV e leitura de controles; sete globals, 45 linhas |
| `tests/export-downloads.test.cjs` | Caracterização de download, JSON, filtros, ações CSV, datas, falhas e carga clássica |
| `src/modules/data-transfer/presentation/import-workflow.js` | Upload/roteamento de JSON/CSV/MT/HTML/XLSX, preview e confirmação; nove handlers globais, 122 linhas; duplicidade delegada ao domínio |
| `tests/import-workflow.test.cjs` | Caracterização de JSON/CSV/XLSX/MT4, callbacks, preview, duplicados, falhas e carga |
| `src/modules/data-transfer/domain/import-trade-rules.js` | Campos faltantes e predicado de duplicidade com resolvedor explícito; 30 linhas, sem IO/estado da aplicação |
| `src/modules/data-transfer/application/prepare-trade-import.js` | Preparação, estado pendente e chave de posição; cinco globals intactos, 60 linhas |
| `tests/import-preparation.test.cjs` | Caracterização de defaults, timestamps, arrays, referências, falhas, conta, pendências, domínio e carga |
| `src/modules/data-transfer/presentation/data-transfer-controls.js` | Resumo de backup, filtro de contas e abas de importação/exportação; três globals coesos consolidados |
| `tests/export-account-filter.test.cjs` | Caracterização de guard, ordem, escaping, seleção e carga |
| `tests/backup-summary.test.cjs` | Caracterização de guard, tradução, formatação, default e carga |
| `tests/import-tabs.test.cjs` | Caracterização de visibilidade, classes, alvos opcionais, efeitos da exportação e carga |
| `src/modules/preferences/presentation/translation-catalog.js` | Registro dos idiomas e objetos dos catálogos |
| `src/modules/preferences/presentation/locales/{pt-BR,en-US}/*.js` | Textos por idioma e contexto: trading, workspace, dialogs-and-labels; 123–253 linhas por arquivo |
| `src/modules/preferences/presentation/language-selector.js` | Tradução, menu e aplicação do idioma ao DOM; mantém os contratos globais |
| `tests/language-selector.test.cjs` | Conteúdo integral dos catálogos, fallback, efeitos do seletor e carga dos scripts |
| `src/modules/study-hub/presentation/legacy-*.css` | Quatro blocos contíguos: controles, sequência de trades, recuperação e overrides de integração; 174–359 linhas |
| `tests/study-hub-styles.test.cjs` | Fingerprint dos bytes concatenados na ordem dos links |
| `src/styles/foundation.css`, `shell-layout.css`, `navigation-and-account-summary.css` | Base visual e shell compartilhados; arquivos de 43–408 linhas |
| `src/modules/preferences/presentation/preferences-widgets.css` | Cotação e seletor de idioma, incluindo keyframe cot-spin |
| `src/styles/page-surfaces-and-headers.css` | Superfícies comuns, layout das páginas, espaçamento das abas e ícones dos cabeçalhos; 246 linhas |
| `src/styles/page-actions.css` | Botões, opções de análise e controles de intervalo de datas; 114 linhas, sem mover handlers |
| `src/styles/metric-cards-and-risk-insights.css` | Grids/cards de métricas, tooltips no body e indicadores de risco; 300 linhas |
| `scripts/lib/metric-style-scenarios.cjs` | Cenários de apresentação com fixture isolada para tons de risco e tooltips |
| `src/styles/dashboard-and-card-layout.css` | Grids do dashboard, cabeçalhos, cards/tabelas e containers de gráficos comuns; 161 linhas |
| `scripts/lib/dashboard-layout-scenarios.cjs` | Tabela inferior com rolagem horizontal e hover de card de gráfico na fixture isolada |
| `src/modules/accounts/presentation/account-risk-and-cashflow.css` | Risco, progresso, alertas e caixa no dashboard/setup/editor; 322 linhas |
| `scripts/lib/account-style-scenarios.cjs` | Cenários isolados de apresentação de contas, com restauração de dados em memória |
| `src/modules/analytics/presentation/strategy-comparison.css` | Ranking, seletores, cards, métricas e painel comparativo de estratégias; 201 linhas |
| `scripts/lib/strategy-style-scenarios.cjs` | Ranking e comparação por handlers reais, com dados temporários restaurados |
| `src/modules/calendar/presentation/calendar-grids.css` | Mini calendário, resumo semanal, células e grids mensal/semanal/quinzenal; 241 linhas |
| `scripts/lib/calendar-style-scenarios.cjs` | Modos, hover, rolagem e navegação/detalhes por handlers reais em perfil isolado |
| `src/modules/trades/presentation/trade-tables.css` | Tabelas, ordenação, seleção, badges e avisos de incompletos; 148 linhas, carga global |
| `scripts/lib/trade-table-style-scenarios.cjs` | Ordenação/seleção por handlers reais, flags de apresentação, scroll e sticky em perfil isolado |
| `src/styles/form-fields.css` | Grids, campos, foco, unidades e hints compartilhados; 91 linhas, carga global |
| `scripts/lib/form-field-style-scenarios.cjs` | Foco e estados de campos no modal real, sem submissão nem persistência |
| `src/styles/modal-and-tabs.css` | Overlays, estrutura dos modais e abas comuns; 80 linhas, carga global |
| `scripts/lib/modal-tab-style-scenarios.cjs` | Modais/footers/scroll e alternância de abas por handlers reais |
| `src/modules/calendar/presentation/calendar-toolbar.css` | Toolbar, seletor de mês e botões de modo do calendário; 27 linhas |
| `src/styles/upload-zone.css` | Zona de upload comum e estados hover/drag; 41 linhas, sem consumidor ativo confirmado |
| `scripts/lib/upload-zone-style-scenarios.cjs` | Fixture descartável para layout, hover, drag e input oculto da zona de upload |
| `src/modules/trades/presentation/emotion-picker.css` | Grid e chips de emoção, incluindo estado selecionado; 29 linhas |
| `scripts/lib/emotion-picker-style-scenarios.cjs` | Fixture descartável para idle, hover e seleção do picker sem mutar dados |
| `src/styles/tag-editor.css` | Tags compartilhadas entre Setup/Profile, contagem e botões de edição; 79 linhas |
| `scripts/lib/tag-editor-style-scenarios.cjs` | Tags editáveis/somente leitura, fixture `.tag-add` e nuvem do perfil em nove estados |
| `src/styles/alerts-and-utilities.css` | Alertas info/warn, separador e utilitários flex/espaçamento/largura; 52 linhas |
| `scripts/lib/alert-utility-style-scenarios.cjs` | Alertas/separadores reais, headers responsivos e fixture isolada para utilitário sem consumidor |
| `src/modules/trades/presentation/trade-actions.css` | Barra de ações em lote e navegação do fluxo do modal; 48 linhas |
| `scripts/lib/trade-action-style-scenarios.cjs` | Estados transitórios da seleção em lote e fluxo do modal, sem persistência |
| `src/modules/routine/presentation/premarket.css` | Checklist e grade mensal de hábitos premarket; 81 linhas |
| `src/modules/trades/presentation/error-chips.css` | Chips de erros do modal de operação; 31 linhas |
| `scripts/lib/premarket-error-chip-style-scenarios.cjs` | Grade/estados premarket e chips ocioso/hover/selecionado sem persistência |
| `src/modules/data-transfer/presentation/data-transfer.css` | Layout da importação, backup, filtros e exportação; 155 linhas |
| `scripts/lib/data-transfer-style-scenarios.cjs` | Abas reais de importação/exportação em nove larguras, sem IO |
| `src/styles/application-dialog.css` | Mensagem, input e erro do diálogo comum; 22 linhas |
| `src/styles/navigation-footer.css` | Layout do rodapé e links secundários da sidebar; 19 linhas |
| `scripts/lib/navigation-footer-style-scenarios.cjs` | Hover, rolagem e seleção ativa do rodapé em três larguras |
| `src/styles/workspace-grids.css` | Grids compartilhados de estratégias, perfil e parceiros; 31 linhas |
| `scripts/lib/workspace-grid-style-scenarios.cjs` | Grids reais e parceiros legados ocultos em seis larguras |
| `src/modules/study-hub/presentation/study-hub-native.css` | Abas/root e estilos nativos preservados; 297 linhas |
| `scripts/lib/study-hub-native-style-scenarios.cjs` | Quatro abas, hover, foco e rolagem horizontal/sticky em oito larguras |
| `src/styles/workspace-summaries.css` | Hero do perfil, status/notificações, chips e ranking ampliado; 156 linhas |
| `scripts/lib/workspace-summary-style-scenarios.cjs` | Tons/neutro/vazio, hero/compact e ranking em seis larguras |
| `src/modules/documents/presentation/doc-browser-and-layout.css` | Shell/cards, pastas, entradas e metadados dos documentos; 192 linhas |
| `src/modules/documents/presentation/doc-editor-and-media.css` | Contexto, toolbar, editor, mídia e vazios; 173 linhas |
| `scripts/lib/document-style-scenarios.cjs` | Renderers/seleção reais com fixture temporária; 41 casos sem persistência |
| `src/modules/accounts/presentation/account-overview.css` | Grid/cards, métricas e barras da visão geral de contas; 115 linhas |
| `scripts/lib/account-overview-style-scenarios.cjs` | 17 estados de conta única/múltipla/vazia/nome longo e breakpoints sem persistência |
| `src/modules/partners/presentation/partners.css` | Editor de afiliados, estados vazios, apoio e QR; 127 linhas |
| `src/modules/partners/presentation/partners-page.js` | Renderer global de parceiros, 37 linhas movidas intactas de `app.js` |
| `tests/partners-page.test.cjs` | Caracterização de vazio, afiliados/QR, alvos ausentes e ordem de carga |
| `src/modules/accounts/presentation/accounts-page.js` | Renderer global de contas, 46 linhas movidas intactas de `app.js` |
| `tests/accounts-page.test.cjs` | Caracterização de contas, vazio, alvos opcionais e ordem de carga |
| `src/modules/documents/presentation/documents-page.js` | Renderer global de documentos, 137 linhas movidas intactas de `app.js` |
| `tests/documents-page.test.cjs` | Caracterização de pasta/lista/editor, vazio, trade, alvo ausente e ordem de carga |
| `src/modules/routine/presentation/premarket-page.js` | Renderer global do premarket, 60 linhas movidas intactas de `app.js` |
| `tests/premarket-page.test.cjs` | Caracterização de resultados mensais, grade de hábitos e ordem de carga |
| `src/modules/accounts/presentation/risk-board.js` | Painel de risco do dashboard, 136 linhas movidas intactas |
| `tests/risk-board.test.cjs` | Caracterização de barras, sinais, excessos, metas, thresholds, defaults, guards e carga |
| `src/modules/analytics/presentation/dashboard-page.js` | Renderer principal do dashboard, 69 linhas movidas intactas |
| `tests/dashboard-page.test.cjs` | Caracterização de cards, sete gráficos, curva, componentes, recentes, tooltips e carga |
| `src/modules/analytics/presentation/dashboard-equity-mode.js` | Alternância global entre valor e percentual da curva de equity; 6 linhas intactas |
| `tests/dashboard-equity-mode.test.cjs` | Caracterização de modos, labels, fallback, botão opcional, ordem e carga |
| `src/modules/analytics/presentation/strategy-rows.js` | Linhas de estratégias compartilhadas por dashboard/hub, 23 linhas movidas intactas |
| `tests/strategy-rows.test.cjs` | Caracterização de limite, ordem, escaping, progresso, sinais, vazio, alvos e carga |
| `src/modules/analytics/presentation/strategy-comparison.js` | Painel comparativo de estratégias, 223 linhas movidas intactas |
| `tests/strategy-comparison.test.cjs` | Caracterização de guard, vazio, seleção inválida, comparação completa, gráficos e carga |
| `src/modules/analytics/presentation/strategy-hub-page.js` | Renderer global do hub de estratégias, 41 linhas movidas intactas de `app.js` |
| `tests/strategy-hub-page.test.cjs` | Caracterização de métricas, tabela, foco, vazio, alvos opcionais e ordem de carga |
| `src/modules/analytics/presentation/stop-fee-analysis.js` | Renderer global dos quatro cards de stops/taxas, 51 linhas movidas intactas |
| `tests/stop-fee-analysis.test.cjs` | Caracterização de tons, percentuais, formatação, tooltips, alvo ausente e carga |
| `src/modules/calendar/presentation/dashboard-calendar.js` | Calendário compacto e totais semanais do dashboard, 56 linhas movidas intactas |
| `tests/dashboard-calendar.test.cjs` | Caracterização de mês âncora, bissexto, resultados diários/semanais, vazio, alvos e carga |
| `src/modules/calendar/presentation/calendar-controls.js` | Navegação, seletor, modos e detalhe do dia; cinco declarações/41 linhas intactas |
| `tests/calendar-controls.test.cjs` | Caracterização de estado, parsing, controles opcionais, detalhe/vazio e carga |
| `src/modules/calendar/presentation/calendar-page.js` | Renderer global de calendário, 97 linhas movidas intactas de `app.js` |
| `tests/calendar-page.test.cjs` | Caracterização de três visões, bissexto, totais, datas, vazio, traduções e ordem de carga |
| `src/modules/notifications/presentation/notifications-page.js` | Renderer global de notificações, 8 linhas movidas intactas de `app.js` |
| `tests/notifications-page.test.cjs` | Caracterização de conta ativa, cópia dos alertas, vazio, falha e ordem de carga |
| `src/shared/presentation/status-list.js` | Lista de status reutilizada por notificações, perfil, estratégias e StudyHub; 17 linhas intactas |
| `tests/status-list.test.cjs` | Caracterização de vazio, escaping, ações, valores, alvos e carga |
| `src/shared/presentation/analysis-summary.js` | Resumos analíticos reutilizados por estratégias e psicologia; 10 linhas intactas |
| `tests/analysis-summary.test.cjs` | Caracterização de ordem, escaping, defaults, itens falsy, vazio, alvos e carga |
| `src/modules/documents/presentation/document-rendering-helpers.js` | Mídia, estado vazio e ícones de pastas dos documentos; dois helpers coesos/21 linhas |
| `tests/document-media.test.cjs` | Caracterização de vazio, ordem, URLs, escaping, ações, falhas e carga |
| `src/modules/accounts/presentation/account-cashflow-form.js` | Renderer do resumo e movimentos temporários no formulário de conta; 22 linhas intactas |
| `tests/account-cashflow-form.test.cjs` | Caracterização de guard, vazio, resumo, sinais, linhas, escaping, ações e carga |
| `src/modules/accounts/presentation/setup-cashflow-list.js` | Renderer do resumo e movimentos persistidos na configuração; 24 linhas intactas |
| `tests/setup-cashflow-list.test.cjs` | Caracterização de guards, conta, vazio, resumo, linhas, escaping, ações e carga |
| `src/modules/accounts/presentation/setup-risk-summary.js` | Projeção do risco calculado nos oito campos da configuração; 14 linhas intactas |
| `tests/setup-risk-summary.test.cjs` | Caracterização de conta, dependências, formatação, sinais, campos opcionais e carga |
| `src/modules/accounts/presentation/account-list.js` | Lista do seletor de contas com ações e resumos financeiros; 5 linhas intactas |
| `tests/account-list.test.cjs` | Caracterização de guard, vazio, contas, cálculos, ordem, ações e carga |
| `src/modules/accounts/presentation/risk-setup-page.js` | Composição dos campos, resumos e tags da configuração de risco; 17 linhas intactas |
| `tests/risk-setup-page.test.cjs` | Caracterização de precedência, defaults, zeros, data, campos opcionais e carga |
| `src/modules/accounts/presentation/account-balance-chrome.js` | Projeção do saldo, variação e contagem da conta no shell; 15 linhas intactas |
| `tests/account-balance-chrome.test.cjs` | Caracterização de defaults, retorno, sinais, campos opcionais, formatação e carga |
| `src/modules/accounts/presentation/risk-tags.js` | Listas editáveis de estratégias, emoções e mercados da configuração; 16 linhas intactas |
| `tests/risk-tags.test.cjs` | Caracterização de guard, inicialização, ordem, escaping, contagem, controles e carga |
| `tests/account-summary.test.cjs` | Caracterização de guard, cor, nome, tipo, alvos opcionais e carga |
| `tests/topbar-value.test.cjs` | Caracterização de guards, densidade, título, classe e carga |
| `tests/trade-images.test.cjs` | Caracterização de guard, vazio, ordem, campos, remoção e carga |
| `tests/trade-duration-field.test.cjs` | Caracterização de guard, datas, horários, fallback, duração nula/zero e carga |
| `tests/trade-plan-deviation.test.cjs` | Caracterização de guard, opções, fallback, disciplina e carga |
| `src/modules/trades/presentation/incomplete-trade-flow.js` | Projeção do fluxo de conclusão sequencial de trades incompletos; 31 linhas intactas |
| `tests/incomplete-trade-flow.test.cjs` | Caracterização de cadastro, edição, fluxo único/múltiplo, navegação, alvos opcionais e carga |
| `src/modules/trades/presentation/trade-log-controls.js` (aviso incorporado em G7i) | Aviso de consulta e bloqueios de edição no controller do diário |
| `tests/trade-log-read-only-notice.test.cjs` | Caracterização de guard, bloqueio, mensagens, escaping e carga |
| `src/modules/trades/presentation/trade-error-chips.js` | Composição dos chips de erros da operação; 12 linhas intactas |
| `tests/trade-error-chips.test.cjs` | Caracterização de guard, normalização, deduplicação, seleção, escaping e carga |
| `src/modules/trades/presentation/trade-log-metrics.js` | Cards de métricas do filtro atual do diário; 19 linhas intactas |
| `tests/trade-log-metrics.test.cjs` | Caracterização de guard, cards, sinais, risco médio, incompletos, não mutação e carga |
| `src/modules/trades/presentation/trade-log-selection.js` | Barra de ações e checkbox geral da seleção do diário; 26 linhas intactas |
| `tests/trade-log-selection.test.cjs` | Caracterização de guard, contagens, textos, classes, ações, checkbox geral e carga |
| `src/modules/trades/presentation/trade-log.js` | Orquestração e linhas da tabela do diário; três funções/87 linhas intactas |
| `tests/trade-log-page.test.cjs` | Caracterização de filtros, vazio, incompletos, labels, linhas compacta/completa, isolamento StudyHub e carga |
| `tests/document-folder-icon.test.cjs` | Caracterização de wrapper, SVGs, tipos, fallback e carga |
| `src/modules/psychology/presentation/psychology-statistics.js` | Renderer da aba de psicologia em análises, 59 linhas intactas |
| `tests/psychology-statistics.test.cjs` | Caracterização de cards, gráficos, resumos, hesitações, erros, tabela, vazio e carga |
| `src/modules/analytics/presentation/statistics-controls.js` | Abas, período personalizado e conta fixada das estatísticas; três funções coesas/23 linhas |
| `tests/statistics-tabs.test.cjs` | Caracterização de painéis, classes, alvos opcionais, fallback, psicologia, simulação e carga |
| `tests/statistics-filters.test.cjs` | Caracterização de período, fallback, alvos opcionais, ordem da fixação da conta e carga |
| `src/modules/analytics/presentation/statistics-page.js` | Orquestração da página de análises; 193 linhas movidas intactas |
| `tests/statistics-page.test.cjs` | Caracterização de contas, risco, vazio, gráficos, símbolos, dias, horários e carga |
| `src/modules/psychology/presentation/psychology-page.js` | Renderer global da página de psicologia, 25 linhas movidas intactas de `app.js` |
| `tests/psychology-page.test.cjs` | Caracterização de resumos, gráficos, tabela, vazio, alvos opcionais e ordem de carga |
| `scripts/lib/partner-style-scenarios.cjs` | Vazio/afiliados/QR em oito larguras, sem mutação persistente |
| `src/styles/tag-cloud.css` | Espaçamento/títulos dos três grupos de tags do perfil; 13 linhas |
| `src/styles/page-motion.css` | `@keyframes fade-up` usado pela página ativa; 12 linhas |
| `src/styles/responsive-desktop-tablet.css` | Media queries gerais de 1420, 1240 e 1080px; 260 linhas |
| `src/styles/responsive-mobile.css` | Media queries gerais de 720 e 440px; 316 linhas; substitui o residual `styles.css` |
| `src/modules/profile/presentation/profile-page.js` | Renderer global da página de perfil; 48 linhas movidas intactas de `app.js` |
| `src/modules/trades/presentation/incomplete-trade-banner.js` | Estado de descarte e APIs globais do banner de trades incompletos; 14 linhas movidas intactas de `app.js` |
| `tests/profile-page.test.cjs` | Caracterização de HTML, risco, tags, alertas, alvos opcionais e ordem de carga |
| `scripts/shell-style-check.cjs` | Comparação isolada de páginas, shell, menus, foco, hover e modais |

Esses arquivos existem após os lotes 1–2, 2b, G1, G2a–G2ae, G3a–G3be, G4a–G4g e G5a–G5k; demais responsabilidades continuam no legado. Entrega e
validações: [refactoring-progress.md](refactoring-progress.md). Camadas adicionais serão
criadas apenas quando uma extração real justificar sua existência.

## Histórico detalhado de extrações por lote

Notas históricas preservadas; a localização atual está no [mapa compacto](project-map.md).

## StudyHub: runtime e intraday (G6a)

- `src/modules/study-hub/presentation/study-hub-legacy-runtime.js`: montagem única/template e closure legada intactos, 2.389 linhas; privados permanecem isolados, pontes `window.sh_*` preservadas.
- `src/modules/study-hub/presentation/study-hub-intraday.js`: complemento intraday em IIFE própria, 306 linhas; wrappers e montagem dos controles preservados.
- Carga síncrona: `app.js` → runtime → intraday; callbacks load, Chart.js e ordem de inicialização mantidos.
- `tests/study-hub-runtime.test.cjs` protege montagem, isolamento, pontes, navegação e projeções/limites intraday. Smoke verifica quatro abas, sizing determinístico, `pfState` e erros capturados por `shSafe`.
- `app.js`: 5.839 → 3.142 linhas. Próximo G6b: estado/integração nativa e adaptadores de persistência; depois regras das ferramentas dentro da closure.

## StudyHub: estado e integração nativa (G6b)

- `src/modules/study-hub/application/study-hub-state.js`: `defaultStudyHubState` e `mergeStudyHubState`, 61 linhas; preserva defaults compartilhados de simulação e merge permissivo de backups parciais.
- `src/modules/study-hub/domain/study-hub-calculations.js`: namespace `TradeDiaryStudyHubCalculations`, 76 linhas; checklist, RNG com seed, snapshot propfirm/mental e simulação recebem dados explícitos, sem DOM/IO/estado da aplicação.
- `src/modules/study-hub/presentation/study-hub-page.js`: metadata, formulários, handlers, markup, renderers e pontes nativas coesos em 759 linhas; cinco APIs globais delegam ao domínio mantendo defaults de estado.
- Carga clássica: domínio → estado → página, antes de `app.js`; runtime/intraday continuam depois. Estado global `studyHubState` e armazenamento `tl_studyhub` mantidos nos pontos existentes.
- `tests/study-hub-native.test.cjs`: defaults/merge, parsing, gravação real, ordem de refresh, adapters/eventos, abas/pontes, limites, seed, simulação e isolamento do domínio. Caracterização pré-corte e 243 comparações diferenciais sem divergência.
- `app.js`: 3.142 → 2.269 linhas; 87 arquivos de teste Node e 113 checks no navegador. Próximo: regras/persistências privadas do runtime G6c.

## StudyHub: PropFirm privado e storage (G6c)

- `src/modules/study-hub/presentation/study-hub-propfirm.js`: factory de 703 linhas; encapsula cotação, charts, formulários, importação/exportação e inicialização PropFirm. Instanciada no ponto original do runtime, recebe somente `shAddLoad`; retorna as 12 funções necessárias às pontes existentes, sem expor helpers privados.
- `src/modules/study-hub/domain/study-hub-calculations.js`: ampliado de 76 para 107 linhas com payout legado, steps inteiros e cenários. A fórmula legada aplica deduções sequenciais; não foi unificada com a fórmula nativa.
- `src/modules/study-hub/infrastructure/study-hub-storage.js`: dez operações coesas/12 linhas para `pfCot`, `pfState`, `cot`, `hubCiclos` e `diary2026`; formatos, defaults e políticas de erro dos consumidores preservados.
- Carga clássica após `app.js`: storage → definição PropFirm → runtime → intraday. A definição do factory não acessa DOM/storage nem registra callbacks; a criação ocorre dentro do runtime na posição anterior do bloco.
- Runtime: 2.389 → 1.672 linhas; `app.js` permanece em 2.269. Testes: `study-hub-propfirm.test.cjs`, `study-hub-storage.test.cjs` e `study-hub-runtime.test.cjs`; 89 arquivos Node e 113 checks no navegador aprovados.
- Próximo G6d: plano, TradeSim e mental ainda internos ao runtime; depois G7 e fechamento.

## StudyHub: plano, TradeSim e mental (G6d)

- `src/modules/study-hub/presentation/study-hub-plan.js` (394 linhas), `study-hub-tradesim.js` (627) e `study-hub-mental.js` (423): factories por ferramenta, criadas nas posições originais do runtime; estado, charts, handlers e callbacks permanecem privados.
- O plano retorna 21 funções para as pontes existentes, TradeSim retorna cinco e mental dez. Helpers não são promovidos a globais; `renderLog` mental permanece isolado do diário principal.
- Cinco cálculos puros de compounding, parciais, sequência de perdas e ruína incorporados ao domínio existente, agora com 127 linhas; wrappers privados mantêm assinaturas.
- `study-hub-legacy-runtime.js`: 1.672 → 233 linhas; mantém template, shell, tooltips, registro comum de load e pontes `sh_*`. `app.js` continua com 2.269 linhas.
- `tests/study-hub-tools.test.cjs`: caracterização pré-corte de restauração, cotação, falhas de storage, bindings, execução adiada, resize, histórico/exportação e fórmulas.
- Carga clássica após `app.js`: storage → definição das quatro ferramentas → runtime → intraday. 90 arquivos Node e 113 checks no navegador aprovados.
- G6 estrutural encerrado; seguir para G7: composição HTML e compatibilidade, revisão dos acoplamentos restantes e fechamento arquitetural.

## StudyHub: HTML de autoria e distribuição estática (G7a)

- Fontes: `src/modules/study-hub/presentation/templates/{propfirm,plan,tradesim,mental}.html`, respectivamente 352/580/310/167 linhas; uma responsabilidade por ferramenta.
- Gerar após editar: `node scripts/build-study-hub-template.cjs`; conferir sem escrever: `node scripts/build-study-hub-template.cjs --check`.
- Distribuição versionada: `presentation/study-hub-template.js`, script clássico de dados, carregado após a definição das ferramentas e antes do runtime. O deploy continua sem build e sem fetch de fragmentos.
- Montagem preservada: mesmo `host.innerHTML`, guardas, IDs, handlers e 151.521 bytes de texto; SHA-256 protegido em `tests/study-hub-template.test.cjs`.
- Runtime: 170.565 → 11.187 bytes, mantendo 233 linhas; a linha gigante de autoria foi eliminada. `app.js` permanece em 2.269 linhas.
- Decisão/custos: [ADR-004](adr/004-study-hub-html-authoring.md). Próximo G7b: avaliar autoria do shell `index.html` e compatibilidade antes do fechamento arquitetural.

## Simulação: primeiro domínio extraído

- Domínio: `src/modules/simulation/domain/calculate-simulation-sizing.js`.
- Testes: `tests/simulation-sizing.test.cjs`.
- Compatibilidade: chamadas existentes em `app.js` e script carregado por `index.html`.
- `TradeDiarySimulationSizing`: parsing numérico, arredondamento e dimensionamento puro.
- Smoke: `scripts/browser-smoke.cjs`; demais regras de simulação permanecem em `app.js`.
- Resultados e limites de cobertura: [progresso](refactoring-progress.md).

## Campos monetários da simulação (G3am)

- `src/modules/simulation/presentation/simulation-sizing-fields.js`: `syncSimulationMoneyFromPercent()` global, 14 linhas movidas byte a byte; script clássico síncrono depois do domínio de sizing e antes de `app.js`.
- `tests/simulation-sizing-fields.test.cjs`: conta selecionada/ativa, fallbacks, entradas explícitas, zero, conversão, ordem das três projeções, retorno e carga.
- Snapshot, conversão, cálculo de sizing e helpers de campos permanecem nas dependências existentes; dois consumidores JavaScript e quatro handlers HTML preservados.
- 245 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Painel de simulação (G3aw)

- `src/modules/simulation/presentation/simulation-panel.js`: `applySimulationAccountSnapshot()`, `resetSimulationEntryDefaults()`, `loadSimFromAccount()` e `renderSimulation()` globais, quatro funções/81 linhas movidas byte a byte.
- `tests/simulation-panel.test.cjs`: snapshot, reset, conta manual/real, ordem dos efeitos, opções, RRR customizado, cards, resumo, plano, gráfico e carga.
- Handler HTML, abas, análises e navegação preservados; sizing, snapshot, plano, Monte Carlo, Chart.js e formatação continuam nas dependências existentes.
- `app.js`: 7.907 para 7.829 linhas. 299 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Formulário de contas (G3ax)

- `src/modules/accounts/presentation/account-form.js`: `newAccount()`, `editAccount()`, `addAccountCashflowFromForm()`, `removeAccountFormCashflow()` e `onAcctTypeChange()` globais, cinco funções/53 linhas movidas byte a byte.
- `tests/account-form.test.cjs`: conta nova/ausente/edição, clone de cashflows, movimento válido/inválido, remoção, tipo da conta e ordem de carga.
- Handlers HTML, estado temporário, defaults e renderização de cashflows preservados; `saveAccount`, `deleteAccount`, normalização, persistência e coordenação permanecem em `app.js`.
- `app.js`: 7.829 para 7.780 linhas. 306 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Diálogo comum da aplicação (G3ay)

- `src/app/presentation/app-dialog.js`: abertura, fechamento, confirmação, notice e prompt em seis APIs globais/60 linhas movidas byte a byte.
- `tests/app-dialog.test.cjs`: defaults, projeção no DOM, foco, fechamento, valor obrigatório, ordem do callback, opções, fallbacks nativos e carga.
- Dois handlers HTML e consumidores de todas as features preservados; `appDialogState` permanece em `app.js`.
- `app.js`: 7.780 para 7.725 linhas. 314 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Controles do diário (G3az)

- `src/modules/trades/presentation/trade-log-controls.js`: ordenação, limpeza do período, seleção total/individual e limpeza da seleção em cinco APIs globais/43 linhas movidas byte a byte.
- `tests/trade-log-controls.test.cjs`: alternância de ordenação, indicadores, controles opcionais, checkboxes, IDs selecionados, classes das linhas, barra e carga.
- Handlers HTML e o `onchange` gerado pelas linhas permanecem intactos; estado, filtros, cálculos e mutações continuam em `app.js`.
- `app.js`: 7.725 para 7.686 linhas. 321 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Navegação da aplicação (G3ba)

- `src/app/presentation/navigation.js`: refresh da página ativa, atualização compartilhada, sidebar e troca de página em três APIs globais/29 linhas movidas byte a byte.
- `tests/navigation.test.cjs`: despacho conhecido/desconhecido, ordem do refresh, fallback do dashboard, classes, sidebar, período, reset da simulação e carga.
- Handlers HTML e consumidores gerados permanecem intactos; listeners, estado e callback `window.load` continuam em `app.js`.
- `app.js`: 7.686 para 7.659 linhas. 328 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Opções do formulário de trade (G3bb)

- `src/modules/trades/presentation/trade-form.js`: preenchimento dos selects e alternância dos erros permanecem globais no formulário consolidado.
- `tests/trade-form-options.test.cjs`: ordem e conteúdo das opções, labels crus, campos opcionais, conta ativa, símbolos, reset, adição/remoção de erros, efeitos e carga.
- `openModal` e os consumidores dos chips permanecem intactos; configuração, estado, conta, disciplina e salvamento continuam em `app.js`.
- `app.js`: 7.659 para 7.636 linhas. 334 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Controlador de modais (G3bc)

- `src/app/presentation/modal-controller.js`: abertura e fechamento dos modais de trade, conta e importação em duas APIs globais/27 linhas movidas byte a byte.
- `tests/modal-controller.test.cjs`: bloqueio, edição encontrada/ausente, trade novo, data/duração, modal de contas, modal genérico, fechamento, fila e carga.
- Handlers HTML e consumidores permanecem intactos; estado, formulários, fila e renderers continuam em `app.js` ou nos módulos existentes.
- `app.js`: 7.636 para 7.610 linhas. 341 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Contexto de conta do formulário de trade (G3bd)

- `src/modules/trades/presentation/trade-form.js`: projeção da conta selecionada e derivação do mercado permanecem globais no formulário consolidado.
- `tests/trade-form-account-context.test.cjs`: conta/fallback, risco, multiplicador, CFD/futuros, resumo, alvos opcionais, símbolo, mercado e carga.
- Dois handlers HTML e o consumidor de `populateSelects` permanecem intactos; contas, risco, formatação, cálculo de R e catálogo continuam nas dependências existentes.
- `app.js`: 7.610 para 7.592 linhas. 347 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Estatísticas da topbar (G3be)

- `src/app/presentation/topbar.js`: valor responsivo, conta ativa, período semanal/mensal, drawdown, meta e badge; três APIs globais preservadas em um único componente coeso.
- `tests/topbar-statistics.test.cjs`: limites semana/mês, percentuais, tons, meta, drawdown, badge, alvos opcionais, densidade e carga.
- Componentes compartilhados da topbar e consumidores permanecem intactos; risco, trades, relógio e formatação continuam nas dependências existentes.
- `app.js`: 7.592 para 7.568 linhas. 352 testes Node e 96 checks no navegador; G3 encerrado sem nova matriz visual por manter corpo/HTML gerado e CSS intactos.

## Domínio de timing de trades (G4a)

- `src/modules/trades/domain/trade-timing.js`: factory puro para normalização/formatação de horário, duração, médias e agrupamentos; normalizadores compartilhados entram como dependências explícitas.
- `tests/trade-timing.test.cjs`: formatos legados, intervalos frouxos, arredondamento, virada da meia-noite, datas explícitas, intervalos inválidos, WIN/LOSS/BE, estratégias, imutabilidade, isolamento e carga.
- Nove APIs globais permanecem em `app.js` como wrappers; formulário, estatísticas, comparação, importação e dados persistidos permanecem compatíveis.
- `app.js`: 7.568 para 7.476 linhas. 359 testes Node e 96 checks no navegador; revisão independente sem bloqueios.

## Domínio de métricas de trades (G4b)

- `src/modules/analytics/domain/calculate-trade-metrics.js`: resultados, expectativa, profit factor, drawdown, Sharpe, Sortino, Calmar, recovery e streaks recebem trades e saldo inicial explícitos.
- `tests/trade-metrics.test.cjs`: fallbacks de capital, grupos, referências, vazio/BE/Infinity, ordem invertida, drawdown, streaks, índices, isolamento e carga.
- `calcMetrics` permanece global e resolve conta/capital antes de delegar; consumidores e `filterByPeriod` permanecem intactos.
- `app.js`: 7.476 para 7.431 linhas. 366 testes Node e 96 checks no navegador; comparação diferencial de 500 casos e revisão independente sem divergências.

## Domínio de totais de cashflow (G4c)

- `src/modules/accounts/domain/calculate-cashflow-totals.js`: soma pura de depósitos, retiradas e líquido a partir de movimentos explícitos.
- `tests/account-cashflow.test.cjs`: referências/fallbacks, parsing parcial, valores absolutos, tipos desconhecidos, vazio, Infinity, erros, imutabilidade, saldo textual, isolamento e carga.
- `getAccountCashflows`, `calcAccountCashflow` e `getAccountCapitalBase` permanecem globais; lookup, formulários, risco e persistência continuam intactos.
- `app.js`: 7.431 para 7.425 linhas. 373 testes Node e 96 checks no navegador; revisão independente sem bloqueios.

## Limites e consumo de risco (G4d)

- `src/modules/accounts/domain/calculate-risk-limits.js`: limites diário, semanal, mensal e total, perda e excesso em dinheiro, limite e consumo bruto do período; entradas explícitas.
- `tests/account-risk-limits.test.cjs`: defaults, cashflow, limite diário, escopos, excesso, zero, isolamento e ordem de carga.
- `calcAccountRiskState` continua global; datas, seleção temporal, saldo, drawdown, rótulos e percentuais finais seguem no legado.
- `app.js`: 7.425 para 7.409 linhas. 379 testes Node, 96 checks no navegador e 500 casos diferenciais equivalentes.

## Metas cíclicas de risco (G4e)

- `src/modules/accounts/domain/calculate-goal-cycle.js`: ciclo, patamares, alvo, P/L e progresso a partir de saldo, base e percentual explícitos.
- `tests/account-goal-cycle.test.cjs`: caracterização pré-corte de limites, precisão, cashflow e fallback; isolamento e carga clássica após o corte.
- `calcAccountRiskState` global preservado; `ddBase` continua igual a `cicloBase` e os consumidores recebem o mesmo estado.
- `app.js`: 7.409 para 7.397 linhas. 383 testes Node e 96 checks no navegador.

## Saldo e drawdown da conta (G4f)

- `src/modules/accounts/domain/calculate-balance-drawdown.js`: evolução de saldo, pico e drawdown sobre trades já ordenados e capital explícito.
- `tests/account-balance-drawdown.test.cjs`: caracterização pré-corte de cashflow, ordem, perdas, picos não positivos e coerção textual; isolamento e carga clássica após o corte.
- `calcAccountRiskState` global preservado; `getOrderedTrades`, calendário e escopos continuam no legado.
- `app.js`: 7.397 para 7.388 linhas. 388 testes Node, 96 checks no navegador e revisão independente aprovada.

## P/L por período de risco (G4g)

- `src/modules/accounts/domain/calculate-risk-period-pnl.js`: filtros e somas de P/L para hoje, semana, mês e escopo selecionado, com datas explícitas.
- `tests/account-risk-period-pnl.test.cjs`: caracterização pré-corte de limites semanais/mensais, períodos sem filtro, datas ausentes e P/L textual; isolamento e carga clássica após o corte.
- `calcAccountRiskState` global preservado; relógio, construção de datas, rótulos e composição do estado continuam no wrapper.
- `app.js`: 7.388 para 7.352 linhas. 393 testes Node, 96 checks no navegador e revisão independente aprovada.

## Workflows financeiros e de risco (G5p)

- `src/modules/accounts/application/account-risk-workflows.js`: `calcAccountRiskState`, `getTradeWeekKey` e `buildStopFeeAnalysis` globais em um macrobloco de aplicação com 183 linhas.
- `tests/account-risk-workflows.test.cjs`: composição de cashflow, limites, drawdown, metas e períodos; agrupamento diário/semanal/mensal, breaches, taxas e arredondamentos.
- Os quatro módulos puros de risco permanecem em `domain`; o workflow apenas os coordena e mantém dependências globais compatíveis com scripts clássicos.
- `app.js`: 6.024 para 5.839 linhas. 85 testes Node e 107 checks no navegador no fechamento anterior à revisão independente.

## Banner de trades incompletos (G3an)

- `src/modules/trades/presentation/incomplete-trade-banner.js`: `updateIncompleteBanner()` e `dismissIncompleteBanner()` globais, com estado de descarte, 14 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/incomplete-trade-banner.test.cjs`: contagem truthy, exibição, zero, alvos opcionais, não mutação, descarte persistente e ordem de carga.
- Consulta de trades e conta ativa permanecem nas dependências existentes; três consumidores de atualização e a API global de descarte foram preservados.
- 250 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Estratégias: renderer do hub (G3f)

- `src/modules/analytics/presentation/strategy-hub-page.js`: `renderStrategyHub` global, 41 linhas movidas intactas de `app.js`; script clássico síncrono antes dos demais renderers e de `app.js`.
- `getStrategySnapshots` e formatação continuam no legado; `renderStatusList` em `src/shared/presentation/status-list.js`; `renderStrategyRows` foi extraído no G3l; `showPage` e `refreshAll` preservam os consumidores.
- `tests/strategy-hub-page.test.cjs` caracteriza preenchido/vazio, métricas, tabela, foco, alvos opcionais e ordem de carga; smoke abre estratégias e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3e; todos idênticos, com 55 imagens/288 pixels dentro da tolerância existente.

## Psicologia: renderer da página (G3g)

- `src/modules/psychology/presentation/psychology-page.js`: `renderPsych` global, 25 linhas movidas intactas de `app.js`; script clássico síncrono antes dos demais renderers e de `app.js`.
- Conta ativa, seleção de trades, Chart.js, filtros subjetivos e formatação continuam no legado; `showPage` e `refreshAll` preservam os consumidores.
- `tests/psychology-page.test.cjs` caracteriza resumos, gráficos, tabela, vazio, alvos opcionais e ordem de carga; smoke abre psicologia e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3f; todos idênticos, com 49 imagens/293 pixels dentro da tolerância existente.

## Transferência de dados: serialização CSV

- Adaptador de formato: `src/modules/data-transfer/infrastructure/serialize-trades-csv.js`.
- Namespace: `TradeDiaryTradesCSV`; recebe registros e devolve texto, sem DOM/IO/estado global da aplicação.
- Compatibilidade em `app.js`: `TRADE_CSV_HEADERS` referencia o mesmo array; `csvCell` e `buildTradesCSV(list=trades)` delegam.
- Consumidor: `exportTradesCSV`; filtros, download/Blob e importação permanecem no legado.
- Carga: sizing antes do serializer CSV; ambos antes de `app.js`, como scripts clássicos síncronos.
- Testes: `tests/trades-csv.test.cjs`; smoke CSV em `scripts/browser-smoke.cjs`.

## Importação: linhas delimitadas (G5a)

- `src/modules/data-transfer/infrastructure/split-delimited-rows.js`: normaliza células e divide linhas pelo delimitador da primeira linha; formato legado preservado.
- `normalizeCSVRow` e `splitDelimitedRows` continuam globais em `app.js` como wrappers; `parseCSVText` mantém guarda binária e delegação para `parseSpreadsheetRows`.
- `tests/split-delimited-rows.test.cjs`: caracterização pré-corte de delimitadores, aspas, vazios, coerção e consumidor; isolamento e carga clássica após o corte.
- `app.js`: 7.352 para 7.348 linhas. 398 testes Node e 97 checks no navegador.

## Formato de backup (G5b–G5c)

- `src/modules/data-transfer/infrastructure/backup-format.js`: monta payload com dados/tempo explícitos, valida chaves reconhecidas e resume coleções sem DOM, storage ou estado global.
- `createBackupPayload`, `summarizeBackupData` e `validateBackupData` continuam globais em `app.js` como wrappers; `formatBackupSummary`, `restoreBackupData` e consumidores mantêm o fluxo atual.
- `tests/backup-format.test.cjs` e `tests/backup-payload.test.cjs`: contagens, formas, chaves, erros, apresentação, versão, ordem, relógio, referências, isolamento e carga.
- `app.js`: 7.348 para 7.339 linhas. 406 testes Node e 98 checks no navegador.

## Restauração de backup (G5d)

- `src/modules/data-transfer/application/restore-backup.js`: `restoreBackupData(data)` global, corpo intacto; valida e coordena normalizadores/estado em sequência.
- Script clássico depois do formatador e antes dos consumidores; estado e adaptadores globais continuam como dívida transitória. Sem DOM ou persistência direta.
- `tests/restore-backup.test.cjs`: entradas parciais/completas, referências, ordem, permissividade, seleção de conta e estado parcial nas falhas; carga global.
- Smoke restaura trades em memória e repõe os seis globals em `finally`; storage permanece protegido. 412 testes Node, 99 checks; `app.js`: 7.326 linhas.

## Fluxo de exportação e download (G5e)

- `src/modules/data-transfer/application/select-export-trades.js`: `normalizeExportSymbols` e `getTradesForCustomExport`; seleção mantém referências/ordem, aliases, filtros e conta global atual.
- `src/modules/data-transfer/infrastructure/download-text-file.js`: `downloadTextFile`; Blob, clique e revogação opcional em 1.000ms, sem efeito na carga.
- `src/modules/data-transfer/presentation/export-downloads.js`: sete APIs globais JSON/CSV, leitura de filtros e seleção do mês; corpo intacto, sem unificar diferenças dos caminhos de download.
- Scripts clássicos antes de `app.js`; estado/adaptadores legados permanecem transitórios. `tests/export-downloads.test.cjs` cobre comportamento e carga.
- 420 testes Node, 100 checks no navegador incluindo botões JSON/CSV com Blob/URL nativos e clique de download interceptado; `app.js`: 7.247 linhas.

## Coordenação da importação (G5f)

- `src/modules/data-transfer/presentation/import-workflow.js`: `importJSON`, `handleCSVUpload`, `parseMT4`, `showImportPreview`, `confirmImport`; cinco handlers globais em 102 linhas.
- Script clássico antes de `app.js`; callbacks, diferenças de erros, limite de 80 linhas, duplicados e ordem dos efeitos preservados. Símbolos dos textos existentes codificados com escapes Unicode equivalentes.
- Parsers, preparação/pending state e persistência continuam no legado. `tests/import-workflow.test.cjs` cobre comportamento, falhas e carga sem IO inicial.
- Smoke lê CSV real com FileReader nativo, abre preview e protege as seis chaves de save sem confirmar importação. 431 testes Node, 101 checks; `app.js`: 7.145 linhas.

## Preparação e duplicidade de trades importados (G5g)

- `src/modules/data-transfer/domain/import-trade-rules.js`: `TradeDiaryImportTradeRules` expõe campos faltantes e `createImportedTradeFilter(existingTrades,getPositionKey)`, sem IO/estado global da aplicação.
- Predicado construído antes da leitura de candidatos: mantém posições/IDs existentes e vistos, tipos dos IDs, ordem e referências dos primeiros novos registros.
- `src/modules/data-transfer/application/prepare-trade-import.js`: cinco APIs globais de preparação/pending state/chave de posição; corpos intactos. Relógio, IDs, conta e normalizadores continuam em adaptadores legados.
- `calcImportMissingFields` permanece wrapper global em `app.js`; `confirmImport` delega duplicidade ao domínio antes dos efeitos existentes.
- `tests/import-preparation.test.cjs` e handlers cobrem defaults, referências, arrays esparsos, tempo/erros, conta, pendências e ordem da confirmação. 442 testes Node, 102 checks; `app.js`: 7.078 linhas.

## Persistência principal (G5h)

- `src/app/infrastructure/app-state-storage.js`: save global intacto e readPersistedAppState; seis chaves/valores brutos, ordem e gravações parciais preservadas. save ainda lê estado global.
- `src/app/application/load-app-state.js`: load global restaura/normaliza pela leitura substituível; lê todas as chaves antes de aplicar valores, mantém permissividade e catch existente.
- Scripts sem IO inicial, antes de navigation/app; nenhum formato, seed ou migração alterado. [ADR-003](adr/003-main-state-persistence.md).
- `tests/app-state-storage.test.cjs`: caracterização de serialização, leitura, normalização, round-trip, defaults, erros e ordem; smoke com localStorage nativo e cleanup em finally.
- 454 testes Node, 103 checks; `app.js`: 7.049 linhas. Seeds/bootstrap e persistências auxiliares continuam fora do corte.

## Parsers tabulares (G5i)

- `src/modules/data-transfer/infrastructure/parse-tabular-trades.js`: quatro APIs globais, 143 linhas intactas; MT5/HTML-posicional/MT4, cabeçalhos genéricos, prioridade MT e entrada de texto MT4.
- Adaptador de formato transitório: lê trades e usa IDs, relógio e normalizadores do legado ao ser chamado; sem IO/estado na carga. Extração HTML e loader XLSX em `infrastructure/read-trade-report.js` desde G5k.
- `tests/parse-tabular-trades.test.cjs`: fixtures dos layouts com normalizadores reais e relógio/IDs controlados, limite de cabeçalhos, aliases, duplicados, arredondamento, datas e erros.
- Script clássico antes dos handlers; smoke com posição MT real e upload CSV nativo. 468 testes Node, 104 checks; `app.js`: 6.906 linhas.

## Normalização de formatos tabulares (G5j)

- `src/modules/data-transfer/infrastructure/normalize-tabular-values.js`: parseMTNumber, normalizeDate, cleanMTCell e normalizeImportHeader; quatro globals intactos, 48 linhas, sem IO/estado da aplicação.
- Script clássico antes dos parsers e de app.js; consumidores incluem importação e tradeTimingDomain. Chamadas dinâmicas entre helpers preservadas.
- `tests/normalize-tabular-values.test.cjs`: formatos locais, coerções, datas/Excel, cabeçalhos, erros, substituição de helpers e carga. Oito testes pré-corte.
- 477 testes Node, 105 checks no navegador; revisão independente aprovada. `app.js`: 6.860 linhas. IO HTML/XLSX extraído em G5k.

## Relatórios HTML/XLSX (G5k)

- `src/modules/data-transfer/infrastructure/read-trade-report.js`: loadSheetJS e parseMT5HTML; CDN existente e extração DOM de linhas com pelo menos dez células.
- `src/modules/data-transfer/presentation/import-workflow.js`: inclui handleMT5Upload, handleReportUpload, handleHistoryUpload e handleMT5Result; leitura assíncrona e entrega à preparação/prévia existentes.
- `tests/trade-report-import.test.cjs`: oito caracterizações pré-corte e carga; roteamento, UTF-16, primeira planilha/opções, callbacks, erros e conta na conclusão.
- Smoke com HTML UTF-16 e XLSX reais sem persistir antes da confirmação. 486 testes Node, 107 checks, revisão aprovada; `app.js`: 6.818 linhas. Seeds/inicialização seguem no legado.

## Controles da transferência de dados (G3aa/G3ab/G3ao; consolidados após G5k)

- `src/modules/data-transfer/presentation/data-transfer-controls.js`: reúne `renderBackupSummary`, `renderExportAccountFilter` e `switchImportTab`; três APIs globais coesas em um script clássico antes de `app.js`.
- Testes separados preservam guards, tradução/formatação, opções/seleção, visibilidade, classes, painéis opcionais e ordem dos efeitos.
- A consolidação reduz três arquivos mínimos para um módulo de apresentação sem alterar consumidores, HTML gerado, persistência ou ordem efetiva de inicialização.

## Preferências: idiomas

- Registro: `src/modules/preferences/presentation/translation-catalog.js` (`LANGUAGES`, `TRANSLATIONS`).
- Catálogos: `locales/{pt-BR,en-US}/{trading,workspace,dialogs-and-labels}.js`, relativos à pasta acima.
- `trading`: navegação, dashboard, diário, análises e rotina; `workspace`: importação, documentos e configurações;
  `dialogs-and-labels`: modais, avisos, aliases, datas e rótulos dinâmicos.
- UI: `language-selector.js` (`t`, `initLanguageSelector`, `toggleLangMenu`, `closeLangMenu`, `setLanguage`, `applyLanguage`).
- Todos continuam globais de scripts clássicos; `currentLanguage` e sua leitura de storage permanecem em `app.js`.
- Ordem: registro, fragmentos por idioma na ordem acima, seletor, `app.js`. `Object.assign` preserva sobrescritas e ordem das chaves.
- Testes: `tests/language-selector.test.cjs`; fingerprints das 585 strings por idioma e efeitos do seletor.
- Smoke: troca EN/PT via handlers reais em perfil isolado; demais dados de storage devem permanecer iguais.

## StudyHub: estilos legados (G1)

- Apresentação: `src/modules/study-hub/presentation/legacy-controls.css`,
  `legacy-trade-sequence.css`, `legacy-recovery-panels.css`, `legacy-integration-overrides.css`.
- Carregados nessa ordem depois de `src/styles/responsive-mobile.css`; todos ativos nas quatro abas. Sem alterações de regras.
- Após G2ae, `src/styles/responsive-desktop-tablet.css` contém 1420/1240/1080px (histórico 4304–4563) e `src/styles/responsive-mobile.css` contém 720/440px (histórico 4564–4879); não há CSS residual em `styles.css`.
- Contrato de bytes/cascata: `tests/study-hub-styles.test.cjs`.
- Smoke: `scripts/browser-smoke.cjs`; comparação visual: `scripts/study-hub-style-check.cjs`.
- Fronteiras e próximos cortes: [mapa CSS](css-extraction-map.md); uso e limites: [tooling](tooling.md).

## Shell e preferências: estilos (G2a)

- `src/styles/foundation.css`: fontes, tokens, reset, elementos e scrollbars (109 linhas).
- `src/styles/shell-layout.css`: layout e topbar (43 linhas).
- `src/modules/preferences/presentation/preferences-widgets.css`: cotação e idioma (139 linhas).
- `src/styles/navigation-and-account-summary.css`: sidebar, logo, navegação e resumo (408 linhas).
- Carga nessa ordem, antes dos CSS responsivos e dos quatro CSS StudyHub; sobrescritas permanecem nos arquivos responsivos.
- Contrato integral de bytes/cascata: `tests/study-hub-styles.test.cjs` (nome histórico; cobre todos os links).
- Comparação visual: `scripts/shell-style-check.cjs`; instruções e limites em [tooling](tooling.md).

## Superfícies e cabeçalhos: estilos (G2b)

- `src/styles/page-surfaces-and-headers.css`: 246 linhas de superfícies de cards/modais, layout das páginas,
  espaçamento das abas de análise, cabeçalhos e ícones SVG em máscaras CSS.
- Carrega após `navigation-and-account-summary.css`, antes dos CSS responsivos; regras responsivas permanecem nesses arquivos.
- Uso compartilhado entre páginas: manter carga global e ordem, inclusive pseudo-elementos e seletores por inline style.
- Teste integral de bytes em `tests/study-hub-styles.test.cjs`; runner visual do shell também captura máscaras,
  pseudo-elementos dos cards e as cinco abas de análise. Limites em [tooling](tooling.md).

## Botões e datas: estilos (G2c)

- `src/styles/page-actions.css`: 114 linhas de botões, variantes/tamanhos, opções de análise e intervalo de datas do diário.
- Carrega depois de `page-surfaces-and-headers.css`, antes dos CSS responsivos; media queries e complementos tardios mantêm a posição original.
- Uso global: shell, páginas, controles gerados e modais. Handlers e estado permanecem no legado.
- Runner shell verifica hover, foco, filtragem e limpeza pelos controles reais; opções nativas têm suas cores computadas amostradas.
- Teste integral de bytes permanece em `tests/study-hub-styles.test.cjs`; uso/limites em [tooling](tooling.md).

## Métricas e indicadores de risco: estilos (G2d)

- `src/styles/metric-cards-and-risk-insights.css`: 300 linhas de grids, cards, tooltips e indicadores comuns.
- Carrega após `page-actions.css`, antes dos CSS responsivos; responsividade em 1420/1080/720 permanece na posição original.
- Apresentação compartilhada em `src/styles`; cálculos e eventos continuam em `app.js`.
- Runner shell cobre tons safe/warn/danger, hover, pseudo-elementos e tooltip acima/abaixo/oculto.
- Cenários isolados: `scripts/lib/metric-style-scenarios.cjs`; contrato integral de bytes e limites visuais mantidos.

## Dashboard e layouts comuns de cards: estilos (G2e)

- `src/styles/dashboard-and-card-layout.css`: 161 linhas de grids, painéis, cabeçalhos, tabelas e containers de gráficos.
- Carrega após `metric-cards-and-risk-insights.css`, antes dos CSS responsivos; overrides responsivos mantêm sua posição original.
- Uso compartilhado entre páginas/modais em `src/styles`; Chart.js, renderers e handlers permanecem no legado.
- Runner shell acrescenta tabela inferior com rolagem horizontal e hover de card de gráfico.
- Cenários: `scripts/lib/dashboard-layout-scenarios.cjs`; fixture não produz overflow vertical, e sticky não tem consumidor encontrado.

## Contas: estilos de risco e caixa (G2f)

- `src/modules/accounts/presentation/account-risk-and-cashflow.css`: 322 linhas de risco, progresso, alertas, cálculo visual e caixa.
- Carrega após `dashboard-and-card-layout.css`, antes dos CSS responsivos; uso no dashboard, setup e editor de contas.
- Apresentação de contas com carga global; renderers, cálculos, handlers e persistência continuam em `app.js`.
- `scripts/lib/account-style-scenarios.cjs`: tons de risco, meta, caixa preenchido nos dois renderers e editor vazio.
- Cenários usam perfil isolado e restauram dados temporários; snapshots protegem storage e contas/trades em memória.
- Contrato integral de bytes mantido; regras sem consumidor encontrado preservadas e limites em [tooling](tooling.md).

## Analytics: ranking e comparação de estratégias (G2g)

- `src/modules/analytics/presentation/strategy-comparison.css`: 201 linhas de ranking, seletores e painel comparativo.
- Carrega após `account-risk-and-cashflow.css`, antes dos CSS responsivos; uso no dashboard, central de estratégias e aba de análise.
- Renderers compartilhados: `renderStrategyRows` em `src/modules/analytics/presentation/strategy-rows.js` e `renderStrategyCompareCards` em `src/modules/analytics/presentation/strategy-comparison.js`; `renderDashStrategyBoard` e eventos dos seletores continuam em `app.js`.
- Cenários isolados: `scripts/lib/strategy-style-scenarios.cjs`; ranking positivo/negativo/vazio, comparação completa e alternância de seleções.
- Overrides tardios e responsivos permanecem nos CSS responsivos. Contrato de bytes e limites em [tooling](tooling.md).

## Calendários: grids e células (G2h)

- `src/modules/calendar/presentation/calendar-grids.css`: 241 linhas do mini calendário, resumo semanal e layouts do calendário.
- Carrega após `strategy-comparison.css`, antes dos CSS responsivos; overrides 1080/720/440 mantêm sua posição original.
- Renderers: `renderDashboardCalendar` em `src/modules/calendar/presentation/dashboard-calendar.js` e `renderCalendar` em `calendar-page.js`; navegação e seleção em `src/modules/calendar/presentation/calendar-controls.js`; estado permanece em `app.js`.
- UI: `week` aparece como Mensal, `biweek` como Quinzenal; `month` permanece acessível pela API global.
- Cenários: `scripts/lib/calendar-style-scenarios.cjs`; modos, hover, rolagem, detalhes do dia, mudança de ano e mês bissexto.
- Resets de estado visual entre capturas, sem mudar contas/trades/storage; limites em [tooling](tooling.md).

## Tabelas e estados de operações (G2i)

- `src/modules/trades/presentation/trade-tables.css`: 148 linhas de tabelas, ordenação, seleção, badges e avisos de incompletos.
- Carrega globalmente após `calendar-grids.css`, antes dos CSS responsivos; `.tbl` e badges mantêm consumidores em outras páginas e no resumo da conta.
- Renderers e handlers continuam em `app.js`; nenhuma alteração de dados ou APIs.
- Cenários: `scripts/lib/trade-table-style-scenarios.cjs`; scroll, sticky, ordenação por P/L, seleção, hover/foco, vazio e flags de incompletude.
- Overrides tardios e responsivos preservados; limites em [tooling](tooling.md).

## Campos de formulário (G2j)

- `src/styles/form-fields.css`: 91 linhas de grids, labels, inputs, selects, textarea, unidades e hints.
- Carrega globalmente após `trade-tables.css`, antes dos CSS responsivos; consumidores incluem operações, simulação, contas, parceiros e StudyHub.
- Cenários: `scripts/lib/form-field-style-scenarios.cjs`; foco em texto/número/select/textarea, unidade, readonly e conteúdo multilinha.
- Overrides responsivos e específicos do StudyHub permanecem nos CSS responsivos ou nos arquivos tardios, na posição original.
- `.field-hint` não possui consumidor encontrado; regra preservada sem criar UI artificial.

## Modais e abas comuns (G2k)

- `src/styles/modal-and-tabs.css`: 80 linhas de overlay, estrutura dos modais e navegação por abas.
- Carrega globalmente após `form-fields.css`, antes dos CSS responsivos; quatro modais e treze botões de aba mantêm consumidores existentes.
- Cenários: `scripts/lib/modal-tab-style-scenarios.cjs`; scroll do modal de operação, footers, diálogo com input e abas de importação, calendário e StudyHub.
- A segunda regra de `.modal-footer` permanece separada e posterior, preservando bordas e alinhamento.
- Overrides responsivos e específicos do StudyHub permanecem tardios; limites em [tooling](tooling.md).

## Toolbar do calendário (G2l)

- `src/modules/calendar/presentation/calendar-toolbar.css`: 27 linhas do cabeçalho, seletor de mês e botões de modo.
- Carrega após `modal-and-tabs.css`, antes dos CSS responsivos; consumidor único em `#page-calendar`.
- Cenário dedicado em `scripts/lib/calendar-style-scenarios.cjs`: foco do picker e valores computados de controles/botões.
- `.gap-8` tardio mantém gap efetivo de 8px; dimensões e `!important` do bloco permanecem iguais.
- Demais estados e limites do calendário continuam em [tooling](tooling.md).

## Upload comum: estilos (G2m)

- `src/styles/upload-zone.css`: 41 linhas de zona, estados hover/drag, input oculto, ícone e textos.
- Carrega após `calendar-toolbar.css`, antes dos CSS responsivos; os overrides scoped do StudyHub permanecem tardios.
- Não há consumidor ativo confirmado das classes globais; `scripts/lib/upload-zone-style-scenarios.cjs` usa fixture descartável.
- Listeners globais de drag/drop, importadores e dados continuam inalterados em `app.js`.

## Seletor de emoções: estilos (G2n)

- `src/modules/trades/presentation/emotion-picker.css`: 29 linhas de grid, chips, seleção, emoji e rótulo.
- Carrega após `upload-zone.css`, antes dos CSS responsivos; não existem overrides posteriores encontrados.
- Não há consumidor ativo confirmado; `scripts/lib/emotion-picker-style-scenarios.cjs` usa fixture descartável.
- Estado `.selected` preservado; nenhuma lógica de operação ou configuração foi alterada.

## Tags e edição: estilos (G2o)

- `src/styles/tag-editor.css`: 79 linhas de listas, tags, contagem, botões e estados hover.
- Compartilhado entre Setup editável e nuvens somente leitura do Profile; carrega antes dos CSS responsivos.
- `scripts/lib/tag-editor-style-scenarios.cjs` usa renderizadores reais e uma fixture apenas para `.tag-add` sem consumidor.
- Edição, exclusão, configuração, dados e storage não são modificados pelos cenários.

## Alertas e utilitários: estilos (G2p)

- `src/styles/alerts-and-utilities.css`: 52 linhas de alertas, separador e utilitários flex/espaçamento/largura.
- Consumidores incluem Import, Setup, Trades e headers de Calendar/Stats/Premarket.
- `scripts/lib/alert-utility-style-scenarios.cjs` usa consumidores reais e fixture apenas para `.w-full`/warning isolado.
- Overrides responsivos e específicos de Import/StudyHub permanecem posteriores nos CSS responsivos ou scoped.

## Ações de operações: estilos (G2q)

- `src/modules/trades/presentation/trade-actions.css`: 48 linhas da barra em lote e fluxo de navegação do modal.
- `scripts/lib/trade-action-style-scenarios.cjs`: barra oculta/selecionada e fluxo visível do modal em três larguras.
- Seleção altera somente estado transitório; contas, trades e storage permanecem intactos.
- Handlers de editar/completar/duplicar/excluir continuam no legado.

## Premarket e erros de operação: estilos (G2r)

- `src/modules/routine/presentation/premarket.css`: checklist e grade mensal da rotina.
- `src/modules/trades/presentation/error-chips.css`: chips do modal de operação.
- `scripts/lib/premarket-error-chip-style-scenarios.cjs`: seis estados em três larguras, sem persistência.
- Renderer da página em `src/modules/routine/presentation/premarket-page.js`; handlers e persistência continuam em `app.js`; `.pm-check` foi preservado sem consumidor localizado.

## Premarket: renderer de página (G3e)

- `src/modules/routine/presentation/premarket-page.js`: `renderPremarket` global, 60 linhas movidas intactas de `app.js`; script clássico síncrono antes dos outros renderers e de `app.js`.
- Estado de mês, conta ativa, hábitos, ações e persistência continuam no legado; `showPage`, `refreshAll`, navegação mensal e edição de hábitos preservam os consumidores.
- `tests/premarket-page.test.cjs` caracteriza resultados, grade, fevereiro bissexto, ausência de alvo e ordem de carga; smoke abre a rotina e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3d; todos idênticos, com 52 imagens/191 pixels dentro da tolerância existente.

## Documentação sob demanda

- [Análise global de modularização](modularization-analysis.md): desenho atualizado dos cortes e estratégia para preservar código.
- Inventários de extração: [JavaScript](javascript-extraction-map.md), [CSS/cascata](css-extraction-map.md), [HTML/páginas](html-extraction-map.md).
- [Arquitetura atual](current-architecture.md): stack, números, hotspots e riscos.
- [Catálogo de módulos](module-map.md): entradas e dependências por feature.
- [Arquitetura alvo](target-architecture.md) e [dependências](dependency-rules.md): fronteiras novas.
- [Roadmap](refactoring-roadmap.md) e [progresso](refactoring-progress.md): próximo lote e validações.
- [ADRs](adr/): decisões; consultar somente a decisão relevante.

Não reescanear caches, dependências instaladas ou o repositório inteiro para tarefas locais.

## Transferência de dados: estilos (G2s)

- `src/modules/data-transfer/presentation/data-transfer.css`: 155 linhas de importação, backup e exportação.
- `scripts/lib/data-transfer-style-scenarios.cjs`: abas reais, layout e dados/storage em nove larguras, incluindo 720±1 e 1420±1.
- Overrides responsivos permanecem nos CSS responsivos; handlers, importadores, download e restauração continuam em `app.js`.

## Diálogo comum: estilos (G2t)

- `src/styles/application-dialog.css`: largura, texto multilinha, input e erro do diálogo comum.
- `scripts/lib/modal-tab-style-scenarios.cjs`: input/foco, confirmação sem input e erro por valor incorreto, em três larguras.
- `openAppDialog`, `confirmAppDialog` e wrappers confirm/notice/prompt estão em `src/app/presentation/app-dialog.js`; `appDialogState` permanece em `app.js`.

## Rodapé da navegação: estilos (G2u)

- `src/styles/navigation-footer.css`: três regras tardias do rodapé e links secundários da sidebar.
- `scripts/lib/navigation-footer-style-scenarios.cjs`: hover, rolagem e seleção ativa/idempotente de Profile em três larguras.
- Regras anteriores de navegação e `margin-top:auto` permanecem em `navigation-and-account-summary.css`; handlers continuam no legado.

## Grids compartilhados: estilos (G2v)

- `src/styles/workspace-grids.css`: seis regras de layout de estratégias, perfil e parceiros, preservadas na ordem original.
- `scripts/lib/workspace-grid-style-scenarios.cjs`: grids reais em seis larguras; inclui perfil secundário, margem do último filho e parceiros legados ocultos.
- Responsividade até 1420px permanece em `src/styles/responsive-desktop-tablet.css`; renderers, handlers e dados continuam no legado.

## StudyHub: estilos nativos (G2w)

- `src/modules/study-hub/presentation/study-hub-native.css`: abas/root e estilos de markup nativo; 297 linhas, carregadas antes dos CSS responsivos.
- `scripts/lib/study-hub-native-style-scenarios.cjs`: quatro abas, hover ativo/inativo, foco e rolagem horizontal/sticky em oito larguras.
- Markup nativo de grids/cards/ranges não é montado pelo renderer atual; regras preservadas sem fabricar consumidores.
- Overrides responsivos, montagem legada, handlers, cálculos e storage permanecem na posição original.

## Resumos compartilhados: estilos (G2x)

- `src/styles/workspace-summaries.css`: métricas do perfil, status/notificações, chips analíticos e espaçamento do ranking ampliado; 156 linhas.
- `scripts/lib/workspace-summary-style-scenarios.cjs`: seis cenários em seis larguras; real profile e renderers existentes com fixture de markup restaurável.
- Wrapping de status e hero em uma coluna até 720px permanecem nos CSS responsivos; cálculos, handlers e dados não alterados.

## Documentos: navegação e editor (G2y)

- `src/modules/documents/presentation/doc-browser-and-layout.css`: shell, cards, pastas, entradas e metadados agrupados; 192 linhas.
- `src/modules/documents/presentation/doc-editor-and-media.css`: contexto do trade, toolbar, textarea, mídia e estados vazios; 173 linhas.
- Links adjacentes após resumos compartilhados; `.doc-empty` mantém o override tardio e media queries 1420/1240/1080px permanecem nos CSS responsivos.
- Renderer principal em `src/modules/documents/presentation/documents-page.js`; `renderDocumentMedia`, `selectDocumentFolder`, `selectDocumentEntry` e persistência permanecem em `app.js`.
- `scripts/lib/document-style-scenarios.cjs`: 41 casos de notas gerais/diárias/trades/vazio, foco, hover e overflow; dados temporários restaurados, sem salvar/remover/upload.

## Documentos: renderer de página (G3d)

- `src/modules/documents/presentation/documents-page.js`: `renderDocumentsPage` global, 137 linhas movidas intactas de `app.js`; script clássico síncrono antes dos renderers de contas/parceiros/perfil e de `app.js`.
- Estado de pasta/seleção, helpers, ações e persistência continuam no legado; `showPage`, `refreshAll` e callbacks de documentos preservam os consumidores. A mídia foi separada no G3s.
- `tests/documents-page.test.cjs` caracteriza lista, editor, vazio, contexto de trade, alvos ausentes e ordem de carga; smoke abre documentos e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3c; todos idênticos, com 52 imagens/188 pixels dentro da tolerância existente.

## Contas: visão geral (G2z)

- `src/modules/accounts/presentation/account-overview.css`: grid, cards, resumo, estatísticas e barras de risco; 115 linhas.
- Carrega após os dois CSS de documentos, antes dos CSS responsivos; `.account-overview-card` preserva as regras comuns anteriores e os overrides tardios em 1420/720px.
- Consumidor: contêiner `#accountsOverview` em `index.html`, preenchido por `renderAccountsPage` em `src/modules/accounts/presentation/accounts-page.js`; cálculo de risco e ações permanecem no legado.
- `scripts/lib/account-overview-style-scenarios.cjs`: 17 cenários de conta única, duas contas, vazio e nome longo; memória/storage restaurados.

## Parceiros: editor e apoio (G2aa)

- `src/modules/partners/presentation/partners.css`: 127 linhas de editor de afiliados, estados vazios, apoio e QR; carregado após a visão geral de contas e antes dos CSS responsivos.
- Consumidores ativos: `#partnerAffiliatesEditor`, `.partner-support-form`, `#partnerBtcQrPreview` e `renderPartnersPage`; `#partnersGrid` legado permanece oculto.
- `scripts/lib/partner-style-scenarios.cjs`: 32 estados de vazio/afiliados/QR nas larguras 390, 719/720/721, 1419/1420/1421 e 1440px; fixture restaura configuração/storage.
- Regras legadas de `.partner-card` e classes sem markup ativo seguem intactas; overrides responsivos permanecem tardios.

## Parceiros: renderer de página (G3b)

- `src/modules/partners/presentation/partners-page.js`: `renderPartnersPage` global, movida sem reescrita de `app.js`; script clássico síncrono antes do perfil e de `app.js`.
- Estado/configuração, salvamento, upload e handlers inline continuam no legado; `showPage`, `refreshAll` e callbacks de edição mantêm os consumidores.
- `tests/partners-page.test.cjs` caracteriza vazio, afiliado/QR, escaping, handlers e ausência de alvos; smoke navega a parceiros e exercita refresh.
- Matriz visual v29 comparou 922 estados com a referência anterior ao corte; todos idênticos, com 47 imagens/168 pixels dentro da tolerância existente.

## Contas: renderer de página (G3c)

- `src/modules/accounts/presentation/accounts-page.js`: `renderAccountsPage` global, movida intacta de `app.js`; script clássico síncrono antes dos renderers de parceiros/perfil e de `app.js`.
- Estado, cálculos de risco, salvamento e handlers continuam no legado; `saveAccount`, exclusão, `showPage` e `refreshAll` preservam os consumidores.
- `tests/accounts-page.test.cjs` caracteriza contas múltiplas, vazio, alvos opcionais e ordem de carga; smoke abre contas e exercita refresh.
- Matriz visual v29 comparou 922 estados com G3b; todos idênticos, com 59 imagens/291 pixels dentro da tolerância existente.

## Perfil: complemento tardio das tags (G2ab)

- `src/styles/tag-cloud.css`: 13 linhas de espaçamento dos três grupos e títulos da nuvem de tags; carregado após parceiros e antes dos CSS responsivos.
- Consumidor: `renderProfilePage` preenche `#profileTags`; `.tag-list`/`.tag` anteriores continuam em `src/styles/tag-editor.css`.
- `scripts/lib/tag-editor-style-scenarios.cjs` inclui nove estados de nuvem padrão/vazia/texto longo em 390/720/1440px; dados e storage restaurados.

## Perfil: renderer de página (G3a)

- `src/modules/profile/presentation/profile-page.js`: `renderProfilePage` global, movida sem reescrita de `app.js`; carrega como script clássico síncrono imediatamente antes de `app.js`.
- Continua lendo conta/trades/config e delegando métricas, risco e alertas às funções legadas no momento da chamada; `showPage` e `refreshAll` mantêm os consumidores.
- `tests/profile-page.test.cjs` caracteriza hero, risco, tags, alertas e nós opcionais; smoke navega ao perfil e exercita refresh.
- Matriz visual v29 comparou 922 estados com a referência anterior ao corte; todos idênticos, com 56 imagens/372 pixels dentro da tolerância existente.

## Shell: animação de entrada (G2ac)

- `src/styles/page-motion.css`: `@keyframes fade-up` de 12 linhas, carregado após a nuvem de tags e antes das media queries residuais.
- Consumidor: `.page.active` em `src/styles/page-surfaces-and-headers.css`; nome, duração, easing e quadros originais preservados.
- `scripts/shell-style-check.cjs`: CSSOM caracteriza os quadros 0% e 100% antes de desativar animações para as capturas estáveis.

## Shell: responsividade desktop/tablet (G2ad)

- `src/styles/responsive-desktop-tablet.css`: três media queries completas de 1420/1240/1080px, 260 linhas; link após `page-motion.css` e antes de `responsive-mobile.css`.
- Regras afetam shell, sidebar, dashboards, documentos, grids e StudyHub. A ordem preserva o override de `#sidebar` (`100dvh` em 1240px; `100vh` em 1080px).
- Matriz v29 caracteriza 922 estados, incluindo 1080/1240/1420±1; 922 estados idênticos após o corte, com 46 imagens/263 pixels dentro da tolerância existente.

## Shell: responsividade mobile (G2ae)

- `src/styles/responsive-mobile.css`: duas media queries completas de 720/440px, 316 linhas; ocupa a posição anterior de `styles.css`, antes dos quatro CSS legados StudyHub.
- `styles.css` foi removido após esgotar o residual; nenhum script, dado persistido ou seletor mudou.
- Matriz v29 inclui 390, 439/440/441 e 719/720/721px; demais larguras e páginas continuam na comparação integral.

## Notificações: renderer da página (G3h)

- `src/modules/notifications/presentation/notifications-page.js`: `renderNotificationsPage` global, oito linhas movidas byte a byte; script clássico síncrono antes de psicologia e de `app.js`.
- `getActiveAccount`, `getAccountTrades`, `buildOperationalAlerts` e estado permanecem no legado; `renderStatusList` em `src/shared/presentation/status-list.js`; consumidores `showPage` e `refreshAll` intactos.
- `tests/notifications-page.test.cjs`: conta ativa em cada chamada, cópia sem mutação, mensagem vazia, propagação de falhas e ordem de carga.
- 91 testes Node e 58 checks no navegador; matriz visual completa não repetida: não houve alteração de HTML gerado/CSS, e o fluxo real foi exercitado no smoke.

## Calendário: renderer da página (G3i)

- `src/modules/calendar/presentation/calendar-page.js`: `renderCalendar` global, 97 linhas movidas byte a byte; script clássico síncrono antes de notificações e de `app.js`.
- Estado `calYear/calMonth/calViewMode`, métricas e helpers de datas continuam no legado; handlers em `calendar-controls.js` após G3o. Consumidores: `calNav`, `calGoToMonth`, `setCalView`, `showPage` e `refreshAll`.
- `tests/calendar-page.test.cjs`: mensal/semanal/quinzenal, bissexto, totais, vazio, tradução e limite existente do último dia nas métricas do período.
- 97 testes Node e 64 checks no navegador; sem matriz visual completa nova neste corte de corpo intacto e CSS inalterado.

## Stops e taxas: apresentação (G3j)

- `src/modules/analytics/presentation/stop-fee-analysis.js`: `renderStopFeeAnalysis` global, 51 linhas movidas byte a byte; script clássico síncrono antes de calendário e de `app.js`.
- No G3j, o consumidor `renderStats` permaneceu intacto e nenhum cálculo financeiro foi extraído; desde o G5p, `buildStopFeeAnalysis` está em `accounts/application/account-risk-workflows.js`, enquanto `fR` e `mkTip` seguem nas dependências existentes.
- `tests/stop-fee-analysis.test.cjs`: quatro cards, tons, limite inclusivo de 25%, escolha edge/drag, tooltips, formatação e alvo ausente.
- 102 testes Node e 67 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Calendário compacto do dashboard (G3k)

- `src/modules/calendar/presentation/dashboard-calendar.js`: `renderDashboardCalendar` global, 56 linhas movidas byte a byte; script clássico síncrono antes de stops/taxas e de `app.js`.
- Consumidor `renderDashboard` intacto; `getAnchorTradeDate`, `t`, `fR` e seleção de trades permanecem no legado.
- `tests/dashboard-calendar.test.cjs`: mês âncora, bissexto, estados ganho/perda/hoje, totais diários/semanais, vazio, não-array e alvos ausentes.
- 107 testes Node e 71 checks no navegador, incluindo refresh e navegação pela célula; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Linhas de estratégias compartilhadas (G3l)

- `src/modules/analytics/presentation/strategy-rows.js`: `renderStrategyRows(targetId, rows, limit=5)` global, 23 linhas movidas byte a byte; script clássico síncrono antes do hub e de `app.js`.
- Consumidores: `renderDashStrategyBoard` no legado e `renderStrategyHub` no módulo de apresentação; `escapeHtml`, `fR`, `formatStrategyRatio` e snapshots continuam no legado.
- `tests/strategy-rows.test.cjs`: ordem, escaping, sinais, métricas, normalização das barras, limite/default/slice, vazio e alvo ausente.
- 112 testes Node e 74 checks no navegador; dashboard/refresh e quantidade de linhas no hub exercitados. Sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Comparação de estratégias (G3at)

- `src/modules/analytics/presentation/strategy-comparison.js`: `renderStrategyCompareCards(rows)` global, 223 linhas movidas byte a byte; script clássico síncrono depois de `strategy-rows.js` e antes de `app.js`.
- `tests/strategy-comparison.test.cjs`: guard do painel, estado vazio, seleção duplicada, comparação completa, resumos, vencedores, quatro gráficos e carga.
- Consumidor `renderStats` preservado; métricas, timing, Chart.js, formatação e helpers continuam nas dependências existentes.
- `app.js`: 8.412 para 8.188 linhas. 280 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Página de análises (G3au)

- `src/modules/analytics/presentation/statistics-page.js`: `renderStats()` global, 193 linhas movidas byte a byte; script clássico síncrono depois de `strategy-comparison.js` e antes de `app.js`.
- `tests/statistics-page.test.cjs`: seleção de conta, escopo de risco, vazio, gráficos, histograma, símbolos, dias, horários e carga.
- Handlers HTML, abas e filtros preservados; métricas, risco, timing, estratégias, Chart.js, formatação e simulação continuam nas dependências existentes.
- `app.js`: 8.188 para 7.995 linhas. 285 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Dashboard: renderer principal (G3m)

- `src/modules/analytics/presentation/dashboard-page.js`: `renderDashboard` global, 69 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- Consumidores preservados: bootstrap, `setMode`, `toggleEqMode`, `refreshAll`, `showPage` e handler de período no HTML.
- Métricas, filtros, estado, datasets, risco, formatação e helpers continuam no legado; composição usa os componentes globais já extraídos.
- `tests/dashboard-page.test.cjs`: cards, sete gráficos, ordem/percentuais da curva, defaults, zero, recentes/limite 20, tooltips idempotentes e carga clássica.
- 119 testes Node e 78 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Modo da curva de equity (G3ar)

- `src/modules/analytics/presentation/dashboard-equity-mode.js`: `toggleEqMode()` global, seis linhas movidas byte a byte; script clássico síncrono depois de `dashboard-page.js` e antes de `app.js`.
- `tests/dashboard-equity-mode.test.cjs`: alternância valor/percentual, labels, fallback desconhecido, botão opcional, ordem dos efeitos e carga.
- Handler HTML e dois checks do smoke preservados; `eqMode`, curva, Chart.js e `renderDashboard` permanecem nas dependências existentes.
- 270 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Painel de risco do dashboard (G3n)

- `src/modules/accounts/presentation/risk-board.js`: `renderRiskBoard` global, 136 linhas movidas byte a byte; script clássico síncrono antes do dashboard.
- Consumidor `src/modules/analytics/presentation/dashboard-page.js` intacto; desde o G5p, `calcAccountRiskState` está em `accounts/application/account-risk-workflows.js`; formatação, tons e tooltips seguem nas dependências existentes.
- `tests/risk-board.test.cjs`: quatro barras/sinais, excessos, metas, thresholds, raw usage, defaults zero, larguras sem teto e alvos ausentes.
- 126 testes Node e 81 checks no navegador. Sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Controles do calendário (G3o)

- `src/modules/calendar/presentation/calendar-controls.js`: globals `calNav`, `calGoToMonth`, `syncCalPicker`, `setCalView`, `showCalDay`; cinco declarações/41 linhas movidas byte a byte.
- Script clássico síncrono antes do renderer; consumidores HTML, `calendar-page.js` e bootstrap preservados. Estado global e helpers continuam em `app.js`.
- `tests/calendar-controls.test.cjs`: virada de ano, parsing, ordem de sync/render, modos, controles opcionais e tabela de trades/dia vazio.
- 133 testes Node e 84 checks no navegador. Sem matriz visual completa nova neste corte de corpos/HTML gerado intactos e CSS inalterado.

## Psicologia: estatísticas em análises (G3p)

- `src/modules/psychology/presentation/psychology-statistics.js`: `renderStatsPsych` global, 59 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- Consumidor `switchStatTab('psych')` intacto; seleção de período e helpers de hesitação/disciplina e resumo permanecem no legado; cálculos locais do renderer foram movidos intactos.
- `tests/psychology-statistics.test.cjs`: quatro cards, cinco gráficos, resumos, limites de hesitações/erros, tabela, vazio e alvo opcional.
- 139 testes Node e 88 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Abas de estatísticas (G3ap)

- `src/modules/analytics/presentation/statistics-controls.js`: `switchStatTab(id,el)`, `toggleCustomPeriod()` e `onStatsAccountChange()` globais; script clássico síncrono depois de `psychology-statistics.js` e antes de `app.js`.
- `tests/statistics-tabs.test.cjs`: cinco painéis, classes, elemento opcional, ID desconhecido, fallback geral, psicologia, ordem da simulação e carga.
- Cinco handlers HTML e dois cenários do smoke permanecem intactos; renderers, filtros, estado e cálculos continuam nas dependências existentes.
- 260 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Filtros de estatísticas (G3aq)

- Os controles de filtro compartilham `statistics-controls.js` com as abas por pertencerem à mesma navegação da página de estatísticas.
- `tests/statistics-filters.test.cjs`: período personalizado/predefinido, fallback, barra opcional, fixação da conta antes do renderer e carga.
- Dois handlers HTML preservados; `statsAccountPinned`, seleção, datas, filtragem e `renderStats` permanecem nas dependências existentes.
- 265 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Lista de status compartilhada (G3q)

- `src/shared/presentation/status-list.js`: `renderStatusList(targetId, items, emptyMessage=...)` global, 17 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- Reuso real por notificações, perfil, hub de estratégias e StudyHub; nenhuma nova camada de dados ou IO.
- `tests/status-list.test.cjs`: vazio, ordem, escaping, ações, valores falsy/truthy, alvo ausente e carga. Interpolações legadas de mensagens/handlers mantidas.
- 145 testes Node e 91 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumos analíticos compartilhados (G3r)

- `src/shared/presentation/analysis-summary.js`: `renderAnalysisSummary(containerId, items=[])` global, 10 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- Reuso real pela comparação de estratégias em `app.js` e pelas estatísticas de psicologia extraídas; dados e cálculos permanecem nos respectivos produtores.
- `tests/analysis-summary.test.cjs`: ordem, tons, escaping, defaults, itens falsy, vazio/não-array, alvo ausente e carga.
- 150 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Mídia de documentos (G3s)

- `src/modules/documents/presentation/document-rendering-helpers.js`: `renderDocumentMedia(entry)` e `renderDocFolderIcon(type)` globais; helpers puros de markup carregados antes de `documents-page.js` e `app.js`.
- `tests/document-media.test.cjs`: mensagens vazias por origem, ordem, URLs, escaping, fallback, índices de remoção, ausência de mutação, falhas e carga.
- `documents-page.js` mantém o consumidor; helpers de imagem, remoção e persistência continuam no legado.
- 154 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Caixa no formulário de conta (G3t)

- `src/modules/accounts/presentation/account-cashflow-form.js`: `renderAccountCashflowList()` global, 22 linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/account-cashflow-form.test.cjs`: guard de DOM, vazio, resumo, sinais, tons, ordem, tipos, datas, valores, escaping, handlers, não mutação e carga.
- Cálculo, estado temporário, inclusão, remoção e persistência continuam no legado; consumidores de cadastro/edição preservados.
- 159 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Caixa na configuração (G3u)

- `src/modules/accounts/presentation/setup-cashflow-list.js`: `renderSetupCashflowList()` global, 24 linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/setup-cashflow-list.test.cjs`: guards de DOM/conta, vazio, cálculo, resumo, sinais, tons, ordem, tipos, datas, valores, escaping, handlers, não mutação e carga.
- Consulta da conta, cálculo, inclusão, exclusão e persistência continuam no legado; consumidores de setup preservados.
- 165 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumo de risco na configuração (G3v)

- `src/modules/accounts/presentation/setup-risk-summary.js`: `renderSetupRiskSummary()` global, 14 linhas movidas byte a byte; script clássico síncrono antes dos demais renderers de setup e de `app.js`.
- `tests/setup-risk-summary.test.cjs`: guard de conta, dependências, oito campos, sinais, defaults percentuais, alvos opcionais, não mutação e carga.
- Conta e trades seguem nas dependências existentes; desde o G5p, `calcAccountRiskState` está em `accounts/application/account-risk-workflows.js`; consumidores de setup preservados.
- 170 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Lista de contas (G3w)

- `src/modules/accounts/presentation/account-list.js`: `renderAccountList()` global, cinco linhas movidas byte a byte; script clássico síncrono antes de `accounts-page.js` e `app.js`.
- `tests/account-list.test.cjs`: guard de DOM, vazio, uma/múltiplas contas, dependências, ordem, campos, ações, não mutação e carga.
- Seleção, edição, exclusão, consulta de trades, cálculo de risco e formatação continuam como dependências globais; interpolações legadas permanecem intactas.
- 175 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Página de configuração de risco (G3x)

- `src/modules/accounts/presentation/risk-setup-page.js`: `renderSetup()` global, 17 linhas movidas byte a byte; script clássico síncrono após seus componentes e antes de `app.js`.
- `tests/risk-setup-page.test.cjs`: precedência conta/configuração, preservação de zeros, defaults `??`/`||`, data, campos opcionais, chamadas dependentes e carga.
- Estado, formulário, salvamento, tags e cálculo financeiro continuam no legado ou nos renderers já separados; dois consumidores preservados.
- 179 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Resumo da conta no shell (G3y)

- `src/app/presentation/topbar.js`: `renderTopbarAccount()` permanece global no componente coeso da topbar, antes de `accounts-page.js` e `app.js`.
- `tests/account-summary.test.cjs`: guard de conta, cor, nome, label de tipo, targets independentes, não mutação e carga.
- Conta ativa, normalização, seleção, tipo e métricas do topbar continuam no legado; cinco consumidores preservados.
- 183 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Valor responsivo do topbar (G3ac)

- `src/app/presentation/topbar.js`: `renderTopbarValue(id)` permanece global no componente coeso da topbar, antes dos consumidores e de `app.js`.
- `tests/topbar-value.test.cjs`: cache ausente, target ausente, densidade completa/compacta, título, argumentos de classe e carga.
- Cache, densidade, formatação e atualização das métricas permanecem nas dependências existentes; dois consumidores preservados.
- 199 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Saldo da conta no shell (G3ai)

- `src/modules/accounts/presentation/account-balance-chrome.js`: `syncAccountBalanceChrome(acct,acctTrades)` global, 15 linhas movidas byte a byte; script clássico síncrono antes do dashboard e de `app.js`.
- `tests/account-balance-chrome.test.cjs`: argumentos padrão, conta ausente, retorno, saldo, variação positiva/negativa, contagem, alvos opcionais e carga.
- Conta ativa, trades, cálculo de risco e formatação permanecem nas dependências existentes; quatro consumidores preservados.
- 226 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Tags da configuração de risco (G3al)

- `src/modules/accounts/presentation/risk-tags.js`: `renderTags(type)` global, 16 linhas movidas byte a byte; script clássico síncrono antes de `risk-setup-page.js` e `app.js`.
- `tests/risk-tags.test.cjs`: guard do DOM, tags comuns, lista inválida, estratégias, ordem, escaping, contagem de uso, controles e carga.
- Normalização, contagem de uso, edição, exclusão e persistência permanecem nas dependências existentes; cinco chamadas preservadas.
- 242 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Prévia das imagens da operação (G3ad)

- `src/modules/trades/presentation/trade-form.js`: `renderImagePreviews()` permanece global no formulário consolidado, antes dos consumidores e de `app.js`.
- `tests/trade-images.test.cjs`: guard do DOM, vazio, ordem, URLs, títulos, estilos, índices de remoção, não mutação e carga.
- Upload, `FileReader`, normalização, remoção e persistência permanecem no legado; quatro consumidores preservados.
- 203 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Duração da operação no formulário (G3aj)

- `src/modules/trades/presentation/trade-form.js`: `updateTradeDurationField()` permanece global no formulário consolidado.
- `tests/trade-duration-field.test.cjs`: guard do DOM, datas, horários, fallback da data de saída, dependências, duração nula/zero e carga.
- Cálculo e formatação temporal permanecem nas dependências existentes; três chamadas JavaScript e quatro handlers HTML preservados.
- 231 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Desvio do plano no formulário (G3as)

- `src/modules/trades/presentation/trade-form.js`: `togglePlanDeviation()` permanece global no formulário consolidado.
- `tests/trade-plan-deviation.test.cjs`: guard do DOM, opções sim/não, fallback do campo ausente, ordem da disciplina e carga.
- Handler HTML preservado; `autoDisc`, dados do formulário e persistência permanecem nas dependências existentes.
- 275 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Fluxo visual de trades incompletos (G3ak)

- `src/modules/trades/presentation/incomplete-trade-flow.js`: `updateTradeModalFlowUI()` global, 31 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/incomplete-trade-flow.test.cjs`: alvos ausentes/parciais, cadastro, edição, fluxo único/múltiplo, símbolo, progresso, navegação e carga.
- Fila, índice, trade em edição, navegação e mutações permanecem no legado; dois consumidores preservados.
- 237 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Aviso de consulta do diário (G3ae)

- `src/modules/trades/presentation/trade-log-read-only-notice.js`: `renderLogReadOnlyNotice(accountFilter)` global, 16 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/trade-log-read-only-notice.test.cjs`: guard do DOM, estado desbloqueado, todas as contas, conta específica, mensagens, escaping, não mutação e carga.
- Filtro, conta ativa, nomes e decisão de bloqueio permanecem no legado; consumidor de `renderLog` preservado.
- 208 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Chips de erros da operação (G3af)

- `src/modules/trades/presentation/trade-error-chips.js`: `renderErrorChips()` global, 12 linhas movidas byte a byte; script clássico síncrono antes dos consumidores e de `app.js`.
- `tests/trade-error-chips.test.cjs`: guard do DOM, vazio, normalização, deduplicação, ordem, seleção, encoding, escaping, não mutação e carga.
- Catálogo, seleção, toggle, disciplina, formulário e persistência permanecem no legado; quatro consumidores preservados.
- 212 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Métricas do diário (G3ag)

- `src/modules/trades/presentation/trade-log-metrics.js`: `renderLogMetrics(arr,incompleteCount)` global, 19 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/trade-log-metrics.test.cjs`: guard do DOM, quatro cards, sinais, win rate, risco médio, incompletos, não mutação e carga.
- `calcMetrics`, `fR`, filtros e estado do diário permanecem nas dependências existentes; consumidor de `renderLog` preservado.
- 216 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Barra de seleção do diário (G3ah)

- `src/modules/trades/presentation/trade-log-selection.js`: `updateBulkBar()` global, 26 linhas movidas byte a byte; script clássico síncrono antes de `app.js`.
- `tests/trade-log-selection.test.cjs`: guard do DOM, seleção vazia/simples/múltipla, incompletos, textos, classes, ações, checkbox geral e carga.
- `selectedTrades`, busca de incompletos e comandos de seleção permanecem no legado; quatro consumidores preservados.
- 221 testes Node e 95 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Página do diário (G3av)

- `src/modules/trades/presentation/trade-log.js`: `renderLog()`, `fmtMissingField()` e `tradeRow()` globais, três funções/87 linhas movidas byte a byte; script clássico síncrono depois dos componentes do diário e antes de `app.js`.
- `tests/trade-log-page.test.cjs`: filtros, ordem da orquestração, vazio, alerta de incompletos, labels e linhas compacta/completa.
- Quatro handlers HTML e consumidores JavaScript preservados; filtros, contas, seleção, formatação, mutações e persistência continuam nas dependências existentes.
- `app.js`: 7.995 para 7.907 linhas. 293 testes Node e 96 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Ícones das pastas de documentos (G3z)

- `src/modules/documents/presentation/document-rendering-helpers.js`: `renderDocFolderIcon(type)` permanece global ao lado do renderer de mídia, antes de `documents-page.js` e `app.js`.
- `tests/document-folder-icon.test.cjs`: wrapper, contrato SVG acessível, quatro tipos, paths distintos, fallback e carga.
- Navegação, pastas, estado e persistência continuam no legado ou em `documents-page.js`; dois consumidores preservados.
- 187 testes Node e 92 checks no navegador; sem matriz visual completa nova neste corte de corpo/HTML gerado intactos e CSS inalterado.

## Dados demonstrativos (G5l)

- `src/modules/trades/application/demo-data.js`: `buildTickmillDemoImport`, `loadTickmillDemoImport`, `buildSampleTrades`, `ensureSampleStrategies`, `loadSampleData` e `addSampleTrades` em um módulo coeso de aplicação/245 linhas.
- Mantém 300 trades determinísticos por conta/data, 40 registros Tickmill, IDs, datas, valores, estratégias, confirmação, persistência, notices e APIs globais.
- Script clássico síncrono antes de `navigation.js` e `app.js`; consumidores HTML e bootstrap permanecem intactos.
- `tests/demo-data.test.cjs`: assinatura SHA-256 do dataset e ordem de bloqueio, importação, confirmação, `save`, refresh e notice.

## Bootstrap e cotação (G5m)

- `src/app/application/bootstrap-app.js`: callback global de carga em 64 linhas; restauração, seeds, normalização, documentos padrão, resize e ordem dos renderers preservados.
- `src/modules/preferences/infrastructure/exchange-rate.js`: estado, persistência, fetch e intervalo da cotação USD/BRL em 50 linhas; AwesomeAPI e integração StudyHub intactas.
- Scripts clássicos síncronos antes de `navigation.js` e `app.js`; `tests/app-bootstrap.test.cjs` e `tests/exchange-rate.test.cjs` caracterizam os contratos antes do corte.

## Workflows de operações (G5n)

- `src/modules/trades/application/trade-workflows.js`: 15 APIs globais/255 linhas para salvar, selecionar, completar, duplicar, excluir e consultar operações.
- Mantém cálculos derivados de risco/R/P&L, payload persistido, edição, fluxo sequencial de incompletos, confirmação dupla e filtros do diário.
- Um único script clássico antes dos componentes de apresentação de trades; `tests/trade-workflows.test.cjs` caracteriza os fluxos antes do corte.

## Formulário de operações (G5o)

- `src/modules/trades/presentation/trade-form.js`: 11 APIs globais/249 linhas para disciplina, reset, preenchimento, R/R, duração, desvio, opções, conta, mercado e imagens.
- Consolida cinco arquivos pequenos da mesma responsabilidade e extrai quatro corpos de `app.js`; não cria wrappers ou abstrações novas.
- `tests/trade-form.test.cjs` protege disciplina, defaults, cópias e modos percentual/absoluto; testes anteriores continuam cobrindo cada componente.
