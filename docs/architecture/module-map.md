# Mapa de módulos

Catálogo funcional da baseline `ab0cb63`. Os módulos são responsabilidades existentes dentro
de `app.js`, não diretórios já separados. Localizar símbolos com Serena antes de ler trechos.

| Feature | Entradas/símbolos | Dependências atuais |
|---|---|---|
| Shell/navegação | `showPage`, `refreshAll`, callback `window.load` | IDs `page-*`, funções globais, contas e estado |
| Operações | `saveTrade`, `renderLog`, `duplicateTrade`, `getLogFilteredTrades` | Formulário, `trades`, contas, `save`, métricas |
| Contas/risco | `normalizeAccount`, `calcAccountRiskState`, `saveAccount`, `renderAccountsPage` | `accounts`, trades, calendário atual, cashflows, formatação |
| Dashboard | `renderDashboard`, `calcMetrics`, `renderRiskBoard` | Conta ativa, filtros, Chart.js, DOM |
| Estratégias/análises | `getStrategySnapshots`, `renderStrategyCompareCards`, `renderStats`, `renderStrategyHub` | Trades, timing, métricas, Chart.js |
| Calendário/rotina | `renderCalendar`, `renderPremarket`, `savePM` | Trades, `preMarketData`, datas, storage |
| Psicologia | `renderPsych`, `renderStatsPsych`, `buildHesitationStats` | Campos subjetivos das operações e gráficos |
| Simulação principal | `calculateSimulationSizing`, `buildSimulationPlan`, `renderSimulation` | Helpers numéricos, conta ativa, configuração, formatação e gráficos |
| Importação | `parseMT5Rows`, `parseGenericTradeRows`, `parseMT5HTML`, `confirmImport` | FileReader, datas, IDs, normalizadores, contas e `save` |
| Backup/exportação | `createBackupPayload`, `restoreBackupData`, `exportJSON`, `buildTradesCSV` | Estado global, JSON, CSV, Blob, confirmação e storage |
| StudyHub nativo | `renderStudyHub`, `buildStudySimulation`, `syncStudyHubLegacyInputs` | Estado `studyHubState`, conta, risco, DOM legado e `window.sh_*` |
| StudyHub legado | `shInitLegacyModule`, `calcSimulador`, `calcCiclos`, `tsRunAll`, `fmSimular` | IIFE própria, template integrado, Chart.js e chaves storage próprias |
| Intraday adicional | `studyHubBuildIntradayRows`, `studyHubEnhanceIntradayImpact` | IIFE própria; wrappers de `sh_buildIntraday`/`sh_tsRunAll` |
| Documentos/imagens | `renderDocumentsPage`, `saveCurrentDocument`, `getDocumentEntries` | Trades, rotina, `config.generalDocs`, FileReader, DOM |
| Parceiros | `renderPartnersPage`, `ensurePartnerHubConfig` | `config.partnerHub`, links, imagens, clipboard |
| Perfil/notificações | `renderProfilePage`, `renderNotificationsPage`, `buildOperationalAlerts` | Conta ativa, risco e histórico; sem autenticação |
| Configuração/storage | `renderSetup`, `saveConfig`, `save`, `load` | Globals, normalização, localStorage |
| Idiomas/cotação | `TRANSLATIONS`, `applyLanguage`, `fetchCotacao` | DOM, storage, AwesomeAPI; cotação também duplicada no legado |

## Fronteiras de integração que devem permanecer compatíveis

- `index.html`: estrutura e chamadas inline dos símbolos públicos.
- `app.js`: ordem de bootstrap, globals de apresentação e estado ainda legado.
- CSS base/shell/preferências, superfícies/cabeçalhos, ações, `styles.css` e quatro CSS StudyHub: classes/IDs e ordem da cascata.
- `window.sh_*`: ponte pública para funções privadas do IIFE legado.
- JSON de backup e chaves localStorage: contrato de dados existente.

## Fronteiras físicas extraídas

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/simulation/domain/calculate-simulation-sizing.js` | Cálculo numérico puro; sem DOM, storage ou framework |
| `tests/simulation-sizing.test.cjs` | Caracterização dos valores/defaults e regressões do cálculo |
| `src/modules/data-transfer/infrastructure/serialize-trades-csv.js` | Formato CSV: colunas e escaping; recebe dados explícitos, sem executar IO |
| `tests/trades-csv.test.cjs` | Caracterização do CSV, wrappers/default, consumidor de exportação e ordem de scripts |
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
| `scripts/lib/tag-editor-style-scenarios.cjs` | Cenários reais de tags editáveis/somente leitura e fixture isolada para `.tag-add` |
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
| `scripts/shell-style-check.cjs` | Comparação isolada de páginas, shell, menus, foco, hover e modais |

Esses arquivos existem após os lotes 1–2, 2b, G1 e G2a–G2w; demais responsabilidades continuam no legado. Entrega e
validações: [refactoring-progress.md](refactoring-progress.md). Camadas adicionais serão
criadas apenas quando uma extração real justificar sua existência.
