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
| `scripts/shell-style-check.cjs` | Comparação isolada de páginas, shell, menus, foco, hover e modais |

Esses arquivos existem após os lotes 1–2, 2b, G1, G2a, G2b e G2c; demais responsabilidades continuam no legado. Entrega e
validações: [refactoring-progress.md](refactoring-progress.md). Camadas adicionais serão
criadas apenas quando uma extração real justificar sua existência.
